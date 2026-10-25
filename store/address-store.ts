import { useSyncExternalStore } from "react";
import { useLoggedInMobileNumber } from "@/components/login/login-status";
import { getCustomerProfile, useCustomerProfile, type CustomerProfile } from "./customer-profiles-store";

/*
  The logged-in customer's saved delivery addresses and which one is the default, shared by My Addresses
  (account dashboard) and the address step of the cart checkout. Each customer (login number) has their
  own address book, saved in this browser (localStorage), so a customer only ever sees their own.
  A customer's book starts with the addresses from their Profile page: the primary address ("Home",
  the default) and the secondary address ("Other"); saving the Profile again updates those two.
  Addresses they add, edit or remove here are kept with them. Logged out: no addresses.
*/

export type SavedAddress = {
  id: string;
  label: string;
  name: string;
  mobileNumber: string;
  houseAndStreet: string;
  area: string;
  city: string;
  pincode: string;
};

export type AddressDetails = Omit<SavedAddress, "id">;

type AddressBook = { addresses: SavedAddress[]; defaultAddressId: string };

const EMPTY_ADDRESS_BOOK: AddressBook = { addresses: [], defaultAddressId: "" };
// The two addresses that come from the Profile page
const PROFILE_PRIMARY_ID = "profile-primary";
const PROFILE_SECONDARY_ID = "profile-secondary";

const addressStorageKey = (mobileNumber: string) => `chiranvi-addresses-${mobileNumber}`;
// Each customer's book once read (or made from their profile), by login number
const addressBooks = new Map<string, { book: AddressBook; isSaved: boolean; fromProfileUpdatedAt?: string }>();
const addressBookListeners = new Set<() => void>();

