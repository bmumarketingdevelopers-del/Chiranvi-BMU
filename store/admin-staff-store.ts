import { useSyncExternalStore } from "react";

/*
  The farm's team for the Chiranvi Panel's Staff page (and the Staff attendance report), until the
  database and the staff app are connected: job, phone, shift, today's attendance, days absent this
  month and salary. Saved in this browser.
  - The delivery agents are the same people as on Routes & agents (store/admin-routes-store.ts).
  - Each new day everyone starts as present, except people on leave; whoever was absent the day before
    has that day added to their days absent this month (and a new month starts from zero).
  Who can open the panel is separate: store/staff-access-store.ts (Roles & permissions).
*/

export type StaffGroup = "Delivery" | "Farm" | "Managers";
export type TodayStatus = "Present" | "Absent" | "On leave";

export type StaffPerson = {
  id: string;
  name: string;
  job: string; // "Delivery agent", "Farm worker", "Manager", ...
  group: StaffGroup;
  phone: string; // 10 digits
  shift: string; // "5 AM – 1 PM"
  salary: number; // a month
  today: TodayStatus;
  daysAbsentThisMonth: number; // before today
};

export const STAFF_JOBS: { job: string; group: StaffGroup }[] = [
  { job: "Delivery agent", group: "Delivery" },
  { job: "Driver", group: "Delivery" },
  { job: "Farm worker", group: "Farm" },
  { job: "Milking", group: "Farm" },
  { job: "Cattle care", group: "Farm" },
  { job: "Packing", group: "Farm" },
  { job: "Cleaner", group: "Farm" },
  { job: "Manager", group: "Managers" },
];

export const STAFF_SHIFTS = ["4 AM – 12 PM", "5 AM – 1 PM", "9 AM – 6 PM", "2 PM – 10 PM"];

const STORAGE_KEY = "chiranvi-admin-staff";

const startingStaff: StaffPerson[] = [
  ["Ramesh K", "Delivery agent", "9741230500", "5 AM – 1 PM", 14000, "Present", 1],
  ["Shivu M", "Delivery agent", "9741233523", "5 AM – 1 PM", 14000, "Present", 2],
  ["Somu N", "Delivery agent", "9741236546", "5 AM – 1 PM", 13000, "Present", 0],
  ["Karthik N", "Manager", "9741239569", "9 AM – 6 PM", 32000, "Present", 1],
  ["Manju R", "Delivery agent", "9741242592", "5 AM – 1 PM", 14000, "Present", 3],
  ["Divya Rao", "Manager", "9741245615", "9 AM – 6 PM", 32000, "Present", 1],
  ["Raju T", "Delivery agent", "9741248638", "5 AM – 1 PM", 13000, "Present", 0],
  ["Prakash S", "Delivery agent", "9741251661", "5 AM – 1 PM", 14000, "Present", 4],
  ["Gowramma", "Cleaner", "9741254684", "9 AM – 6 PM", 10000, "Absent", 6],
  ["Ganesh B", "Delivery agent", "9741257707", "5 AM – 1 PM", 14000, "Present", 1],
  ["Nagesh H", "Farm worker", "9741260730", "4 AM – 12 PM", 13000, "Present", 0],
  ["Anil Kumar", "Manager", "9741263753", "9 AM – 6 PM", 32000, "Present", 1],
  ["Imran A", "Delivery agent", "9741266776", "5 AM – 1 PM", 14000, "Present", 2],
  ["Basava", "Driver", "9741269799", "5 AM – 1 PM", 16000, "On leave", 8],
  ["Lakshmamma", "Milking", "9741272822", "4 AM – 12 PM", 12000, "Present", 0],
  ["Venkatesh", "Farm worker", "9741275845", "4 AM – 12 PM", 13000, "Present", 1],
  ["Shankar", "Cattle care", "9741278868", "2 PM – 10 PM", 12000, "Present", 2],
  ["Mahadevi", "Packing", "9741281891", "4 AM – 12 PM", 11000, "Present", 0],
].map(([name, job, phone, shift, salary, today, daysAbsentThisMonth], index) => ({
  id: `ST-${index + 1}`,
  name: name as string,
  job: job as string,
  group: STAFF_JOBS.find((staffJob) => staffJob.job === job)?.group ?? "Farm",
  phone: phone as string,
  shift: shift as string,
  salary: salary as number,
  today: today as TodayStatus,
  daysAbsentThisMonth: daysAbsentThisMonth as number,
}));

type SavedStaff = { date: string; staff: StaffPerson[] };

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

let saved: SavedStaff | null = null;
const listeners = new Set<() => void>();
const EMPTY: StaffPerson[] = [];

// A new day: yesterday's absences are counted, everyone not on leave starts as present
function startNewDay(previous: SavedStaff, date: string): SavedStaff {
  const isNewMonth = previous.date.slice(0, 7) !== date.slice(0, 7);
  return {
    date,
    staff: previous.staff.map((person) => ({
      ...person,
      daysAbsentThisMonth: isNewMonth ? 0 : person.daysAbsentThisMonth + (person.today === "Present" ? 0 : 1),
      today: person.today === "On leave" ? "On leave" : "Present",
    })),
  };
}

function getSaved() {
  const date = todayKey();
  if (saved && saved.date === date) return saved;
  if (typeof window === "undefined") return null;
  if (!saved) {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
      saved = stored && Array.isArray(stored.staff) ? stored : { date, staff: startingStaff };
    } catch {
      saved = { date, staff: startingStaff };
    }
  }
  if (saved && saved.date !== date) saved = startNewDay(saved, date);
  return saved;
}

function getStaff() {
  return getSaved()?.staff ?? EMPTY;
}

function save(staff: StaffPerson[]) {
  saved = { date: todayKey(), staff };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

export function setTodayStatus(id: string, today: TodayStatus) {
  save(getStaff().map((person) => (person.id === id ? { ...person, today } : person)));
}

export function updateStaffPerson(id: string, changes: Partial<Pick<StaffPerson, "job" | "group" | "phone" | "shift" | "salary">>) {
  save(getStaff().map((person) => (person.id === id ? { ...person, ...changes } : person)));
}

export function addStaffPerson(person: Pick<StaffPerson, "name" | "job" | "group" | "phone" | "shift" | "salary">) {
  const highest = Math.max(0, ...getStaff().map((existing) => Number(existing.id.replace(/\D/g, ""))));
  const newPerson: StaffPerson = { ...person, id: `ST-${highest + 1}`, today: "Present", daysAbsentThisMonth: 0 };
  save([...getStaff(), newPerson]);
  return newPerson;
}

export function removeStaffPerson(id: string) {
  save(getStaff().filter((person) => person.id !== id));
}

// Days present this month so far, counting today if present
export function getDaysPresent(person: StaffPerson, date = new Date()) {
  const daysSoFar = date.getDate();
  return Math.max(0, daysSoFar - person.daysAbsentThisMonth - (person.today === "Present" ? 0 : 1));
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useStaffList() {
  return useSyncExternalStore(subscribe, getStaff, () => EMPTY);
}
