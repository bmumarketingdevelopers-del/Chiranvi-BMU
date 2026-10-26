import { useMemo, useSyncExternalStore } from "react";
// The same orders in every browser (until the database is connected)
import "./shared-data-sync";
import { useLoggedInMobileNumber } from "@/components/login/login-status";
import type { CartItem } from "./cart-store";
import { addWebsiteOrder, type OrderPaymentMethod } from "./admin-orders-store";
import { recordCustomerOrder } from "./admin-customers-store";
import { getCustomerProfile } from "./customer-profiles-store";

/*
  Customers' orders, until a real order service exists.
  "Pay now" on the cart page (checkout) places an order from the cart (Razorpay is not connected yet, so
  nothing is charged; the payment method chosen, UPI / Net banking / Card, is kept). Saved in this
  browser (localStorage) under the customer's login number: each customer sees only their own orders
  on My Orders, and they stay after logging out and in again.
  Each order also goes to the Chiranvi Panel's Orders page (with the Customer ID and the promised
  delivery: the next day by 7 AM), and counts on the customer's record there. When the panel moves an
  order along (Packed, Out for delivery, Delivered), the customer's tracker here follows.

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
  // Who ordered, how they paid, and when it was promised (orders placed before these were added have none)
  customerMobile?: string; // 10 digits, the login number
  customerId?: string; // CUS-6384 (once their profile is saved)
  paymentMethod?: OrderPaymentMethod;
  promisedAt?: number; // time in milliseconds: the next day by 7 AM
  statusChangedAt?: Partial<Record<OrderStatus, number>>; // when each step was reached
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
  bottleLabel?: string; // "500 ml" (missing: "1 L")
  unitName?: string; // what the price is per: "500 ml" (missing: "litre")
};

// What the checkout adds to an order
export type CheckoutDetails = {
  total: number;
  couponCode?: string;
  couponDiscount?: number;
  deliveryFee: number;
  deliverTo: string;
  area?: string; // the delivery address's area (for the panel's Location)
  paymentMethod?: OrderPaymentMethod;
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
  // A step changed in the Chiranvi Panel open in another tab
  function followOtherTabs(event: StorageEvent) {
    if (event.key !== ORDERS_STORAGE_KEY) return;
    hasReadSavedOrders = false;
    onChange();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    ordersListeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

// The logged-in customer's orders, newest first. Logged out, and on the server, there are none.
export function useOrders() {
  const allOrders = useSyncExternalStore(subscribeToOrders, getOrders, () => noOrders);
  const mobileNumber = useLoggedInMobileNumber();
  return useMemo(
    () => (mobileNumber ? allOrders.filter((order) => order.customerMobile === mobileNumber) : noOrders),
    [allOrders, mobileNumber],
  );
}

// The panel moved an order along: the customer's tracker shows the same step
export function setCustomerOrderStatus(orderId: string, status: OrderStatus) {
  const now = Date.now();
  saveOrders(
    getOrders().map((order) =>
      order.orderId === orderId ? { ...order, status, statusChangedAt: { ...order.statusChangedAt, [status]: now } } : order,
    ),
  );
}

// The delivery promised for an order placed at this time: the next day by 7 AM
function promisedDeliveryFor(placedAt: number) {
  const promised = new Date(placedAt);
  promised.setDate(promised.getDate() + 1);
  promised.setHours(7, 0, 0, 0);
  return promised.getTime();
}

// The logged-in number, read from the login saved in this browser
function readLoggedInMobileNumber(): string | null {
  try {
    const savedLogin = JSON.parse(window.localStorage.getItem("chiranvi-login") ?? "null");
    return typeof savedLogin?.mobileNumber === "string" ? savedLogin.mobileNumber : null;
  } catch {
    return null;
  }
}

// Orders still on their way (shown as the badge next to "Orders" in the dashboard sidebar).
export function countActiveOrders(orderList: Order[]) {
  return orderList.filter((order) => order.status !== "delivered" && order.status !== "cancelled").length;
}

/*
  "Pay now": turns the cart into a new order for the logged-in customer (with the checkout's total,
  coupon, address and payment method), sends it to the Chiranvi Panel's Orders page and counts it on
  the customer's record there.
*/
export function placeOrder(cartItems: CartItem[], checkout: CheckoutDetails) {
  const placedAt = Date.now();
  const customerMobile = readLoggedInMobileNumber() ?? "";
  const profile = customerMobile ? getCustomerProfile(customerMobile) : null;
  const { area, ...orderDetails } = checkout;
  const newOrder: Order = {
    orderId: `CF-${Math.floor(10000 + Math.random() * 90000)}`,
    placedAt,
    items: cartItems,
    status: "placed",
    ...orderDetails,
    paymentMethod: checkout.paymentMethod ?? "UPI",
    customerMobile,
    customerId: profile?.customerId,
    promisedAt: promisedDeliveryFor(placedAt),
    statusChangedAt: { placed: placedAt },
  };
  saveOrders([newOrder, ...getOrders()]);

  const customerName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : checkout.deliverTo.split(" · ")[0];
  addWebsiteOrder({
    websiteOrderId: newOrder.orderId,
    placedAt,
    customerId: profile?.customerId,
    customerMobile,
    customerName,
    area: area || profile?.location || "",
    itemList: cartItems.map((item) => ({
      productId: item.productId,
      name: item.name,
      packSize: item.packSize,
      quantity: item.quantity,
      price: item.price,
      imageSource: item.imageSource,
    })),
    amount: checkout.total,
    payment: newOrder.paymentMethod ?? "UPI",
    deliverTo: checkout.deliverTo,
    promisedAt: newOrder.promisedAt ?? promisedDeliveryFor(placedAt),
  });
  if (customerMobile) {
    recordCustomerOrder(customerMobile, {
      amount: checkout.total,
      plan: checkout.subscription ? `${cartItems[0]?.name ?? "Milk"} · ${checkout.subscription.planName}` : null,
    });
  }
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
  bottleLabel: string; // "1 L" or "500 ml"
  unitName: string; // what the price is per: "litre" or "500 ml"
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
      bottleLabel: subscription.bottleLabel ?? "1 L",
      unitName: subscription.unitName ?? "litre",
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

/*
  Logout: nothing to clear any more. Orders belong to the customer who placed them (their login number),
  so the next visitor sees none of them, and the customer finds them again after logging back in.
  (Kept so the account dashboard's Logout keeps working unchanged.)
*/
export function forgetAllOrders() {}
