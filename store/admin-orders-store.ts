import { useMemo, useSyncExternalStore } from "react";
import { setCustomerOrderStatus, type OrderStatus } from "./orders-store";
import { customerIdForMobile } from "./admin-customers-store";

/*
  Orders seen in the Chiranvi Panel (Orders page, and "Recent orders" on the dashboard), until real
  orders come from the database (Supabase).
  The first time, 412 sample orders from the last seven days are made (newest first, like the design);
  after that the list is saved in this browser, so status changes and new orders stay after a refresh.
  Orders customers pay for on the website are added here too (addWebsiteOrder), with their Customer ID,
  items, promised delivery and payment method; moving one along (Packed, Out for delivery, Delivered)
  also moves the customer's own order, so their Orders page tracks it.
  Later this is an "orders" table (with "order_items") in Supabase, with the same fields.
*/

// The order's steps: Pending (placed, waiting) -> Packed -> Out for delivery -> Delivered (or Cancelled)
export type AdminOrderStatus = "Pending" | "Packed" | "Out for delivery" | "Delivered" | "Cancelled";
export const ADMIN_ORDER_STATUSES: AdminOrderStatus[] = ["Pending", "Packed", "Out for delivery", "Delivered", "Cancelled"];
// Still to be delivered
export const OPEN_ORDER_STATUSES: AdminOrderStatus[] = ["Pending", "Packed", "Out for delivery"];

// How customers pay on the website (no cash on delivery); "Cash" is only for orders taken in the panel
export type OrderPaymentMethod = "UPI" | "Net banking" | "Card";

/*
  One product in an order. productId: the pack's Product ID (the product's page address + the pack, e.g.
  "a2-desi-ghee-1-litre"), the same ID the products and the cart use, for the database's order_items.
*/
export type AdminOrderItem = { productId?: string; name: string; packSize: string; quantity: number; price: number; imageSource?: string };

export type AdminOrder = {
  orderNumber: string; // #CF-2041
  placedAt: string; // ISO date and time
  customerName: string;
  area: string;
  items: string; // "Milk 1 L × 2, Paneer 200 g"
  amount: number;
  payment: OrderPaymentMethod | "Cash";
  slot: string; // 6–7 AM
  status: AdminOrderStatus;
  // Orders paid for on the website
  websiteOrderId?: string; // CF-48213, the customer's own order (its status follows this one)
  customerId?: string; // CUS-6384
  customerMobile?: string; // 10 digits, their login number
  itemList?: AdminOrderItem[];
  deliverTo?: string; // "Name · address line"
  deliveryMobile?: string; // 10 digits, the delivery address's number (when it is not the login number)
  promisedAt?: string; // ISO: when Chiranvi promised to deliver it (next day by 7 AM)
  statusChangedAt?: Partial<Record<AdminOrderStatus, string>>; // ISO time each step was reached
};

const TO_CUSTOMER_STATUS: Record<AdminOrderStatus, OrderStatus> = {
  Pending: "placed",
  Packed: "packed",
  "Out for delivery": "out-for-delivery",
  Delivered: "delivered",
  Cancelled: "cancelled",
};

const STORAGE_KEY = "chiranvi-admin-orders";
// When the Orders page was last opened (website orders placed after it are "new": sidebar badge and bell)
const SEEN_STORAGE_KEY = "chiranvi-admin-orders-seen-at";

const sampleCustomers: [string, string][] = [
  ["Priya Sharma", "RR Nagar"],
  ["Ravi Kumar", "Jayanagar"],
  ["Anitha R", "Basavanagudi"],
  ["Suresh Gowda", "Kengeri"],
  ["Meena Iyer", "Uttarahalli"],
  ["Karthik N", "Vijayanagar"],
  ["Divya Rao", "Banashankari"],
  ["Harish Patil", "JP Nagar"],
  ["Lakshmi Devi", "RR Nagar"],
  ["Arjun Shetty", "Jayanagar"],
  ["Kavya M", "Basavanagudi"],
  ["Naveen Reddy", "Kengeri"],
  ["Sneha Kulkarni", "Uttarahalli"],
  ["Mahesh B", "Vijayanagar"],
  ["Deepa S", "Banashankari"],
  ["Rahul Jain", "JP Nagar"],
];

const sampleItems: [string, number][] = [
  ["Milk 1 L × 2", 136],
  ["Milk 1 L", 113],
  ["Ghee 500 ml", 420],
  ["Paneer 200 g", 95],
  ["Milk 500 ml × 2", 72],
  ["Butter 100 g", 143],
  ["A2 Milk 1 L", 96],
  ["Buttermilk × 3", 75],
  ["Milk 1 L, Paneer 200 g", 163],
];

const samplePayments: AdminOrder["payment"][] = ["UPI", "UPI", "Cash", "Card", "UPI", "Cash"];
const sampleSlots = ["6–7 AM", "7–8 AM", "5–6 AM"];

function makeSampleOrders(): AdminOrder[] {
  const now = new Date();
  const orders: AdminOrder[] = [];
  for (let index = 0; index < 412; index++) {
    // About 59 orders a day, newest first, between 6:00 and 8:30 in the morning
    const daysAgo = Math.floor(index / 59);
    const placedAt = new Date(now);
    placedAt.setDate(now.getDate() - daysAgo);
    placedAt.setHours(8, 30 - ((index % 59) * 150) / 59, 0, 0);
    const [customerName, area] = sampleCustomers[index % sampleCustomers.length];
    const [items, amount] = sampleItems[(index * 7) % sampleItems.length];
    let status: AdminOrderStatus = "Delivered";
    if (index % 59 === 33) status = "Cancelled";
    else if (index < 37) status = index % 3 === 0 ? "Out for delivery" : "Pending";
    orders.push({
      orderNumber: `#CF-${2041 - index}`,
      placedAt: placedAt.toISOString(),
      customerName,
      area,
      items,
      amount,
      payment: samplePayments[index % samplePayments.length],
      slot: sampleSlots[index % sampleSlots.length],
      status,
    });
  }
  return orders;
}

