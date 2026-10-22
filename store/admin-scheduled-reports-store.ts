import { useSyncExternalStore } from "react";

/*
  Scheduled reports on the Chiranvi Panel's Reports page: which report goes to whom, how often and in
  what format. Saved in this browser; actually sending them (WhatsApp / email) needs the backend, so for
  now this is the list of what will be sent.
*/

export type ReportFrequency = "daily" | "monday" | "friday" | "saturday" | "monthly" | "low-stock";
export type ReportFormat = "PDF" | "Excel" | "PDF + Excel" | "WhatsApp";

export type ScheduledReport = {
  id: string;
  name: string; // "Daily summary"
  frequency: ReportFrequency;
  sentTo: string; // "Owner (WhatsApp)"
  format: ReportFormat;
  isPaused: boolean;
};

export const REPORT_FREQUENCIES: { key: ReportFrequency; label: string }[] = [
  { key: "daily", label: "Every day, 9 PM" },
  { key: "monday", label: "Every Monday, 8 AM" },
  { key: "friday", label: "Every Friday, 6 PM" },
  { key: "saturday", label: "Every Saturday, 10 AM" },
  { key: "monthly", label: "1st of month, 9 AM" },
  { key: "low-stock", label: "When stock is low" },
];

export const REPORT_FORMATS: ReportFormat[] = ["PDF", "Excel", "PDF + Excel", "WhatsApp"];

const STORAGE_KEY = "chiranvi-admin-scheduled-reports";

const startingReports: ScheduledReport[] = [
  { id: "SR-1", name: "Daily summary", frequency: "daily", sentTo: "Owner (WhatsApp)", format: "PDF", isPaused: false },
  { id: "SR-2", name: "Weekly sales", frequency: "monday", sentTo: "Owner, Karthik N", format: "Excel", isPaused: false },
  { id: "SR-3", name: "Monthly profit & loss", frequency: "monthly", sentTo: "Owner", format: "PDF + Excel", isPaused: false },
  { id: "SR-4", name: "Complaints summary", frequency: "friday", sentTo: "Owner, Divya Rao", format: "PDF", isPaused: false },
  { id: "SR-5", name: "Low stock alert", frequency: "low-stock", sentTo: "Manager", format: "WhatsApp", isPaused: true },
  { id: "SR-6", name: "Staff attendance", frequency: "saturday", sentTo: "Manager", format: "Excel", isPaused: false },
];

// When it goes out next ("On trigger" for low stock)
export function getNextRun(frequency: ReportFrequency, now = new Date()): Date | null {
  if (frequency === "low-stock") return null;
  const next = new Date(now);
  next.setSeconds(0, 0);
  if (frequency === "daily") {
    next.setHours(21, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }
  if (frequency === "monthly") {
    next.setHours(9, 0);
    next.setDate(1);
    if (next <= now) next.setMonth(next.getMonth() + 1);
    return next;
  }
  const weekday = { monday: 1, friday: 5, saturday: 6 }[frequency];
  const hour = { monday: 8, friday: 18, saturday: 10 }[frequency];
  next.setHours(hour, 0);
  next.setDate(next.getDate() + ((weekday - next.getDay() + 7) % 7));
  if (next <= now) next.setDate(next.getDate() + 7);
  return next;
}

let reports: ScheduledReport[] | null = null;
const listeners = new Set<() => void>();

function getReports() {
  if (reports) return reports;
  if (typeof window === "undefined") return startingReports;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    reports = Array.isArray(saved) ? saved : startingReports;
  } catch {
    reports = startingReports;
  }
  return reports as ScheduledReport[];
}

function save(newReports: ScheduledReport[]) {
  reports = newReports;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newReports));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

export function addScheduledReport(report: Omit<ScheduledReport, "id" | "isPaused">) {
  const highest = Math.max(0, ...getReports().map((existing) => Number(existing.id.replace(/\D/g, ""))));
  const newReport: ScheduledReport = { ...report, id: `SR-${highest + 1}`, isPaused: false };
  save([...getReports(), newReport]);
  return newReport;
}

export function setScheduledReportPaused(id: string, isPaused: boolean) {
  save(getReports().map((report) => (report.id === id ? { ...report, isPaused } : report)));
}

export function removeScheduledReport(id: string) {
  save(getReports().filter((report) => report.id !== id));
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useScheduledReports() {
  return useSyncExternalStore(subscribe, getReports, () => startingReports);
}
