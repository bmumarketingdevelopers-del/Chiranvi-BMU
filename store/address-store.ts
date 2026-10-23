import { useSyncExternalStore } from "react";

/*
  The customer's saved delivery addresses and which one is the default, shared by My Addresses
  (account dashboard) and the address step of the cart checkout.
  The first two are placeholders from the design. Saved in this browser (localStorage), like the
  cart and orders, so changes stay after a refresh.
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

const placeholderAddressBook: AddressBook = {
  addresses: [
    {
      id: "home",
      label: "Home",
      name: "Priya Sharma",
      mobileNumber: "+91 98450 12345",
      houseAndStreet: "#1312, Prestige Lakeside Habitat",
      area: "Varthur",
      city: "Bengaluru",
      pincode: "560087",
    },
    {
      id: "work",
      label: "Work",
      name: "Priya Sharma",
      mobileNumber: "+91 98450 12345",
      houseAndStreet: "4th floor, Embassy Tech Village, Block B",
      area: "Bellandur",
      city: "Bengaluru",
      pincode: "560103",
    },
  ],
  defaultAddressId: "home",
};

const ADDRESS_STORAGE_KEY = "chiranvi-addresses";
let addressBook = placeholderAddressBook;
let hasReadSavedAddresses = false;
const addressBookListeners = new Set<() => void>();

function getAddressBook() {
  if (!hasReadSavedAddresses && typeof window !== "undefined") {
    hasReadSavedAddresses = true;
    try {
      const saved = JSON.parse(window.localStorage.getItem(ADDRESS_STORAGE_KEY) ?? "null");
      if (saved && Array.isArray(saved.addresses)) addressBook = saved;
    } catch {
      // Nothing saved, or storage blocked: the placeholder addresses.
    }
  }
  return addressBook;
}

function saveAddressBook(newAddressBook: AddressBook) {
  addressBook = newAddressBook;
  hasReadSavedAddresses = true;
  try {
    window.localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(newAddressBook));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  addressBookListeners.forEach((onChange) => onChange());
}

function subscribeToAddressBook(onChange: () => void) {
  addressBookListeners.add(onChange);
  return () => {
    addressBookListeners.delete(onChange);
  };
}

// { addresses, defaultAddressId }
export function useAddressBook() {
  return useSyncExternalStore(
    subscribeToAddressBook,
    getAddressBook,
    () => placeholderAddressBook,
  );
}

// "+919845012345" or "98450 12345" -> "+91 98450 12345"
function formatMobileNumber(mobileNumber: string) {
  const digits = mobileNumber.replace(/\D/g, "").slice(-10);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

// "#1312, Prestige Lakeside Habitat, Varthur, Bengaluru 560087"
export function formatAddressLine(address: AddressDetails) {
  return `${address.houseAndStreet}, ${address.area}, ${address.city} ${address.pincode}`;
}

// Adds an address and returns its id. The first address, or shouldBeDefault, becomes the default.
export function addAddress(details: AddressDetails, shouldBeDefault: boolean) {
  const addressBook = getAddressBook();
  const newAddressId = `address-${Date.now()}`;
  const newAddress = { ...details, mobileNumber: formatMobileNumber(details.mobileNumber), id: newAddressId };
  saveAddressBook({
    addresses: [...addressBook.addresses, newAddress],
    defaultAddressId:
      shouldBeDefault || addressBook.addresses.length === 0 ? newAddressId : addressBook.defaultAddressId,
  });
  return newAddressId;
}

export function updateAddress(addressId: string, details: AddressDetails, shouldBeDefault: boolean) {
  const addressBook = getAddressBook();
  saveAddressBook({
    addresses: addressBook.addresses.map((address) =>
      address.id === addressId
        ? { ...details, mobileNumber: formatMobileNumber(details.mobileNumber), id: addressId }
        : address,
    ),
    defaultAddressId: shouldBeDefault ? addressId : addressBook.defaultAddressId,
  });
}

// Removing the default address makes the next one the default.
export function removeAddress(addressId: string) {
  const addressBook = getAddressBook();
  const remainingAddresses = addressBook.addresses.filter((address) => address.id !== addressId);
  saveAddressBook({
    addresses: remainingAddresses,
    defaultAddressId:
      addressId === addressBook.defaultAddressId ? (remainingAddresses[0]?.id ?? "") : addressBook.defaultAddressId,
  });
}

export function setDefaultAddress(addressId: string) {
  saveAddressBook({ ...getAddressBook(), defaultAddressId: addressId });
}
