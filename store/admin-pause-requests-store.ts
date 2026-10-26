import { useSyncExternalStore } from "react";
import { setWebsitePlanPause } from "./admin-subscriptions-store";

/*
  Pause requests seen in the Chiranvi Panel (Pause requests page, and the count on its sidebar
  badge), until the database is connected: customers asking to stop milk for a few days.
  The first time, 56 sample requests are made (5 waiting for approval); after that the list is saved in
  this browser, so approvals and rejections stay after a refresh.
  Customers send real requests from My Subscription ("Pause subscription": from, resume on, reason). The
  customer sees the answer there; an approved one also pauses that plan on the Subscriptions page for
  those days.
*/

export type PauseRequestStatus = "Pending" | "Approved" | "Rejected";

export type PauseRequest = {
  id: string;
  customerName: string;
  area: string;
  plan: string; // Cow Milk 1 L
  frequency: "Daily" | "Alternate days";
  litresPerDay: number;
  pauseFrom: string; // ISO date
  resumeOn: string; // ISO date
  reason: string;
  status: PauseRequestStatus;
  decidedBy?: string; // who approved or rejected it
  // Sent from the website: the plan's order number and the customer's mobile number
  websiteOrderId?: string;
  customerMobile?: string;
  requestedAt?: string; // ISO date and time
};

// Reasons a customer can choose on My Subscription
export const PAUSE_REASONS = ["Travelling", "Out of town", "Guests at home", "Health reasons", "Other"];

const STORAGE_KEY = "chiranvi-admin-pause-requests";

const sampleCustomers: [string, string, string, PauseRequest["frequency"], number][] = [
  ["Divya Rao", "Banashankari", "Cow Milk 1 L", "Daily", 1],
  ["Harish Patil", "JP Nagar", "Cow Milk 500 ml", "Daily", 0.5],
  ["Lakshmi Devi", "RR Nagar", "A2 Milk 1 L", "Daily", 1],
  ["Arjun Shetty", "Jayanagar", "Cow Milk 2 L", "Daily", 2],
  ["Kavya M", "Basavanagudi", "Buffalo Milk 1 L", "Daily", 1],
  ["Naveen Reddy", "Kengeri", "Cow Milk 1 L", "Alternate days", 0.5],
  ["Sneha Kulkarni", "Uttarahalli", "Cow Milk 1 L", "Daily", 1],
  ["Mahesh B", "Vijayanagar", "Cow Milk 500 ml", "Daily", 0.5],
  ["Deepa S", "Banashankari", "A2 Milk 1 L", "Daily", 1],
  ["Rahul Jain", "JP Nagar", "Cow Milk 2 L", "Daily", 2],
  ["Shalini K", "RR Nagar", "Buffalo Milk 1 L", "Daily", 1],
  ["Vinod Kumar", "Jayanagar", "Cow Milk 1 L", "Alternate days", 0.5],
  ["Asha N", "Basavanagudi", "Cow Milk 1 L", "Daily", 1],
  ["Manjunath G", "Kengeri", "Cow Milk 500 ml", "Daily", 0.5],
];

const sampleReasons = ["Travelling", "Out of town", "Guests leaving", "Festival trip", "Health reasons", "Not needed"];
const sampleDays = [3, 5, 2, 7, 4, 10];

function dayFromToday(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function makeSampleRequests(): PauseRequest[] {
  const requests: PauseRequest[] = [];
  for (let index = 0; index < 56; index++) {
    const [customerName, area, plan, frequency, litresPerDay] = sampleCustomers[index % sampleCustomers.length];
    const days = sampleDays[index % sampleDays.length];
    // Pending ones start from tomorrow; older approved ones started up to two weeks ago
    const startsIn = index < 5 ? 1 + (index % 4) : 1 - Math.floor(index / 4);
    requests.push({
      id: `PR-${600 - index}`,
      customerName,
      area,
      plan,
      frequency,
      litresPerDay,
      pauseFrom: dayFromToday(startsIn),
      resumeOn: dayFromToday(startsIn + days),
      reason: sampleReasons[index % sampleReasons.length],
      status: index < 5 ? "Pending" : "Approved",
      decidedBy: index < 5 ? undefined : "Karthik N",
    });
  }
  return requests;
}

let requests: PauseRequest[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: PauseRequest[] = [];

function getRequests() {
  if (requests) return requests;
  if (typeof window === "undefined") return EMPTY;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    requests = Array.isArray(saved) ? saved : makeSampleRequests();
  } catch {
    requests = makeSampleRequests();
  }
  return requests as PauseRequest[];
}

function save(newRequests: PauseRequest[]) {
  requests = newRequests;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newRequests));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

// Approved for a plan bought on the website: that plan is paused for those days on the Subscriptions page
export function decidePauseRequest(id: string, status: "Approved" | "Rejected", decidedBy: string) {
  const decided = getRequests().find((request) => request.id === id);
  save(getRequests().map((request) => (request.id === id ? { ...request, status, decidedBy } : request)));
  if (decided?.websiteOrderId) {
    setWebsitePlanPause(decided.websiteOrderId, status === "Approved" ? { pauseFrom: decided.pauseFrom, resumeOn: decided.resumeOn } : null);
  }
}

// A customer's request from My Subscription: waits for the panel's answer (Pending)
export function addPauseRequest(
  request: Pick<PauseRequest, "customerName" | "area" | "plan" | "frequency" | "litresPerDay" | "pauseFrom" | "resumeOn" | "reason" | "websiteOrderId" | "customerMobile">,
) {
  const highest = Math.max(0, ...getRequests().map((existing) => Number(existing.id.replace(/\D/g, ""))));
  const newRequest: PauseRequest = { ...request, id: `PR-${highest + 1}`, status: "Pending", requestedAt: new Date().toISOString() };
  save([newRequest, ...getRequests()]);
  return newRequest;
}

// The customer cancels a request the panel has not answered yet
export function cancelPauseRequest(id: string) {
  save(getRequests().filter((request) => !(request.id === id && request.status === "Pending")));
}

// Also follows changes made in other tabs and browsers (shared data): the customer sees the answer at once
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  function followOtherTabs(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    requests = null;
    onChange();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

export function usePauseRequests() {
  return useSyncExternalStore(subscribe, getRequests, () => EMPTY);
}

// An approved pause whose resume day has come is "Resumed"
export function getShownStatus(request: PauseRequest, today: Date): PauseRequestStatus | "Resumed" {
  if (request.status === "Approved" && new Date(request.resumeOn) <= today) return "Resumed";
  return request.status;
}
