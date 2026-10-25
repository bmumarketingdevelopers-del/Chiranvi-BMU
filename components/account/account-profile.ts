import { useMemo } from "react";
import { useLoggedInMobileNumber } from "@/components/login/login-status";
import { useOwnerDetails } from "@/store/staff-access-store";
import { useCustomerProfile, type CustomerProfile } from "@/store/customer-profiles-store";

/*
  The logged-in customer's details on the account dashboard (sidebar name, welcome banner). They come
  from the Profile page, saved per login number in store/customer-profiles-store.ts. Before the
  customer saves their profile: "New customer" (the owner: their name from Team access). Logged out
  (design preview only): the design's placeholder values.
  The mobile number is always the one that was used to log in.
*/

export type AccountProfile = {
  fullName: string;
  mobileNumber: string; // "+91 98450 12345"
  email: string;
  customerId: string; // empty until the profile is saved
  savedProfile: CustomerProfile | null; // null: a new customer who has not saved their profile yet
};

const placeholderProfile: AccountProfile = {
  fullName: "Priya Sharma",
  mobileNumber: "+91 98450 12345",
  email: "priya.sharma@example.com",
  customerId: "",
  savedProfile: null,
};

// "8754852810" -> "+91 87548 52810"
export function formatIndianMobileNumber(mobileNumber: string) {
  return `+91 ${mobileNumber.slice(0, 5)} ${mobileNumber.slice(5)}`;
}

export function useAccountProfile(): AccountProfile {
  const loggedInMobileNumber = useLoggedInMobileNumber();
  const owner = useOwnerDetails();
  const savedProfile = useCustomerProfile(loggedInMobileNumber);
  return useMemo(() => {
    if (!loggedInMobileNumber) return placeholderProfile;
    const savedName = savedProfile ? `${savedProfile.firstName} ${savedProfile.lastName}`.trim() : "";
    const fallbackName = loggedInMobileNumber === owner.mobileNumber ? owner.name : "New customer";
    return {
      fullName: savedName || fallbackName,
      mobileNumber: formatIndianMobileNumber(loggedInMobileNumber),
      email: savedProfile?.email ?? "",
      customerId: savedProfile?.customerId ?? "",
      savedProfile,
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
