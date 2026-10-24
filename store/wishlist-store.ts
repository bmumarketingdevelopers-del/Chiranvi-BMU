import { useSyncExternalStore } from "react";

/*
  Wishlist: the products hearted on the All products page, shown on the account's "Wishlist" page.
  Each item keeps what that page needs (so it still shows if the product changes later). Saved in this
  browser (like the login), until accounts are kept in Supabase.
*/

export type WishlistItem = {
  itemId: string; // the card's id: "<slug>" or "<slug>-<packId>"
  slug: string; // product page: /products/<slug>
  name: string;
  packLabel: string; // "1 litre"
  price: number;
  originalPrice?: number;
  imageSource: string;
  imageWidth: number;
  imageHeight: number;
};

const STORAGE_KEY = "chiranvi-wishlist";
const emptyWishlist: WishlistItem[] = [];
let wishlist: WishlistItem[] | null = null;
const listeners = new Set<() => void>();

function getWishlist() {
  if (typeof window === "undefined") return emptyWishlist;
  if (!wishlist) {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
      wishlist = Array.isArray(saved) ? saved : [];
    } catch {
      wishlist = [];
    }
  }
  return wishlist as WishlistItem[];
}

function save(items: WishlistItem[]) {
  wishlist = items;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage blocked: the wishlist lasts until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  function followOtherTabs(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    wishlist = null;
    onChange();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

export function useWishlist() {
  return useSyncExternalStore(subscribe, getWishlist, () => emptyWishlist);
}

// Heart: adds the item, or takes it out when it is already there
export function toggleWishlistItem(item: WishlistItem) {
  const items = getWishlist();
  save(items.some((saved) => saved.itemId === item.itemId) ? items.filter((saved) => saved.itemId !== item.itemId) : [...items, item]);
}

export function removeWishlistItem(itemId: string) {
  save(getWishlist().filter((saved) => saved.itemId !== itemId));
}
