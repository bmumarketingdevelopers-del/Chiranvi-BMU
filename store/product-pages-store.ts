import { useSyncExternalStore } from "react";
import { startingProductPages, type ProductPage } from "@/components/product/product-page-data";

/*
  Product pages shown at /products/<slug>: the starting pages from components/product/product-page-data.ts
  plus the pages added in the Chiranvi Panel ("Add product" on Products & pricing).
  The panel can also edit and delete any page:
  - a panel page: edited or deleted as it is;
  - a starting page: an edit is saved as a changed copy that replaces it, a delete hides it, and
    "Restore original" takes both back (the starting pages themselves stay in the code).
  Saved in this browser: until Supabase is connected, the panel's changes show only in the browser they were
  made in; connecting Supabase means changing only this file (save to / read from the table instead).
*/

const PAGES_STORAGE_KEY = "chiranvi-product-pages"; // pages added or changed in the panel
const HIDDEN_STORAGE_KEY = "chiranvi-hidden-product-pages"; // starting pages deleted in the panel

let savedPages: ProductPage[] | null = null;
let hiddenSlugs: string[] = [];
let allPages: ProductPage[] = startingProductPages;
const listeners = new Set<() => void>();

const startingSlugs = new Set(startingProductPages.map((page) => page.slug));

export function isStartingProductPage(slug: string) {
  return startingSlugs.has(slug);
}

// Starting pages in their order (a changed copy in place of the original, deleted ones left out), then
// the pages added in the panel
function combinePages() {
  const saved = savedPages ?? [];
  allPages = [
    ...startingProductPages
      .filter((page) => !hiddenSlugs.includes(page.slug))
      .map((page) => saved.find((savedPage) => savedPage.slug === page.slug) ?? page),
    ...saved.filter((page) => !startingSlugs.has(page.slug)),
  ];
}

function readSavedPages() {
  if (savedPages) return;
  try {
    const pages = JSON.parse(window.localStorage.getItem(PAGES_STORAGE_KEY) ?? "[]");
    const hidden = JSON.parse(window.localStorage.getItem(HIDDEN_STORAGE_KEY) ?? "[]");
    savedPages = Array.isArray(pages) ? pages : [];
    hiddenSlugs = Array.isArray(hidden) ? hidden : [];
  } catch {
    savedPages = [];
    hiddenSlugs = [];
  }
  combinePages();
}

function getAllPages() {
  if (typeof window === "undefined") return startingProductPages;
  readSavedPages();
  return allPages;
}

// Saves both lists; false when the browser could not (usually uploaded pictures too big for its storage)
function save(newSavedPages: ProductPage[], newHiddenSlugs: string[]) {
  try {
    window.localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(newSavedPages));
    window.localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(newHiddenSlugs));
  } catch {
    return false;
  }
  savedPages = newSavedPages;
  hiddenSlugs = newHiddenSlugs;
  combinePages();
  listeners.forEach((onChange) => onChange());
  return true;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Changes made in the panel in another tab
  function followOtherTabs(event: StorageEvent) {
    if (event.key !== PAGES_STORAGE_KEY && event.key !== HIDDEN_STORAGE_KEY) return;
    savedPages = null;
    onChange();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

// Every product page shown on the website (on the server: the starting pages only)
export function useProductPages() {
  return useSyncExternalStore(subscribe, getAllPages, () => startingProductPages);
}

// Starting pages deleted in the panel (listed there with "Restore original")
function getHiddenSlugs() {
  if (typeof window !== "undefined") readSavedPages();
  return hiddenSlugs;
}

const noHiddenSlugs: string[] = [];
export function useHiddenStartingProductSlugs() {
  return useSyncExternalStore(subscribe, getHiddenSlugs, () => noHiddenSlugs);
}

// A starting page changed in the panel (its saved copy replaces the code's version)
export function isChangedStartingProductPage(slug: string) {
  readSavedPages();
  return startingSlugs.has(slug) && (savedPages ?? []).some((page) => page.slug === slug);
}

export function isProductSlugTaken(slug: string) {
  return getAllPages().some((page) => page.slug === slug) || hiddenSlugs.includes(slug);
}

// A new page from the panel's "Add product"
export function addProductPage(page: ProductPage) {
  readSavedPages();
  return save([...(savedPages ?? []), { ...page, addedInPanel: true }], hiddenSlugs);
}

// An edited page (same address): replaces the panel page, or saves a changed copy of a starting page
export function updateProductPage(page: ProductPage) {
  readSavedPages();
  const saved = savedPages ?? [];
  const isAlreadySaved = saved.some((savedPage) => savedPage.slug === page.slug);
  const updated = { ...page, addedInPanel: !startingSlugs.has(page.slug) };
  return save(
    isAlreadySaved ? saved.map((savedPage) => (savedPage.slug === page.slug ? updated : savedPage)) : [...saved, updated],
    hiddenSlugs,
  );
}

// Delete: a panel page goes; a starting page is hidden (its changed copy goes too)
export function deleteProductPage(slug: string) {
  readSavedPages();
  const saved = (savedPages ?? []).filter((page) => page.slug !== slug);
  return save(saved, startingSlugs.has(slug) && !hiddenSlugs.includes(slug) ? [...hiddenSlugs, slug] : hiddenSlugs);
}

// "Restore original": a starting page back to the code's version (shown again, changes dropped)
export function restoreStartingProductPage(slug: string) {
  readSavedPages();
  return save(
    (savedPages ?? []).filter((page) => page.slug !== slug),
    hiddenSlugs.filter((hiddenSlug) => hiddenSlug !== slug),
  );
}
