import { useSyncExternalStore } from "react";
// The same customers in every browser (until the database is connected)
import "./shared-data-sync";
import { customerIdForMobile, isCustomerListed, saveRegisteredCustomer } from "./admin-customers-store";
import { updateAddressesFromProfile } from "./address-store";

/*
  Customers' own details from the Profile page (/account), saved per login mobile number until the
  database is connected. A new customer is taken to the Profile page after logging in; saving it gives
  them a Customer ID and puts them on the Chiranvi Panel's Customers page (badge "new").
  Later this is one row per customer in a Supabase "customers" table, with the same fields:
    customer_id, first_name, last_name, primary_mobile (unique, the login number), secondary_mobile,
    email, primary_address, secondary_address, location, pincode, date_of_birth, family_size,
    preferred_plan_type, created_at, updated_at.
*/

export type CustomerProfileDetails = {
  firstName: string;
  lastName: string;
  primaryMobile: string; // 10 digits, the number used to log in
  secondaryMobile: string; // 10 digits or empty
  email: string;
  primaryAddress: string;
  secondaryAddress: string;
  location: string; // a Bengaluru area from bengaluru-locations.ts
  pincode: string; // 6 digits
  // Optional (asked under "More about you")
  dateOfBirth: string; // yyyy-mm-dd or empty
  familySize: string;
  preferredPlanType: string;
};

export type CustomerProfile = CustomerProfileDetails & {
  customerId: string; // CUS-6384
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

const STORAGE_KEY = "chiranvi-customer-profiles";

let profiles: Record<string, CustomerProfile> | null = null;
const listeners = new Set<() => void>();
const EMPTY: Record<string, CustomerProfile> = {};

function getProfiles() {
  if (profiles) return profiles;
  if (typeof window === "undefined") return EMPTY;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    const savedProfiles: Record<string, CustomerProfile> = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    // The Customer ID always comes from the login number (older profiles had a numbered one)
    profiles = Object.fromEntries(
      Object.entries(savedProfiles).map(([mobileNumber, profile]) => [mobileNumber, { ...profile, customerId: customerIdForMobile(mobileNumber) }]),
    );
  } catch {
    profiles = {};
  }
  return profiles as Record<string, CustomerProfile>;
}

/*
  Every customer with a saved profile is on the Chiranvi Panel's Customers page: one missing (for example
  lost when two browsers' lists were joined before IDs came from mobile numbers) is put back. Runs after
  the profiles load or change, never while a page is drawing.
*/
let isListingCheckWaiting = false;
function checkEveryCustomerIsListed() {
  if (isListingCheckWaiting || typeof window === "undefined") return;
  isListingCheckWaiting = true;
  window.setTimeout(() => {
    isListingCheckWaiting = false;
    for (const profile of Object.values(getProfiles())) {
      if (profile.primaryMobile && !isCustomerListed(profile.primaryMobile)) saveRegisteredCustomer(profile, profile.createdAt);
    }
  }, 0);
}

// The saved profile of this login number, or null (a new customer)
export function getCustomerProfile(mobileNumber: string): CustomerProfile | null {
  return getProfiles()[mobileNumber] ?? null;
}

// Saves the Profile form; the first save also adds the customer to the Chiranvi Panel's Customers page
export function saveCustomerProfile(details: CustomerProfileDetails): CustomerProfile {
  const existing = getCustomerProfile(details.primaryMobile);
  const now = new Date().toISOString();
  const customerId = saveRegisteredCustomer(details, existing?.createdAt);
  const profile: CustomerProfile = {
    ...details,
    customerId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  profiles = { ...getProfiles(), [details.primaryMobile]: profile };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // Storage blocked: the profile lasts until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
  // Their address book (cart checkout, My Addresses) takes the new primary / secondary address
  updateAddressesFromProfile(profile);
  return profile;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  checkEveryCustomerIsListed();
  // A profile saved in another tab or browser (shared data)
  function followOtherTabs(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    profiles = null;
    onChange();
    checkEveryCustomerIsListed();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

// In every browser (also one with only the panel open): check once loaded, and whenever the profiles or
// the Customers list change in another browser
if (typeof window !== "undefined") {
  checkEveryCustomerIsListed();
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) profiles = null;
    if (event.key === STORAGE_KEY || event.key === "chiranvi-admin-customers") checkEveryCustomerIsListed();
  });
}

export function useCustomerProfile(mobileNumber: string | null): CustomerProfile | null {
  const allProfiles = useSyncExternalStore(subscribe, getProfiles, () => EMPTY);
  return mobileNumber ? (allProfiles[mobileNumber] ?? null) : null;
}
