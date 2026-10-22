import { useSyncExternalStore } from "react";

/*
  Payments seen in the Chiranvi Panel (Payments page), until the database and the payment gateway are
  connected. No wallet: money comes in for orders and subscription plans, and goes out as refunds.
  The first time, 600 sample payments from the last seven days are made (newest first); after that
  the list is saved in this browser, so retries, refunds and recorded payments stay after a refresh.
*/

export type PaymentType = "Order" | "Subscription" | "Refund";
export type PaymentMethod = "UPI" | "Card" | "Cash";
export type PaymentStatus = "Success" | "Failed";

export type AdminPayment = {
  id: string; // TXN88214
  paidAt: string; // ISO date and time
  customerName: string;
  area: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number; // money in is positive, refunds are negative
  status: PaymentStatus;
};

export const PAYMENT_METHODS: PaymentMethod[] = ["UPI", "Card", "Cash"];

const STORAGE_KEY = "chiranvi-admin-payments";

const sampleCustomers: [string, string][] = [
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
];

const sampleKinds: [PaymentType, PaymentMethod, number][] = [
  ["Subscription", "UPI", 2040],
  ["Order", "UPI", 136],
  ["Subscription", "Card", 4080],
  ["Refund", "UPI", -45],
  ["Order", "Cash", 113],
  ["Subscription", "UPI", 1020],
  ["Order", "Card", 420],
  ["Order", "UPI", 163],
  ["Refund", "Card", -68],
  ["Order", "UPI", 95],
  ["Subscription", "UPI", 2040],
  ["Order", "Cash", 72],
];

function makeSamplePayments(): AdminPayment[] {
  const payments: AdminPayment[] = [];
  const now = new Date();
  for (let index = 0; index < 600; index++) {
    const paidAt = new Date(now);
    paidAt.setDate(now.getDate() - Math.floor(index / 86));
    paidAt.setHours(10, -((index % 86) * 6), 0, 0);
    const [customerName, area] = sampleCustomers[index % sampleCustomers.length];
    const [type, method, amount] = sampleKinds[index % sampleKinds.length];
    payments.push({
      id: `TXN${88214 - index * 17}`,
      paidAt: paidAt.toISOString(),
      customerName,
      area,
      type,
      method,
      amount,
      // A few failed payments to recover (4 in the last two days)
      status: index === 2 || index === 9 || index === 61 || index === 140 ? "Failed" : "Success",
    });
  }
  return payments;
}

let payments: AdminPayment[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: AdminPayment[] = [];

function getPayments() {
  if (payments) return payments;
  if (typeof window === "undefined") return EMPTY;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    payments = Array.isArray(saved) ? saved : makeSamplePayments();
  } catch {
    payments = makeSamplePayments();
  }
  return payments as AdminPayment[];
}

function save(newPayments: AdminPayment[]) {
  payments = newPayments;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newPayments));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

function nextId() {
  const highest = Math.max(0, ...getPayments().map((payment) => Number(payment.id.replace(/\D/g, ""))));
  return `TXN${highest + 1}`;
}

// Failed payment collected on a second try
export function retryPayment(id: string) {
  save(getPayments().map((payment) => (payment.id === id ? { ...payment, status: "Success" } : payment)));
}

// Gives the money back: a new refund line for the same customer
export function refundPayment(id: string) {
  const original = getPayments().find((payment) => payment.id === id);
  if (!original) return;
  const refund: AdminPayment = {
    ...original,
    id: nextId(),
    paidAt: new Date().toISOString(),
    type: "Refund",
    amount: -Math.abs(original.amount),
    status: "Success",
  };
  save([refund, ...getPayments()]);
}

// Money received by hand (cash at the door, bank transfer...)
export function recordPayment(payment: Pick<AdminPayment, "customerName" | "area" | "type" | "method" | "amount">) {
  const newPayment: AdminPayment = { ...payment, id: nextId(), paidAt: new Date().toISOString(), status: "Success" };
  save([newPayment, ...getPayments()]);
  return newPayment;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useAdminPayments() {
  return useSyncExternalStore(subscribe, getPayments, () => EMPTY);
}
