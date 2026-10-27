import { useMemo, useSyncExternalStore } from "react";
import type { CustomerProfileDetails } from "./customer-profiles-store";
import { withCurrentMilkPlanName } from "./admin-subscriptions-store";

/*
  Customers seen in the Chiranvi Panel (Customers page), until the database is connected.
  The first time, 1,384 sample customers are made; after that the list is saved in this browser, so
  new customers and changes stay after a refresh. (No wallet: Chiranvi does not use one.)
  Customers who sign up on the website join the list when they save their Profile (with all its
  details); the sidebar badge counts the ones who joined since the Customers page was last opened.
*/

export type CustomerStatus = "New" | "Active" | "Paused" | "Inactive";

export type AdminCustomer = {
  id: string;
  name: string;
  area: string;
  pincode?: string; // added in the panel (website sign-ups: in their profile)
  phone: string; // 98450 10 300
  plan: string; // Jersey Milk 1 L, or "One-time orders"
  lifetimeValue: number;
  orderCount: number;
  lastOrderDaysAgo: number;
  isPaused: boolean;
  joinedDaysAgo: number;
  // Signed up on the website: the details from their Profile page, and when they joined
  profile?: CustomerProfileDetails;
  registeredAt?: string; // ISO
};

// No order for more than 30 days: inactive
export const INACTIVE_AFTER_DAYS = 30;

export function getCustomerStatus(customer: AdminCustomer): CustomerStatus {
  if (customer.orderCount === 0) return "New";
  if (customer.lastOrderDaysAgo > INACTIVE_AFTER_DAYS) return "Inactive";
  return customer.isPaused ? "Paused" : "Active";
}

// What the customer buys: milk subscriptions, one-time orders, or nothing yet
export type CustomerPlanKind = "Subscription" | "One-time" | "No orders yet";
export const NO_ORDERS_PLAN = "No orders yet";

export function getCustomerPlanKind(customer: AdminCustomer): CustomerPlanKind {
  if (customer.orderCount === 0 || customer.plan === NO_ORDERS_PLAN) return "No orders yet";
  return customer.plan === "One-time orders" ? "One-time" : "Subscription";
}

/*
  A website customer's Customer ID, worked out from their login number: the same in every browser and
  never shared by two customers (numbering one after another clashed when two browsers each added one).
  "7766554433" -> "CUS-3KJ2Q9T" (the number written in base 36).
*/
export function customerIdForMobile(mobileNumber: string) {
  const digits = mobileNumber.replace(/\D/g, "").slice(-10);
  return digits ? `CUS-${Number(digits).toString(36).toUpperCase()}` : "";
}

const STORAGE_KEY = "chiranvi-admin-customers";
// When the Customers page was last opened (the badge counts customers who joined after it)
const SEEN_STORAGE_KEY = "chiranvi-admin-customers-seen-at";

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
const samplePlans = ["Jersey Milk 1 L", "Jersey Milk 500 ml", "A2 (Gir Cow) Milk 1 L", "Jersey Milk 2 L", "Skimmed Milk 1 L", "A2 (Gir Cow) Milk 500 ml", "One-time orders"];
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
    // Saved with the old milk names (Cow, Buffalo): shown with today's
    customers = Array.isArray(saved)
      ? withMobileCustomerIds(saved).map((customer) => ({ ...customer, plan: withCurrentMilkPlanName(customer.plan) }))
      : makeSampleCustomers();
  } catch {
    customers = makeSampleCustomers();
  }
  return customers as AdminCustomer[];
}

