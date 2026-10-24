import { useSyncExternalStore } from "react";

/*
  Leads seen in the Chiranvi Panel (Leads page), until the database is connected: people who asked
  about Chiranvi from Instagram, the website, referrals, Google or a walk-in.
  Each lead is in one stage: New, Contacted, Free trial, Converted or Lost. The first time, 37 sample
  leads are made; after that the list is saved in this browser, so moves and new leads stay.
*/

export type LeadStage = "new" | "contacted" | "trial" | "converted" | "lost";
export type LeadSource = "Instagram" | "Website" | "Referral" | "Google" | "Walk-in";

export const LEAD_STAGES: { key: LeadStage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "trial", label: "Free trial" },
  { key: "converted", label: "Converted" },
  { key: "lost", label: "Lost" },
];

export const LEAD_SOURCES: LeadSource[] = ["Instagram", "Website", "Referral", "Google", "Walk-in"];

export type AdminLead = {
  id: string;
  name: string;
  phone: string; // 98861 20 410
  source: LeadSource;
  stage: LeadStage;
  createdAt: string; // ISO date
  // Small note on the card: "Call back 5 PM", "Daily Milk", "Price" ...
  note?: string;
  trialEndsAt?: string; // ISO date, for free trials
  // From the website's bulk order form ("Get a bulk quote")
  address?: string;
  email?: string;
  bulkOrderItems?: BulkOrderItem[];
};

export type BulkOrderItem = { productName: string; packLabel: string; quantity: number };

const STORAGE_KEY = "chiranvi-admin-leads";

const sampleLeads: [string, LeadStage, LeadSource, number, string?][] = [
  ["Anitha R", "new", "Instagram", 1],
  ["Suresh Gowda", "new", "Website", 2],
  ["Meena Iyer", "new", "Referral", 3],
  ["Karthik N", "new", "Google", 4],
  ["Divya Rao", "new", "Walk-in", 1],
  ["Harish Patil", "new", "Instagram", 2],
  ["Rekha P", "new", "Website", 3],
  ["Sanjay K", "new", "Google", 5],
  ["Pooja S", "new", "Referral", 6],
  ["Lakshmi Devi", "contacted", "Website", 2, "Call back 5 PM"],
  ["Arjun Shetty", "contacted", "Referral", 3, "Call back 5 PM"],
  ["Kavya M", "contacted", "Google", 3, "Call back 5 PM"],
  ["Naveen Reddy", "contacted", "Walk-in", 4, "Call back 5 PM"],
  ["Sneha Kulkarni", "contacted", "Instagram", 4, "Call back 5 PM"],
  ["Mahesh B", "contacted", "Website", 5, "Call back 5 PM"],
  ["Gowri T", "contacted", "Google", 6, "Call back 5 PM"],
  ["Deepa S", "trial", "Referral", 4],
  ["Rahul Jain", "trial", "Google", 5],
  ["Shalini K", "trial", "Walk-in", 6],
  ["Vinod Kumar", "trial", "Instagram", 4],
  ["Asha N", "trial", "Website", 5],
  ["Manjunath G", "converted", "Referral", 9, "Daily Milk"],
  ["Priya Sharma", "converted", "Google", 10, "Daily Milk"],
  ["Ravi Kumar", "converted", "Walk-in", 11, "Daily Milk"],
  ["Anitha R", "converted", "Instagram", 12, "Daily Milk"],
  ["Suresh Gowda", "converted", "Website", 12, "Daily Milk"],
  ["Meena Iyer", "converted", "Referral", 13, "Daily Milk"],
  ["Kiran V", "converted", "Google", 14, "Daily Milk"],
  ["Usha R", "converted", "Website", 15, "Daily Milk"],
  ["Ganesh P", "converted", "Walk-in", 15, "Daily Milk"],
  ["Latha M", "converted", "Instagram", 16, "Daily Milk"],
  ["Ramesh S", "converted", "Referral", 17, "Daily Milk"],
  ["Karthik N", "lost", "Google", 8, "Price"],
  ["Divya Rao", "lost", "Walk-in", 9, "Price"],
  ["Harish Patil", "lost", "Instagram", 10, "Price"],
  ["Lakshmi Devi", "lost", "Website", 11, "Price"],
  ["Bhavya H", "new", "Referral", 1],
];

function makeSampleLeads(): AdminLead[] {
  const now = Date.now();
  return sampleLeads.map(([name, stage, source, daysAgo, note], index) => ({
    id: `LD-${300 + index}`,
    name,
    phone: `98861 ${String(20 + ((index * 3) % 80)).padStart(2, "0")} ${String(410 + ((index * 37) % 580)).padStart(3, "0")}`,
    source,
    stage,
    createdAt: new Date(now - daysAgo * 86400000).toISOString(),
    note,
    trialEndsAt: stage === "trial" ? new Date(now + (1 + (index % 3)) * 86400000).toISOString() : undefined,
  }));
}

let leads: AdminLead[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: AdminLead[] = [];

function getLeads() {
  if (leads) return leads;
  if (typeof window === "undefined") return EMPTY;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    leads = Array.isArray(saved) ? saved : makeSampleLeads();
  } catch {
    leads = makeSampleLeads();
  }
  return leads as AdminLead[];
}

function save(newLeads: AdminLead[]) {
  leads = newLeads;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newLeads));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

// Moving a lead sets the note that stage shows on its card
export function moveLead(id: string, stage: LeadStage) {
  const notes: Partial<Record<LeadStage, string>> = { contacted: "Call back 5 PM", converted: "Daily Milk", lost: "Price" };
  save(
    getLeads().map((lead) =>
      lead.id === id
        ? {
            ...lead,
            stage,
            note: notes[stage],
            trialEndsAt: stage === "trial" ? new Date(Date.now() + 3 * 86400000).toISOString() : undefined,
          }
        : lead,
    ),
  );
}

// A new lead (stage New). The website's bulk order form also sends a note, the address, email and products.
export function addLead(lead: Pick<AdminLead, "name" | "phone" | "source"> & Partial<Pick<AdminLead, "note" | "address" | "email" | "bulkOrderItems">>) {
  const highest = Math.max(0, ...getLeads().map((existing) => Number(existing.id.replace(/\D/g, ""))));
  const newLead: AdminLead = { ...lead, id: `LD-${highest + 1}`, stage: "new", createdAt: new Date().toISOString() };
  save([newLead, ...getLeads()]);
  return newLead;
}

export function removeLead(id: string) {
  save(getLeads().filter((lead) => lead.id !== id));
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useAdminLeads() {
  return useSyncExternalStore(subscribe, getLeads, () => EMPTY);
}
