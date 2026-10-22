import { useSyncExternalStore } from "react";

/*
  Customers seen in the Chiranvi Panel (Customers page), until the database is connected.
  The first time, 1,384 sample customers are made; after that the list is saved in this browser, so
  new customers and changes stay after a refresh. (No wallet: Chiranvi does not use one.)
*/

export type CustomerStatus = "Active" | "Paused" | "Inactive";

export type AdminCustomer = {
  id: string;
  name: string;
  area: string;
  phone: string; // 98450 10 300
  plan: string; // Cow Milk 1 L, or "One-time orders"
  lifetimeValue: number;
  orderCount: number;
  lastOrderDaysAgo: number;
  isPaused: boolean;
  joinedDaysAgo: number;
};

// No order for more than 30 days: inactive
export const INACTIVE_AFTER_DAYS = 30;

export function getCustomerStatus(customer: AdminCustomer): CustomerStatus {
  if (customer.lastOrderDaysAgo > INACTIVE_AFTER_DAYS) return "Inactive";
  return customer.isPaused ? "Paused" : "Active";
}

const STORAGE_KEY = "chiranvi-admin-customers";

const sampleNames: [string, string][] = [
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
];
const samplePlans = ["Cow Milk 1 L", "Cow Milk 500 ml", "A2 Milk 1 L", "Cow Milk 2 L", "Buffalo Milk 1 L", "Cow Milk 1 L", "One-time orders"];
const sampleValues = [18400, 9260, 32100, 4100, 12750, 7600, 2300];
const sampleLastOrder = [0, 0, 1, 5, 0, 0, 1, 5, 0, 0, 1, 0, 0, 0, 2, 40, 0, 3];

function makeSampleCustomers(): AdminCustomer[] {
  const customers: AdminCustomer[] = [];
  for (let index = 0; index < 1384; index++) {
    const [name, area] = sampleNames[index % sampleNames.length];
    customers.push({
      id: `CUS-${5000 + index}`,
      name,
      area,
      phone: `98450 ${String(10 + ((index * 7) % 90)).padStart(2, "0")} ${String(300 + ((index * 41) % 700)).padStart(3, "0")}`,
      plan: samplePlans[index % samplePlans.length],
      lifetimeValue: sampleValues[index % sampleValues.length],
      orderCount: 6 + ((index * 13) % 180),
      lastOrderDaysAgo: sampleLastOrder[index % sampleLastOrder.length],
      isPaused: index % 29 === 5,
      joinedDaysAgo: index < 64 ? index % 28 : 30 + ((index * 3) % 600),
    });
  }
  return customers;
}

let customers: AdminCustomer[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: AdminCustomer[] = [];

function getCustomers() {
  if (customers) return customers;
  if (typeof window === "undefined") return EMPTY;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    customers = Array.isArray(saved) ? saved : makeSampleCustomers();
  } catch {
    customers = makeSampleCustomers();
  }
  return customers as AdminCustomer[];
}

function save(newCustomers: AdminCustomer[]) {
  customers = newCustomers;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newCustomers));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

export function addCustomer(customer: Pick<AdminCustomer, "name" | "area" | "phone" | "plan">) {
  const highest = Math.max(0, ...getCustomers().map((existing) => Number(existing.id.replace(/\D/g, ""))));
  const newCustomer: AdminCustomer = {
    ...customer,
    id: `CUS-${highest + 1}`,
    lifetimeValue: 0,
    orderCount: 0,
    lastOrderDaysAgo: 0,
    isPaused: false,
    joinedDaysAgo: 0,
  };
  save([newCustomer, ...getCustomers()]);
  return newCustomer;
}

export function setCustomerPaused(id: string, isPaused: boolean) {
  save(getCustomers().map((customer) => (customer.id === id ? { ...customer, isPaused } : customer)));
}

export function removeCustomer(id: string) {
  save(getCustomers().filter((customer) => customer.id !== id));
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useAdminCustomers() {
  return useSyncExternalStore(subscribe, getCustomers, () => EMPTY);
}