// Website customers saved with an older, numbered ID (CUS-6384) get the ID from their mobile number
function withMobileCustomerIds(saved: AdminCustomer[]) {
  return saved.map((customer) =>
    customer.profile ? { ...customer, id: customerIdForMobile(customer.profile.primaryMobile || customer.phone) } : customer,
  );
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

export function addCustomer(customer: Pick<AdminCustomer, "name" | "area" | "pincode" | "phone" | "plan">) {
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

/*
  A customer saved their Profile on the website: added the first time ("No orders yet"), updated after
  that (found by their login number). Their Customer ID comes from that number (customerIdForMobile).
  registeredAt: when they first saved (given when an older profile is put back on the list).
*/
export function saveRegisteredCustomer(details: CustomerProfileDetails, registeredAt?: string) {
  const phoneDigits = details.primaryMobile;
  const phone = `${phoneDigits.slice(0, 5)} ${phoneDigits.slice(5, 7)} ${phoneDigits.slice(7)}`;
  const name = `${details.firstName} ${details.lastName}`.trim();
  const id = customerIdForMobile(phoneDigits);
  const allCustomers = getCustomers();
  const existing = allCustomers.find((customer) => customer.phone.replace(/\D/g, "") === phoneDigits);
  if (existing) {
    save(allCustomers.map((customer) => (customer === existing ? { ...customer, id, name, phone, area: details.location, profile: details } : customer)));
    return id;
  }
  const newCustomer: AdminCustomer = {
    id,
    name,
    area: details.location,
    phone,
    plan: NO_ORDERS_PLAN,
    lifetimeValue: 0,
    orderCount: 0,
    lastOrderDaysAgo: 0,
    isPaused: false,
    joinedDaysAgo: 0,
    profile: details,
    registeredAt: registeredAt ?? new Date().toISOString(),
  };
  save([newCustomer, ...allCustomers]);
  return newCustomer.id;
}

// Is this login number on the list? (A customer with a saved profile who is missing is put back.)
export function isCustomerListed(mobileNumber: string) {
  return getCustomers().some((customer) => customer.phone.replace(/\D/g, "") === mobileNumber);
}

/*
  A customer paid for an order on the website: their orders, last order and lifetime value go up, and
  their plan becomes the milk subscription (plan given) or "One-time orders" if they had none yet.
  A customer who has not saved their Profile is not on the list yet, so nothing changes.
*/
export function recordCustomerOrder(mobileNumber: string, order: { amount: number; plan: string | null }) {
  const allCustomers = getCustomers();
  if (!allCustomers.some((customer) => customer.phone.replace(/\D/g, "") === mobileNumber)) return;
  save(
    allCustomers.map((customer) =>
      customer.phone.replace(/\D/g, "") === mobileNumber
        ? {
            ...customer,
            orderCount: customer.orderCount + 1,
            lastOrderDaysAgo: 0,
            lifetimeValue: customer.lifetimeValue + order.amount,
            plan: order.plan ?? (customer.plan === NO_ORDERS_PLAN ? "One-time orders" : customer.plan),
          }
        : customer,
    ),
  );
}

export function setCustomerPaused(id: string, isPaused: boolean) {
  save(getCustomers().map((customer) => (customer.id === id ? { ...customer, isPaused } : customer)));
}

export function removeCustomer(id: string) {
  save(getCustomers().filter((customer) => customer.id !== id));
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

// The Customers page was opened: the badge's new customers are now seen
export function markCustomersSeen() {
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
  // A customer who signed up in another tab (the website open next to the panel)
  function followOtherTabs(event: StorageEvent) {
    if (event.key === STORAGE_KEY) customers = null;
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

export function useAdminCustomers() {
  return useSyncExternalStore(subscribe, getCustomers, () => EMPTY);
}

// Customers who signed up on the website since the Customers page was last opened (sidebar badge and bell)
export function useNewCustomers() {
  const allCustomers = useAdminCustomers();
  const lastSeen = useSyncExternalStore(subscribe, getSeenAt, () => "");
  return useMemo(
    () => allCustomers.filter((customer) => customer.registeredAt && customer.registeredAt > lastSeen),
    [allCustomers, lastSeen],
  );
}

export function useNewCustomerCount() {
  return useNewCustomers().length;
}
