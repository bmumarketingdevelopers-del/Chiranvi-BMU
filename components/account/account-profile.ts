import { useSyncExternalStore } from "react";

/*
  The logged-in customer's details on the account dashboard (sidebar name, welcome banner, Profile form).
  Placeholder values from the design until a real customer account exists. Kept only in the open
  page's memory, like the login: "Save changes" updates them until the page is refreshed.
*/

export type AccountProfile = {
  fullName: string;
  mobileNumber: string;
  email: string;
  dateOfBirth: string; // yyyy-mm-dd, the format date inputs use
  familySize: string;
  preferredPlanType: string;
};

const placeholderProfile: AccountProfile = {
  fullName: "Priya Sharma",
  mobileNumber: "+91 98450 12345",
  email: "priya.sharma@example.com",
  dateOfBirth: "1992-08-14",
  familySize: "3 – 4 members",
  preferredPlanType: "Weekly",
};

let accountProfile = placeholderProfile;
const accountProfileListeners = new Set<() => void>();

export function saveAccountProfile(newProfile: AccountProfile) {
  accountProfile = newProfile;
  accountProfileListeners.forEach((onChange) => onChange());
}

function subscribeToAccountProfile(onChange: () => void) {
  accountProfileListeners.add(onChange);
  return () => {
    accountProfileListeners.delete(onChange);
  };
}

export function useAccountProfile() {
  return useSyncExternalStore(
    subscribeToAccountProfile,
    () => accountProfile,
    () => placeholderProfile,
  );
}

// "Priya Sharma" -> "PS" (the round avatar in the sidebar).
export function getNameInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((namePart) => namePart[0]?.toUpperCase() ?? "")
    .join("");
}
