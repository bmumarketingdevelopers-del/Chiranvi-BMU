import { useSyncExternalStore } from "react";

/*
  Pause requests seen in the Chiranvi Panel (Pause requests page, and the count on its sidebar
  badge), until the database is connected: customers asking to stop milk for a few days.
  The first time, 56 sample requests are made (5 waiting for approval); after that the list is saved in
  this browser, so approvals and rejections stay after a refresh.
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
};

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

export function decidePauseRequest(id: string, status: "Approved" | "Rejected", decidedBy: string) {
  requests = getRequests().map((request) => (request.id === id ? { ...request, status, decidedBy } : request));
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
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
