import { useSyncExternalStore } from "react";

/*
  Leave requests from the team for the Chiranvi Panel's Staff page (the Leave requests card and its
  pop-up), until the staff app and the database are connected: type, dates, reason, an attached document
  (a medical certificate, invitation, ...), and the owner's decision. Saved in this browser.
  - The first time, 14 waiting requests are made, plus a few already decided.
  - Each type has a yearly allowance; approved days are taken from it (Unpaid has no limit).
  Approving a request that covers today marks the person on leave (done by the Staff page).
*/

export type LeaveType = "Casual" | "Sick" | "Earned" | "Emergency" | "Half day" | "Unpaid";
export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export type LeaveAttachment = {
  fileName: string; // "medical-certificate.pdf"
  label: string; // "Medical certificate"
  issuedBy?: string; // "Dr. Ramya, Sparsh Clinic"
};

export type LeaveRequest = {
  id: string; // LV-1042
  staffName: string;
  type: LeaveType;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  reason: string;
  attachment?: LeaveAttachment;
  appliedAt: string; // ISO date and time
  status: LeaveStatus;
  decidedAt?: string;
  decidedBy?: string;
  rejectReason?: string;
};

export const LEAVE_TYPES: LeaveType[] = ["Casual", "Sick", "Earned", "Emergency", "Half day", "Unpaid"];

// Days allowed a year for each type (Unpaid: no limit)
export const LEAVE_ALLOWANCE: Record<LeaveType, number | null> = {
  Casual: 12,
  Sick: 8,
  Earned: 15,
  Emergency: 3,
  "Half day": 6,
  Unpaid: null,
};

const STORAGE_KEY = "chiranvi-admin-leave-requests";

