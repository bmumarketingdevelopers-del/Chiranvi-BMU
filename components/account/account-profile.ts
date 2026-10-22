import { useMemo, useSyncExternalStore } from "react";
import { useLoggedInMobileNumber } from "@/components/login/login-status";
import { useOwnerDetails } from "@/store/staff-access-store";

/*
  The logged-in customer's details on the account dashboard (sidebar name, welcome banner, Profile form).
  Placeholder values from the design until a real customer account exists. Kept only in the open
  page's memory: "Save changes" updates them until the page is refreshed.
  The mobile number is always the one that was used to log in. The owner's name comes from the owner
  details (Team access in the Chiranvi Panel) until they save a different name in the Profile form.
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

// "8754852810" -> "+91 87548 52810"
export function formatIndianMobileNumber(mobileNumber: string) {
  return `+91 ${mobileNumber.slice(0, 5)} ${mobileNumber.slice(5)}`;
}

export function useAccountProfile() {
  const savedProfile = useSyncExternalStore(
    subscribeToAccountProfile,
    () => accountProfile,
    () => placeholderProfile,
  );
  const loggedInMobileNumber = useLoggedInMobileNumber();
  const owner = useOwnerDetails();
  return useMemo(() => {
    if (!loggedInMobileNumber) return savedProfile;
    const isOwnerWithDefaultName =
      loggedInMobileNumber === owner.mobileNumber && savedProfile.fullName === placeholderProfile.fullName;
    return {
      ...savedProfile,
      fullName: isOwnerWithDefaultName ? owner.name : savedProfile.fullName,
      mobileNumber: formatIndianMobileNumber(loggedInMobileNumber),
    };
  }, [savedProfile, loggedInMobileNumber, owner]);
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
