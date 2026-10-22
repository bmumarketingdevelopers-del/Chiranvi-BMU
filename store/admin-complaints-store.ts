import { useSyncExternalStore } from "react";

/*
  Complaint tickets seen in the Chiranvi Panel (Refunds & complaints page, and the red count on its
  sidebar badge), until the database is connected: customer issues, any refund given, and who is
  handling them. Refunds go back to the customer's payment method (no wallet).
  The first time, 96 sample tickets are made; after that they are saved in this browser.
*/

export type TicketPriority = "High" | "Medium" | "Low";
export type TicketStatus = "Open" | "In progress" | "Resolved";

export type ComplaintTicket = {
  id: string; // TK-514
  raisedAt: string; // ISO date
  customerName: string;
  area: string;
  issue: string;
  orderNumber: string;
  refund: number; // 0 when there is no refund
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string;
  resolvedAt?: string; // ISO date and time
};

export const TICKET_ISSUES = [
  "Spoiled milk",
  "Missed delivery",
  "Wrong item",
  "Late delivery",
  "Pouch leaking",
  "Short quantity",
];
export const TICKET_HANDLERS = ["Karthik N", "Divya Rao"];
export const TICKET_PRIORITIES: TicketPriority[] = ["High", "Medium", "Low"];

const STORAGE_KEY = "chiranvi-admin-complaints";

const sampleCustomers: [string, string][] = [
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
  ["Vinod Kumar", "Jayanagar"],
];
const sampleRefunds = [68, 0, 45, 0, 36, 136];
const samplePriorities: TicketPriority[] = ["High", "Medium", "Low"];
const sampleStatuses: TicketStatus[] = [
  "Open",
  "In progress",
  "Resolved",
  "Resolved",
  "Open",
  "Resolved",
  "In progress",
  "Open",
  "In progress",
  "Resolved",
  "Resolved",
  "Open",
  "Resolved",
  "In progress",
];

function makeSampleTickets(): ComplaintTicket[] {
  const tickets: ComplaintTicket[] = [];
  for (let index = 0; index < 96; index++) {
    const raisedAt = new Date();
    raisedAt.setDate(raisedAt.getDate() - Math.floor(index / 5));
    raisedAt.setHours(9, 0, 0, 0);
    const [customerName, area] = sampleCustomers[index % sampleCustomers.length];
    // The newest 14 follow the design's mix; older ones are resolved
    const status = index < 14 ? sampleStatuses[index] : "Resolved";
    tickets.push({
      id: `TK-${514 - index}`,
      raisedAt: raisedAt.toISOString(),
      customerName,
      area,
      issue: TICKET_ISSUES[index % TICKET_ISSUES.length],
      orderNumber: `#CF-${2030 - index * 3}`,
      refund: sampleRefunds[index % sampleRefunds.length],
      priority: samplePriorities[index % samplePriorities.length],
      status,
      assignedTo: TICKET_HANDLERS[index % 2],
      resolvedAt: status === "Resolved" ? new Date(raisedAt.getTime() + (3 + (index % 5)) * 3600000).toISOString() : undefined,
    });
  }
  return tickets;
}

let tickets: ComplaintTicket[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: ComplaintTicket[] = [];

function getTickets() {
  if (tickets) return tickets;
  if (typeof window === "undefined") return EMPTY;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    tickets = Array.isArray(saved) ? saved : makeSampleTickets();
  } catch {
    tickets = makeSampleTickets();
  }
  return tickets as ComplaintTicket[];
}

function save(newTickets: ComplaintTicket[]) {
  tickets = newTickets;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newTickets));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

export function updateTicket(id: string, changes: Partial<Pick<ComplaintTicket, "status" | "assignedTo" | "refund" | "priority">>) {
  save(
    getTickets().map((ticket) =>
      ticket.id === id
        ? {
            ...ticket,
            ...changes,
            resolvedAt:
              changes.status === "Resolved"
                ? new Date().toISOString()
                : changes.status
                  ? undefined
                  : ticket.resolvedAt,
          }
        : ticket,
    ),
  );
}

export function addTicket(ticket: Omit<ComplaintTicket, "id" | "raisedAt" | "status" | "resolvedAt">) {
  const highest = Math.max(0, ...getTickets().map((existing) => Number(existing.id.replace(/\D/g, ""))));
  const newTicket: ComplaintTicket = { ...ticket, id: `TK-${highest + 1}`, raisedAt: new Date().toISOString(), status: "Open" };
  save([newTicket, ...getTickets()]);
  return newTicket;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useComplaintTickets() {
  return useSyncExternalStore(subscribe, getTickets, () => EMPTY);
}
