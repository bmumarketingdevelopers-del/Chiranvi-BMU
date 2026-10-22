import { useSyncExternalStore } from "react";
import { rememberLogin, useLoggedInMobileNumber } from "@/components/login/login-status";
import { PANEL_FEATURES, type PanelFeature } from "./panel-features";

/*
  Who can open the Chiranvi Panel (/admin), until real accounts exist (Supabase).
  - Owner: Hariprasath, 8754852810 to start with. Can do everything, and is the only one who can add
    or remove people (the "Team access" page). The owner can change their own name and number there.
  - Admin: added by the owner. Can open every panel page except Team access.
  - Manager: added by the owner, with only the panel features the owner ticks.
  The team list is saved in this browser (localStorage), so it stays after a refresh. Like the login,
  this is not real security yet, and it only applies in this browser.
*/

// The owner to start with (until the owner changes their name or number in Team access)
const DEFAULT_OWNER: OwnerDetails = { name: "Hariprasath", mobileNumber: "8754852810" };

export type OwnerDetails = { name: string; mobileNumber: string };

// Panel features a manager can be given (the owner and admins have all of them): store/panel-features.ts
export { PANEL_FEATURES, type PanelFeature };

export type StaffRole = "owner" | "admin" | "manager";

export type StaffMember = {
  mobileNumber: string; // 10 digits
  name: string;
  role: "admin" | "manager";
  features: PanelFeature[]; // used for managers
};

export type StaffAccess = {
  role: StaffRole;
  name: string;
  // What the person can open in the panel
  canOpenFeature: (feature: PanelFeature) => boolean;
  canManageTeam: boolean;
};

const STAFF_STORAGE_KEY = "chiranvi-staff-members";
const OWNER_STORAGE_KEY = "chiranvi-owner";
const EMPTY_TEAM: StaffMember[] = [];

let staffMembers: StaffMember[] = EMPTY_TEAM;
let hasReadSavedTeam = false;
const staffListeners = new Set<() => void>();

function readSavedTeam() {
  if (hasReadSavedTeam || typeof window === "undefined") return;
  hasReadSavedTeam = true;
  try {
    const savedTeam = JSON.parse(window.localStorage.getItem(STAFF_STORAGE_KEY) ?? "[]");
    staffMembers = Array.isArray(savedTeam) ? savedTeam : EMPTY_TEAM;
  } catch {
    staffMembers = EMPTY_TEAM;
  }
}

function saveTeam(newTeam: StaffMember[]) {
  staffMembers = newTeam;
  hasReadSavedTeam = true;
  try {
    window.localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(newTeam));
  } catch {
    // Storage blocked: the change lasts until the page is refreshed.
  }
  staffListeners.forEach((onChange) => onChange());
}

// Adds a person, or replaces them if the number is already on the team.
export function saveStaffMember(member: StaffMember) {
  const others = staffMembers.filter((existing) => existing.mobileNumber !== member.mobileNumber);
  saveTeam([...others, member]);
}

export function removeStaffMember(mobileNumber: string) {
  saveTeam(staffMembers.filter((member) => member.mobileNumber !== mobileNumber));
}

// Owner details (name and number), saved in this browser like the team
let ownerDetails: OwnerDetails = DEFAULT_OWNER;
let hasReadSavedOwner = false;

function readSavedOwner() {
  if (hasReadSavedOwner || typeof window === "undefined") return;
  hasReadSavedOwner = true;
  try {
    const savedOwner = JSON.parse(window.localStorage.getItem(OWNER_STORAGE_KEY) ?? "null");
    ownerDetails =
      typeof savedOwner?.name === "string" && typeof savedOwner?.mobileNumber === "string" ? savedOwner : DEFAULT_OWNER;
  } catch {
    ownerDetails = DEFAULT_OWNER;
  }
}

/*
  The owner changes their name or number. A new number becomes the owner's login straight away (the
  owner stays logged in), and from then on the owner logs in with the new number.
*/
export function saveOwnerDetails(newDetails: OwnerDetails) {
  const loggedInAsOwner = getLoggedInNumberForOwnerChange() === getOwner().mobileNumber;
  ownerDetails = newDetails;
  hasReadSavedOwner = true;
  try {
    window.localStorage.setItem(OWNER_STORAGE_KEY, JSON.stringify(newDetails));
  } catch {
    // Storage blocked: the change lasts until the page is refreshed.
  }
  staffListeners.forEach((onChange) => onChange());
  if (loggedInAsOwner) rememberLogin(newDetails.mobileNumber);
}

function getLoggedInNumberForOwnerChange() {
  try {
    return JSON.parse(window.localStorage.getItem("chiranvi-login") ?? "null")?.mobileNumber ?? null;
  } catch {
    return null;
  }
}

function getOwner() {
  readSavedOwner();
  return ownerDetails;
}

export function useOwnerDetails() {
  return useSyncExternalStore(subscribeToTeam, getOwner, () => DEFAULT_OWNER);
}

function subscribeToTeam(onChange: () => void) {
  staffListeners.add(onChange);
  function followOtherTabs(event: StorageEvent) {
    if (event.key !== STAFF_STORAGE_KEY && event.key !== OWNER_STORAGE_KEY) return;
    hasReadSavedTeam = false;
    hasReadSavedOwner = false;
    readSavedTeam();
    readSavedOwner();
    onChange();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    staffListeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

function getTeam() {
  readSavedTeam();
  return staffMembers;
}

export function useStaffMembers() {
  return useSyncExternalStore(subscribeToTeam, getTeam, () => EMPTY_TEAM);
}

// What a mobile number can do in the panel, or null for customers.
export function getStaffAccess(
  mobileNumber: string | null,
  team: StaffMember[],
  owner: OwnerDetails,
): StaffAccess | null {
  if (!mobileNumber) return null;
  if (mobileNumber === owner.mobileNumber) {
    return { role: "owner", name: owner.name, canOpenFeature: () => true, canManageTeam: true };
  }
  const member = team.find((existing) => existing.mobileNumber === mobileNumber);
  if (!member) return null;
  if (member.role === "admin") {
    return { role: "admin", name: member.name, canOpenFeature: () => true, canManageTeam: false };
  }
  return {
    role: "manager",
    name: member.name,
    canOpenFeature: (feature) => member.features.includes(feature),
    canManageTeam: false,
  };
}

// The logged-in person's panel access, or null (customers, logged-out visitors, and on the server).
export function useCurrentStaffAccess() {
  const mobileNumber = useLoggedInMobileNumber();
  const team = useStaffMembers();
  const owner = useOwnerDetails();
  return getStaffAccess(mobileNumber, team, owner);
}
