import { useSyncExternalStore } from "react";
import type { CartItem } from "./cart-store";

/*
  The customer's orders, until a real order service exists.
  "Place order" on the cart page (checkout) places an order from the cart (Razorpay is not connected
  yet, so nothing is charged). Saved in this browser (localStorage), like the cart and the login, so
  "Track your order" still finds it after a refresh; Logout starts again with no orders.

  Order steps, in order: placed -> packed -> out-for-delivery -> delivered (or cancelled).
  A new order starts at "placed".
*/

export type OrderStatus = "placed" | "packed" | "out-for-delivery" | "delivered" | "cancelled";

export type Order = {
  orderId: string;
  placedAt: number; // time in milliseconds
  items: CartItem[];
  total: number; // what the customer pays (after discounts, coupon and delivery fee)
  status: OrderStatus;
  // From the checkout (orders placed before these were added have none)
  couponCode?: string;
  couponDiscount?: number;
  deliveryFee?: number;
  deliverTo?: string; // "Priya Raman · 12, 4th Cross, Jayanagar 4th Block, Bengaluru 560011"
  subscription?: OrderSubscription; // only on a milk subscription order
};

// The plan bought with a subscription order (shown on My Subscription)
export type OrderSubscription = {
  planName: string; // "6 Months"
  months: number;
  days: number;
  bottlesPerDay: number;
  pricePerLitre: number;
  bottleCount: number;
  extendsOrderId?: string; // set when this order adds days to an earlier plan instead of starting one
};

// What the checkout adds to an order
export type CheckoutDetails = {
  total: number;
  couponCode?: string;
  couponDiscount?: number;
  deliveryFee: number;
  deliverTo: string;
  subscription?: OrderSubscription;
};

const ORDERS_STORAGE_KEY = "chiranvi-orders";
const noOrders: Order[] = [];
let orders: Order[] = noOrders;
let hasReadSavedOrders = false;
const ordersListeners = new Set<() => void>();

function getOrders() {
  if (!hasReadSavedOrders && typeof window !== "undefined") {
    hasReadSavedOrders = true;
    try {
      const saved = JSON.parse(window.localStorage.getItem(ORDERS_STORAGE_KEY) ?? "null");
      if (Array.isArray(saved)) orders = saved;
    } catch {
      // Nothing saved, or storage blocked: no orders yet.
    }
  }
  return orders;
}

function saveOrders(newOrders: Order[]) {
  orders = newOrders;
  hasReadSavedOrders = true;
  try {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(newOrders));
  } catch {
    // Storage blocked: orders last until the page is refreshed.
  }
  ordersListeners.forEach((onChange) => onChange());
}

function subscribeToOrders(onChange: () => void) {
  ordersListeners.add(onChange);
  return () => {
    ordersListeners.delete(onChange);
  };
}

// Orders, newest first. On the server there are none.
export function useOrders() {
  return useSyncExternalStore(
    subscribeToOrders,
    getOrders,
    () => noOrders,
  );
}

// Orders still on their way (shown as the badge next to "Orders" in the dashboard sidebar).
export function countActiveOrders(orderList: Order[]) {
  return orderList.filter((order) => order.status !== "delivered" && order.status !== "cancelled").length;
}

// "Place order": turns the cart into a new order (with the checkout's total, coupon and address).
export function placeOrder(cartItems: CartItem[], checkout: CheckoutDetails) {
  const newOrder: Order = {
    orderId: `CF-${Math.floor(10000 + Math.random() * 90000)}`,
    placedAt: Date.now(),
    items: cartItems,
    status: "placed",
    ...checkout,
  };
  saveOrders([newOrder, ...getOrders()]);
  return newOrder;
}

/*
  A milk plan that is still running: the order that started it, plus every extension added to it.
  It starts the day after it was paid and runs for all its days (the extensions' days added on).
*/
export type RunningPlan = {
  orderId: string; // the order that started the plan (extensions point to it)
  planName: string;
  months: number; // the plan's own length ("Extend Plan" adds the same again)
  days: number;
  bottlesPerDay: number;
  pricePerLitre: number;
  deliverTo: string;
  product: CartItem; // the milk as bought (price = the plan's price per litre, originalPrice = one-time price)
  endsOn: Date; // the last delivery day
};

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

// Plans whose last delivery day is today or later; the first one bought comes first
export function findRunningPlans(orderList: Order[], today = new Date()) {
  const plansByOrderId = new Map<string, RunningPlan>();
  // Oldest first, so an extension always comes after the plan it extends
  for (const order of [...orderList].reverse()) {
    const subscription = order.subscription;
    if (!subscription || order.status === "cancelled") continue;
    const extendedPlan = subscription.extendsOrderId ? plansByOrderId.get(subscription.extendsOrderId) : undefined;
    if (extendedPlan) {
      extendedPlan.endsOn = new Date(extendedPlan.endsOn.getTime() + subscription.days * DAY_IN_MILLISECONDS);
      continue;
    }
    const firstDay = new Date(order.placedAt);
    firstDay.setHours(0, 0, 0, 0);
    firstDay.setDate(firstDay.getDate() + 1);
    plansByOrderId.set(order.orderId, {
      orderId: order.orderId,
      planName: subscription.planName,
      months: subscription.months,
      days: subscription.days,
      bottlesPerDay: subscription.bottlesPerDay,
      pricePerLitre: subscription.pricePerLitre,
      deliverTo: order.deliverTo ?? "",
      product: order.items[0],
      endsOn: new Date(firstDay.getTime() + (subscription.days - 1) * DAY_IN_MILLISECONDS),
    });
  }
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  return [...plansByOrderId.values()].filter((plan) => plan.endsOn >= startOfToday);
}

// "21 Jan 2027"
export function formatPlanDate(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Logout: the next visitor starts with no orders.
export function forgetAllOrders() {
  saveOrders(noOrders);
}
