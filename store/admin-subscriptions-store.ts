import { useSyncExternalStore } from "react";

/*
  Milk subscriptions seen in the Chiranvi Panel (Subscriptions page), until the database is connected.
  Only milk can be subscribed (curd, paneer, ghee and butter are one-time orders): A2 (Gir Cow), Jersey and
  Skimmed milk, the milks the website sells.
  The first time, 1,177 sample subscriptions are made; after that the list is saved in this browser,
  so pausing, resuming, cancelling and new plans stay after a refresh. Subscriptions are
  paid by plan length. A plan bought on the website is added here too (with its website order number), and
  a pause the panel approves for it shows it as Paused on those days.
*/

export type MilkType = "A2" | "Jersey" | "Skimmed";
export const MILK_TYPES: MilkType[] = ["A2", "Jersey", "Skimmed"];
// How each milk is named on the panel ("A2 Milk 1 L")
export const MILK_TYPE_NAMES: Record<MilkType, string> = { A2: "A2 (Gir Cow)", Jersey: "Jersey", Skimmed: "Skimmed" };
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
  // Bought on the website: its order number and the customer's mobile number
  websiteOrderId?: string;
  customerMobile?: string;
  // A pause approved in the panel (Pause requests): paused from this day until the resume day
  pauseFrom?: string; // ISO date
  resumeOn?: string; // ISO date
};

// Plans saved before the length was added get one from their number
export function getPlanLength(subscription: AdminSubscription): PlanLength {
  return subscription.planLength ?? PLAN_LENGTHS[Number(subscription.id.replace(/\D/g, "")) % 3];
}

// Paused by the panel, or inside an approved pause (from its first day until the resume day)
export function getSubscriptionStatus(subscription: AdminSubscription, today = new Date()): SubscriptionStatus {
  if (subscription.isPaused) return "Paused";
  if (subscription.pauseFrom && subscription.resumeOn) {
    const now = today.getTime();
    if (now >= new Date(subscription.pauseFrom).getTime() && now < new Date(subscription.resumeOn).getTime()) return "Paused";
  }
  return "Active";
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
  { milkType: "Jersey", quantity: "1 L", litresPerDelivery: 1, container: "Glass bottle", frequency: "Daily" },
  { milkType: "Jersey", quantity: "500 ml", litresPerDelivery: 0.5, container: "Glass bottle", frequency: "Daily" },
  { milkType: "A2", quantity: "1 L", litresPerDelivery: 1, container: "Glass bottle", frequency: "Daily" },
  { milkType: "Jersey", quantity: "2 L", litresPerDelivery: 2, container: "2 × 1 L glass bottle", frequency: "Daily" },
  { milkType: "Skimmed", quantity: "1 L", litresPerDelivery: 1, container: "Glass bottle", frequency: "Daily" },
  { milkType: "Jersey", quantity: "1 L", litresPerDelivery: 1, container: "Glass bottle", frequency: "Alternate days" },
  { milkType: "A2", quantity: "1 L", litresPerDelivery: 1, container: "Glass bottle", frequency: "Daily" },
];

// Plans saved with the old milk names: Cow is now Jersey, Buffalo is now Skimmed
const OLD_MILK_TYPES: Record<string, MilkType> = { Cow: "Jersey", Buffalo: "Skimmed" };
function withCurrentMilkType(subscription: AdminSubscription): AdminSubscription {
  const renamed = OLD_MILK_TYPES[subscription.milkType as string];
  return renamed ? { ...subscription, milkType: renamed } : subscription;
}

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
    subscriptions = Array.isArray(saved) ? (saved as AdminSubscription[]).map(withCurrentMilkType) : makeSampleSubscriptions();
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

// A plan bought on the website: its pause dates once the panel approves a pause (Pause requests)
export function setWebsitePlanPause(websiteOrderId: string, pause: { pauseFrom: string; resumeOn: string } | null) {
  save(
    getSubscriptions().map((subscription) =>
      subscription.websiteOrderId === websiteOrderId
        ? { ...subscription, pauseFrom: pause?.pauseFrom, resumeOn: pause?.resumeOn }
        : subscription,
    ),
  );
}

// The panel's copy of a plan bought on the website (its area, for a pause request)
export function findWebsiteSubscription(websiteOrderId: string) {
  return getSubscriptions().find((subscription) => subscription.websiteOrderId === websiteOrderId) ?? null;
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

// Also follows changes made in other tabs and browsers (shared data), so a new website plan shows at once
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  function followOtherTabs(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    subscriptions = null;
    onChange();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

export function useAdminSubscriptions() {
  return useSyncExternalStore(subscribe, getSubscriptions, () => EMPTY);
}
