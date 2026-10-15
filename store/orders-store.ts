import { useSyncExternalStore } from "react";
import type { CartItem } from "./cart-store";

/*
  The customer's orders, until a real order service exists.
  "Pay now" on the cart page places an order from the cart (payments are not built yet, so nothing
  is charged). Kept only in the open page's memory, like the cart and the login: a refresh or
  Logout starts again with no orders.

  Order steps, in order: placed -> packed -> out-for-delivery -> delivered (or cancelled).
  A new order starts at "placed".
*/

export type OrderStatus = "placed" | "packed" | "out-for-delivery" | "delivered" | "cancelled";

export type Order = {
  orderId: string;
  placedAt: number; // time in milliseconds
  items: CartItem[];
  total: number;
  status: OrderStatus;
};

const noOrders: Order[] = [];
let orders: Order[] = noOrders;
const ordersListeners = new Set<() => void>();

function saveOrders(newOrders: Order[]) {
  orders = newOrders;
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
    () => orders,
    () => noOrders,
  );
}

// Orders still on their way (shown as the badge next to "Orders" in the dashboard sidebar).
export function countActiveOrders(orderList: Order[]) {
  return orderList.filter((order) => order.status !== "delivered" && order.status !== "cancelled").length;
}

// "Pay now": turns the cart into a new order and returns it.
export function placeOrder(cartItems: CartItem[]) {
  const newOrder: Order = {
    orderId: `CF-${Math.floor(10000 + Math.random() * 90000)}`,
    placedAt: Date.now(),
    items: cartItems,
    total: cartItems.reduce((total, cartItem) => total + cartItem.price * cartItem.quantity, 0),
    status: "placed",
  };
  saveOrders([newOrder, ...orders]);
  return newOrder;
}

// Logout: the next visitor starts with no orders.
export function forgetAllOrders() {
  saveOrders(noOrders);
}
