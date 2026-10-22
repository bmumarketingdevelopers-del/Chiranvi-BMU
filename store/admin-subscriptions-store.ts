import { useSyncExternalStore } from "react";

/*
  Milk subscriptions seen in the Chiranvi Panel (Subscriptions page), until the database is connected.
  Only milk can be subscribed (curd, paneer, ghee and butter are one-time orders).
  The first time, 1,177 sample subscriptions are made; after that the list is saved in this browser,
  so pausing, resuming, cancelling and new plans stay after a refresh. Subscriptions are
  paid by plan length.
*/

export type MilkType = "Cow" | "A2" | "Buffalo";
export type MilkFrequency = "Daily" | "Alternate days";
export type SubscriptionStatus = "Active" | "Paused";
export type PlanLength = "3 months" | "6 months" | "1 year";
export const PLAN_LENGTHS: PlanLength[] = ["3 months", "6 months", "1 year"];

export type AdminSubscription = {
  id: string;
  customerName: string;
  area: string;
  milkType: MilkType;
  quantity: string; // "1 L", "500 ml", "2 L"
  litresPerDelivery: number;
  container: string; // "Pouch", "Glass bottle", "Family · 2 × 1 L pouch"
  frequency: MilkFrequency;
  // How long the customer subscribed for
  planLength?: PlanLength;
  since: string; // ISO date
  isPaused: boolean;
};

// Plans saved before the length was added get one from their number
export function getPlanLength(subscription: AdminSubscription): PlanLength {
  return subscription.planLength ?? PLAN_LENGTHS[Number(subscription.id.replace(/D/g, "")) % 3];
}

export function getSubscriptionStatus(subscription: AdminSubscription): SubscriptionStatus {
  return subscription.isPaused ? "Paused" : "Active";
}

const STORAGE_KEY = "chiranvi-admin-subscriptions";
const CANCELLED_KEY = "chiranvi-admin-subscriptions-cancelled";

const sampleCustomers: [string, string][] = [
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
  ["Shalini K", "RR Nagar"],
];

const samplePlans: Omit<AdminSubscription, "id" | "customerName" | "area" | "since" | "isPaused">[] = [
  { milkType: "Cow", quantity: "1 L", litresPerDelivery: 1, container: "Pouch", frequency: "Daily" },
  { milkType: "Cow", quantity: "500 ml", litresPerDelivery: 0.5, container: "Pouch", frequency: "Daily" },
  { milkType: "A2", quantity: "1 L", litresPerDelivery: 1, container: "Glass bottle", frequency: "Daily" },
  { milkType: "Cow", quantity: "2 L", litresPerDelivery: 2, container: "Family · 2 × 1 L pouch", frequency: "Daily" },
  { milkType: "Buffalo", quantity: "1 L", litresPerDelivery: 1, container: "Pouch", frequency: "Daily" },
  { milkType: "Cow", quantity: "1 L", litresPerDelivery: 1, container: "Pouch", frequency: "Alternate days" },
  { milkType: "Cow", quantity: "1 L", litresPerDelivery: 1, container: "Pouch", frequency: "Daily" },
];

function makeSampleSubscriptions(): AdminSubscription[] {
  const subscriptions: AdminSubscription[] = [];
  const now = new Date();
  for (let index = 0; index < 1177; index++) {
    const [customerName, area] = sampleCustomers[index % sampleCustomers.length];
    const since = new Date(now.getFullYear(), now.getMonth() - (index % 20), 1);
    subscriptions.push({
      id: `SUB-${10000 + index}`,
      customerName,
      area,
      ...samplePlans[index % samplePlans.length],
      planLength: PLAN_LENGTHS[index % 3],
      since: since.toISOString(),
      // 48 paused plans spread through the list
      isPaused: index % 24 === 3 && index < 24 * 48,
    });
  }
  return subscriptions;
}

let subscriptions: AdminSubscription[] | null = null;
let cancelledThisWeek = 3;
const listeners = new Set<() => void>();
const EMPTY: AdminSubscription[] = [];

function getSubscriptions() {
  if (subscriptions) return subscriptions;
  if (typeof window === "undefined") return EMPTY;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    subscriptions = Array.isArray(saved) ? saved : makeSampleSubscriptions();
    cancelledThisWeek = Number(window.localStorage.getItem(CANCELLED_KEY) ?? 3) || 3;
  } catch {
    subscriptions = makeSampleSubscriptions();
  }
  return subscriptions as AdminSubscription[];
}

function save(newSubscriptions: AdminSubscription[]) {
  subscriptions = newSubscriptions;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newSubscriptions));
    window.localStorage.setItem(CANCELLED_KEY, String(cancelledThisWeek));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

export function setSubscriptionPaused(id: string, isPaused: boolean) {
  save(getSubscriptions().map((subscription) => (subscription.id === id ? { ...subscription, isPaused } : subscription)));
}

export function cancelSubscription(id: string) {
  cancelledThisWeek += 1;
  save(getSubscriptions().filter((subscription) => subscription.id !== id));
}

export function addSubscription(subscription: Omit<AdminSubscription, "id" | "since" | "isPaused">) {
  const highest = Math.max(0, ...getSubscriptions().map((existing) => Number(existing.id.replace(/\D/g, ""))));
  const newSubscription: AdminSubscription = {
    ...subscription,
    id: `SUB-${highest + 1}`,
    since: new Date().toISOString(),
    isPaused: false,
  };
  save([newSubscription, ...getSubscriptions()]);
  return newSubscription;
}

export function getCancelledThisWeek() {
  getSubscriptions();
  return cancelledThisWeek;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useAdminSubscriptions() {
  return useSyncExternalStore(subscribe, getSubscriptions, () => EMPTY);
}
