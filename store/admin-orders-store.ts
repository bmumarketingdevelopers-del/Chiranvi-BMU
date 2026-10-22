import { useSyncExternalStore } from "react";

/*
  Orders seen in the Chiranvi Panel (Orders page, and "Recent orders" on the dashboard), until real
  orders come from the database (Supabase).
  The first time, 412 sample orders from the last seven days are made (newest first, like the design);
  after that the list is saved in this browser, so status changes and new orders stay after a refresh.
*/

export type AdminOrderStatus = "Pending" | "Out for delivery" | "Delivered" | "Cancelled";
export const ADMIN_ORDER_STATUSES: AdminOrderStatus[] = ["Pending", "Out for delivery", "Delivered", "Cancelled"];

export type AdminOrder = {
  orderNumber: string; // #CF-2041
  placedAt: string; // ISO date and time
  customerName: string;
  area: string;
  items: string;
  amount: number;
  payment: "UPI" | "Cash" | "Card";
  slot: string; // 6–7 AM
  status: AdminOrderStatus;
};

const STORAGE_KEY = "chiranvi-admin-orders";

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

export function changeAdminOrderStatus(orderNumber: string, status: AdminOrderStatus) {
  saveOrders(getOrders().map((order) => (order.orderNumber === orderNumber ? { ...order, status } : order)));
}

// A new order goes to the top, numbered after the newest one
export function addAdminOrder(order: Omit<AdminOrder, "orderNumber" | "placedAt" | "status">) {
  const orders = getOrders();
  const highestNumber = Math.max(0, ...orders.map((existing) => Number(existing.orderNumber.replace(/\D/g, ""))));
  const newOrder: AdminOrder = {
    ...order,
    orderNumber: `#CF-${highestNumber + 1}`,
    placedAt: new Date().toISOString(),
    status: "Pending",
  };
  saveOrders([newOrder, ...orders]);
  return newOrder;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useAdminOrders() {
  return useSyncExternalStore(subscribe, getOrders, () => EMPTY);
}