// "+919845012345" or "98450 12345" -> "+91 98450 12345"
function formatMobileNumber(mobileNumber: string) {
  const digits = mobileNumber.replace(/\D/g, "").slice(-10);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

// The Profile page's addresses as address book entries (the secondary one only when filled in)
function addressesFromProfile(profile: CustomerProfile): SavedAddress[] {
  const shared = {
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    mobileNumber: formatMobileNumber(profile.primaryMobile),
    area: profile.location,
    city: "Bengaluru",
    pincode: profile.pincode,
  };
  const addresses: SavedAddress[] = [{ ...shared, id: PROFILE_PRIMARY_ID, label: "Home", houseAndStreet: profile.primaryAddress }];
  if (profile.secondaryAddress.trim()) {
    addresses.push({ ...shared, id: PROFILE_SECONDARY_ID, label: "Other", houseAndStreet: profile.secondaryAddress });
  }
  return addresses;
}

// The logged-in number, read from the login saved in this browser (store functions are not hooks)
function readLoggedInMobileNumber(): string | null {
  try {
    const savedLogin = JSON.parse(window.localStorage.getItem("chiranvi-login") ?? "null");
    return typeof savedLogin?.mobileNumber === "string" ? savedLogin.mobileNumber : null;
  } catch {
    return null;
  }
}

function getAddressBook(mobileNumber: string | null): AddressBook {
  if (!mobileNumber || typeof window === "undefined") return EMPTY_ADDRESS_BOOK;
  const cached = addressBooks.get(mobileNumber);
  const profile = getCustomerProfile(mobileNumber);
  // A book made from the profile (nothing changed yet) follows the profile when it is saved again
  if (cached && (cached.isSaved || cached.fromProfileUpdatedAt === profile?.updatedAt)) return cached.book;
  try {
    const saved = JSON.parse(window.localStorage.getItem(addressStorageKey(mobileNumber)) ?? "null");
    if (saved && Array.isArray(saved.addresses)) {
      addressBooks.set(mobileNumber, { book: saved, isSaved: true });
      return saved;
    }
  } catch {
    // Nothing saved, or storage blocked: made from the profile below.
  }
  const fromProfile = profile ? addressesFromProfile(profile) : [];
  const book: AddressBook = { addresses: fromProfile, defaultAddressId: fromProfile[0]?.id ?? "" };
  addressBooks.set(mobileNumber, { book, isSaved: false, fromProfileUpdatedAt: profile?.updatedAt });
  return book;
}

function saveAddressBook(mobileNumber: string, newAddressBook: AddressBook) {
  addressBooks.set(mobileNumber, { book: newAddressBook, isSaved: true });
  try {
    window.localStorage.setItem(addressStorageKey(mobileNumber), JSON.stringify(newAddressBook));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  addressBookListeners.forEach((onChange) => onChange());
}

// Changes the logged-in customer's book (nothing happens when logged out)
function changeAddressBook(change: (addressBook: AddressBook) => AddressBook) {
  const mobileNumber = readLoggedInMobileNumber();
  if (!mobileNumber) return;
  saveAddressBook(mobileNumber, change(getAddressBook(mobileNumber)));
}

/*
  The customer saved their Profile again: their Home / Other addresses take the new details (put back
  if they had removed them); addresses they added themselves stay. A book not changed yet follows the
  profile by itself.
*/
export function updateAddressesFromProfile(profile: CustomerProfile) {
  const cached = addressBooks.get(profile.primaryMobile);
  let savedBook: AddressBook | null = cached?.isSaved ? cached.book : null;
  if (!savedBook) {
    try {
      const saved = JSON.parse(window.localStorage.getItem(addressStorageKey(profile.primaryMobile)) ?? "null");
      if (saved && Array.isArray(saved.addresses)) savedBook = saved;
    } catch {
      // Not saved yet: the book follows the profile by itself.
    }
  }
  if (!savedBook) {
    addressBookListeners.forEach((onChange) => onChange());
    return;
  }
  const fromProfile = addressesFromProfile(profile);
  const others = savedBook.addresses.filter((address) => address.id !== PROFILE_PRIMARY_ID && address.id !== PROFILE_SECONDARY_ID);
  const addresses = [...fromProfile, ...others];
  const defaultAddressId = addresses.some((address) => address.id === savedBook.defaultAddressId)
    ? savedBook.defaultAddressId
    : (addresses[0]?.id ?? "");
  saveAddressBook(profile.primaryMobile, { addresses, defaultAddressId });
}

function subscribeToAddressBook(onChange: () => void) {
  addressBookListeners.add(onChange);
  // An address book changed in another tab or browser (shared data)
  function followOtherTabs(event: StorageEvent) {
    if (!event.key?.startsWith("chiranvi-addresses-")) return;
    addressBooks.delete(event.key.replace("chiranvi-addresses-", ""));
    onChange();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    addressBookListeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

// The logged-in customer's { addresses, defaultAddressId }
export function useAddressBook() {
  const mobileNumber = useLoggedInMobileNumber();
  // Read so the book follows the profile when it is saved (the book itself is made from it)
  useCustomerProfile(mobileNumber);
  return useSyncExternalStore(
    subscribeToAddressBook,
    () => getAddressBook(mobileNumber),
    () => EMPTY_ADDRESS_BOOK,
  );
}

/*
  "#1312, Prestige Lakeside Habitat, Varthur, Bengaluru 560087". Customers often type the area, city or
  pincode in the street line too ("…, 4th Main Road, Electronic City"): those parts are left out of the
  street line, so the area, city and pincode show once, at the end.
*/
export function formatAddressLine(address: AddressDetails) {
  const sameText = (first: string, second: string) => first.trim().toLowerCase() === second.trim().toLowerCase();
  const isCityOrPincode = (part: string) =>
    /^(bengaluru|bangalore)?[\s-]*\d{6}$/i.test(part.trim()) || /^(bengaluru|bangalore)$/i.test(part.trim()) || sameText(part, address.city);
  const streetParts = address.houseAndStreet
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !sameText(part, address.area) && !isCityOrPincode(part));
  return [...streetParts, address.area, `${address.city} ${address.pincode}`.trim()].filter((part) => part.trim()).join(", ");
}

// Adds an address and returns its id. The first address, or shouldBeDefault, becomes the default.
export function addAddress(details: AddressDetails, shouldBeDefault: boolean) {
  const newAddressId = `address-${Date.now()}`;
  const newAddress = { ...details, mobileNumber: formatMobileNumber(details.mobileNumber), id: newAddressId };
  changeAddressBook((addressBook) => ({
    addresses: [...addressBook.addresses, newAddress],
    defaultAddressId: shouldBeDefault || addressBook.addresses.length === 0 ? newAddressId : addressBook.defaultAddressId,
  }));
  return newAddressId;
}

export function updateAddress(addressId: string, details: AddressDetails, shouldBeDefault: boolean) {
  changeAddressBook((addressBook) => ({
    addresses: addressBook.addresses.map((address) =>
      address.id === addressId ? { ...details, mobileNumber: formatMobileNumber(details.mobileNumber), id: addressId } : address,
    ),
    defaultAddressId: shouldBeDefault ? addressId : addressBook.defaultAddressId,
  }));
}

// Removing the default address makes the next one the default.
export function removeAddress(addressId: string) {
  changeAddressBook((addressBook) => {
    const remainingAddresses = addressBook.addresses.filter((address) => address.id !== addressId);
    return {
      addresses: remainingAddresses,
      defaultAddressId:
        addressId === addressBook.defaultAddressId ? (remainingAddresses[0]?.id ?? "") : addressBook.defaultAddressId,
    };
  });
}

export function setDefaultAddress(addressId: string) {
  changeAddressBook((addressBook) => ({ ...addressBook, defaultAddressId: addressId }));
}