function dayKey(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

// [name, type, starts in (days), length (days), reason, attachment, applied (hours ago)]
const waiting: [string, LeaveType, number, number, string, LeaveAttachment | undefined, number][] = [
  ["Manju R", "Sick", 0, 2, "High fever since last night, doctor advised two days' rest.", { fileName: "medical-certificate-manju.pdf", label: "Medical certificate", issuedBy: "Dr. Ramya, Sparsh Clinic" }, 3],
  ["Shivu M", "Casual", 3, 1, "Sister's engagement in Mandya.", { fileName: "engagement-invitation.jpg", label: "Invitation card" }, 20],
  ["Lakshmamma", "Sick", 1, 3, "Back pain after lifting milk cans; X-ray next week.", { fileName: "xray-prescription.pdf", label: "Doctor's prescription", issuedBy: "Dr. Suresh, Kengeri Govt Hospital" }, 9],
  ["Karthik N", "Earned", 9, 5, "Family trip to Coorg, planned in advance.", undefined, 50],
  ["Prakash S", "Emergency", 0, 1, "Father admitted to hospital this morning.", { fileName: "hospital-admission-slip.jpg", label: "Hospital admission slip", issuedBy: "Rajarajeshwari Hospital" }, 2],
  ["Nagesh H", "Casual", 5, 2, "Village temple festival (jathre).", undefined, 30],
  ["Imran A", "Half day", 2, 1, "Bank visit for home loan papers, will finish the morning route first.", { fileName: "bank-appointment.png", label: "Bank appointment", issuedBy: "Canara Bank, JP Nagar" }, 14],
  ["Mahadevi", "Sick", 1, 2, "Child is unwell, needs to stay home.", { fileName: "child-medical-note.pdf", label: "Medical note", issuedBy: "Dr. Kavitha, Children's Clinic" }, 6],
  ["Ganesh B", "Earned", 12, 4, "Going home to Hassan for the harvest.", undefined, 72],
  ["Venkatesh", "Unpaid", 6, 7, "Shifting house to a new village; casual leave used up.", undefined, 40],
  ["Raju T", "Casual", 4, 1, "Driving licence renewal at RTO.", { fileName: "rto-appointment.pdf", label: "RTO appointment", issuedBy: "RTO Bengaluru West" }, 26],
  ["Divya Rao", "Half day", 1, 1, "Parent-teacher meeting at school in the afternoon.", undefined, 18],
  ["Shankar", "Sick", 0, 1, "Cut on the hand at the cattle shed, stitches done.", { fileName: "clinic-bill.jpg", label: "Clinic bill", issuedBy: "Sparsh Clinic" }, 5],
  ["Somu N", "Casual", 8, 2, "Cousin's wedding in Tumakuru.", { fileName: "wedding-invitation.jpg", label: "Invitation card" }, 33],
];

const decided: [string, LeaveType, number, number, string, LeaveStatus, string?][] = [
  ["Basava", "Earned", -3, 8, "Daughter's wedding preparations.", "Approved"],
  ["Gowramma", "Sick", -6, 2, "Fever.", "Approved"],
  ["Anil Kumar", "Casual", -10, 1, "Personal work.", "Rejected", "Month-end stock count that day; please take another day."],
  ["Ramesh K", "Casual", -14, 1, "Function at home.", "Approved"],
];

function makeStartingRequests(): LeaveRequest[] {
  const pending = waiting.map(([staffName, type, startsIn, length, reason, attachment, appliedHoursAgo], index): LeaveRequest => ({
    id: `LV-${1054 - index}`,
    staffName,
    type,
    from: dayKey(startsIn),
    to: dayKey(startsIn + length - 1),
    reason,
    attachment,
    appliedAt: hoursAgo(appliedHoursAgo),
    status: "Pending",
  }));
  const history = decided.map(([staffName, type, startsIn, length, reason, status, rejectReason], index): LeaveRequest => ({
    id: `LV-${1040 - index}`,
    staffName,
    type,
    from: dayKey(startsIn),
    to: dayKey(startsIn + length - 1),
    reason,
    appliedAt: hoursAgo(-startsIn * 24 + 48),
    status,
    decidedAt: hoursAgo(-startsIn * 24 + 24),
    decidedBy: "Hariprasath",
    rejectReason,
  }));
  return [...pending, ...history];
}

let requests: LeaveRequest[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: LeaveRequest[] = [];

function getRequests() {
  if (requests) return requests;
  if (typeof window === "undefined") return EMPTY;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    requests = Array.isArray(saved) ? saved : makeStartingRequests();
  } catch {
    requests = makeStartingRequests();
  }
  return requests as LeaveRequest[];
}

function save(newRequests: LeaveRequest[]) {
  requests = newRequests;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newRequests));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

export function decideLeave(id: string, status: Exclude<LeaveStatus, "Pending">, decidedBy: string, rejectReason?: string) {
  save(
    getRequests().map((request) =>
      request.id === id
        ? { ...request, status, decidedBy, decidedAt: new Date().toISOString(), rejectReason: status === "Rejected" ? rejectReason : undefined }
        : request,
    ),
  );
}

// Number of leave days (a half day counts as half)
export function getLeaveDays(request: Pick<LeaveRequest, "from" | "to" | "type">) {
  if (request.type === "Half day") return 0.5;
  const from = new Date(`${request.from}T12:00:00`);
  const to = new Date(`${request.to}T12:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
}

// Days of this type still allowed this year, after approved requests (null: no limit)
export function getLeaveLeft(staffName: string, type: LeaveType, allRequests: LeaveRequest[]) {
  const allowance = LEAVE_ALLOWANCE[type];
  if (allowance === null) return null;
  const year = String(new Date().getFullYear());
  const used = allRequests
    .filter((request) => request.staffName === staffName && request.type === type && request.status === "Approved" && request.from.startsWith(year))
    .reduce((sum, request) => sum + getLeaveDays(request), 0);
  return Math.max(0, allowance - used);
}

export function coversToday(request: Pick<LeaveRequest, "from" | "to">) {
  const today = dayKey(0);
  return request.from <= today && request.to >= today;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useLeaveRequests() {
  return useSyncExternalStore(subscribe, getRequests, () => EMPTY);
}