let adminOrders: AdminOrder[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: AdminOrder[] = [];

function getOrders() {
  if (adminOrders) return adminOrders;
  if (typeof window === "undefined") return EMPTY;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    // Orders saved before the wallet was removed show UPI instead
    adminOrders = Array.isArray(saved)
      ? saved.map((order: Omit<AdminOrder, "payment"> & { payment: string }) => ({
          ...order,
          payment: (order.payment === "Wallet" ? "UPI" : order.payment) as AdminOrder["payment"],
          // A website order's Customer ID comes from the customer's mobile number (older ones were numbered)
          customerId: order.customerMobile ? customerIdForMobile(order.customerMobile) : order.customerId,
        }))
      : makeSampleOrders();
  } catch {
    adminOrders = makeSampleOrders();
  }
  return adminOrders as AdminOrder[];
}

function saveOrders(newOrders: AdminOrder[]) {
  adminOrders = newOrders;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

// Moving an order along; a website order's customer sees the same step on their Orders page
export function changeAdminOrderStatus(orderNumber: string, status: AdminOrderStatus) {
  const now = new Date().toISOString();
  let websiteOrderId: string | undefined;
  saveOrders(
    getOrders().map((order) => {
      if (order.orderNumber !== orderNumber) return order;
      websiteOrderId = order.websiteOrderId;
      return { ...order, status, statusChangedAt: { ...order.statusChangedAt, [status]: now } };
    }),
  );
  if (websiteOrderId) setCustomerOrderStatus(websiteOrderId, TO_CUSTOMER_STATUS[status]);
}

/*
  A customer paid for an order on the website: it joins the panel's orders (Pending) under the same order
  ID, with their Customer ID, items, address, promised delivery and payment method.
*/
export function addWebsiteOrder(order: {
  websiteOrderId: string;
  placedAt: number;
  customerId?: string;
  customerMobile: string;
  customerName: string;
  area: string;
  itemList: AdminOrderItem[];
  amount: number;
  payment: OrderPaymentMethod;
  deliverTo: string;
  deliveryMobile?: string;
  promisedAt: number;
}) {
  const placedAt = new Date(order.placedAt).toISOString();
  const newOrder: AdminOrder = {
    orderNumber: `#${order.websiteOrderId}`,
    placedAt,
    customerName: order.customerName,
    area: order.area,
    items: order.itemList.map((item) => `${item.name} ${item.packSize}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`).join(", "),
    amount: order.amount,
    payment: order.payment,
    slot: "By 7 AM",
    status: "Pending",
    websiteOrderId: order.websiteOrderId,
    customerId: order.customerId,
    customerMobile: order.customerMobile,
    itemList: order.itemList,
    deliverTo: order.deliverTo,
    // Only kept when it differs from the login number (an order for someone else)
    deliveryMobile: order.deliveryMobile && order.deliveryMobile !== order.customerMobile ? order.deliveryMobile : undefined,
    promisedAt: new Date(order.promisedAt).toISOString(),
    statusChangedAt: { Pending: placedAt },
  };
  saveOrders([newOrder, ...getOrders()]);
  return newOrder;
}

// A new order goes to the top, numbered after the newest one (website orders keep their own IDs)
export function addAdminOrder(order: Omit<AdminOrder, "orderNumber" | "placedAt" | "status">) {
  const orders = getOrders();
  const highestNumber = Math.max(
    0,
    ...orders.filter((existing) => !existing.websiteOrderId).map((existing) => Number(existing.orderNumber.replace(/\D/g, ""))),
  );
  const newOrder: AdminOrder = {
    ...order,
    orderNumber: `#CF-${highestNumber + 1}`,
    placedAt: new Date().toISOString(),
    status: "Pending",
  };
  saveOrders([newOrder, ...orders]);
  return newOrder;
}

let seenAt: string | null = null;

function getSeenAt() {
  if (seenAt !== null) return seenAt;
  if (typeof window === "undefined") return "";
  try {
    seenAt = window.localStorage.getItem(SEEN_STORAGE_KEY) ?? "";
  } catch {
    seenAt = "";
  }
  return seenAt;
}

// The Orders page was opened: the new orders are now seen (the badge and the bell's list clear)
export function markOrdersSeen() {
  seenAt = new Date().toISOString();
  try {
    window.localStorage.setItem(SEEN_STORAGE_KEY, seenAt);
  } catch {
    // Storage blocked: seen until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // A customer's order placed in another tab (the website open next to the panel)
  function followOtherTabs(event: StorageEvent) {
    if (event.key === STORAGE_KEY) adminOrders = null;
    else if (event.key === SEEN_STORAGE_KEY) seenAt = null;
    else return;
    onChange();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

export function useAdminOrders() {
  return useSyncExternalStore(subscribe, getOrders, () => EMPTY);
}

// Website orders placed since the Orders page was last opened, newest first (sidebar badge and bell);
// orders added in the panel itself are not counted
export function useNewOrders() {
  const allOrders = useAdminOrders();
  const lastSeen = useSyncExternalStore(subscribe, getSeenAt, () => "");
  return useMemo(
    () => allOrders.filter((order) => order.websiteOrderId && order.placedAt > lastSeen),
    [allOrders, lastSeen],
  );
}
