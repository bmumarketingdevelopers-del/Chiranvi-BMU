import { mergeSharedValues } from "./shared-data-merge";

/*
  Keeps the shared data the same in every browser, until the database (Supabase) is connected.
  The stores keep saving to this browser's storage (localStorage) as before; this file:
  - sends every save of a shared key to the website's server (app/api/shared-data/route.ts);
  - asks the server every 2 seconds (and when the tab comes back into view) for changes made in other
    browsers, saves them here and tells the stores (the same "storage" event they already follow for
    other tabs), so pages update by themselves;
  - on the first visit after this was added, merges what this browser already had with the server's
    copy (by ID), so nobody's customers or orders are lost.
  Shared: customers and their profiles and addresses, both order lists, products, product pages and
  categories, the panel's staff, roles and owner, and all the panel's other data (chiranvi-admin-…).
  Not shared (each browser its own): who is logged in, the cart and the wishlist.
  Later the stores read and write Supabase instead, and this file goes.
*/

const SHARED_KEYS = new Set([
  "chiranvi-customer-profiles",
  "chiranvi-orders",
  "chiranvi-products",
  "chiranvi-restock-notices",
  "chiranvi-product-categories",
  "chiranvi-product-pages",
  "chiranvi-hidden-product-pages",
  "chiranvi-staff-members",
  "chiranvi-panel-roles",
  "chiranvi-owner",
  "chiranvi-coupons",
  "chiranvi-coupon-redemptions",
]);
const SHARED_PREFIXES = ["chiranvi-admin-", "chiranvi-addresses-"];

export function isSharedKey(key: string) {
  return SHARED_KEYS.has(key) || SHARED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

const ENDPOINT = "/api/shared-data";
const CHECK_EVERY_MS = 2000;

let lastVersion = 0;
// The server's version of each key this browser last saw (sent with a save, so the server can merge)
const keyVersions = new Map<string, number>();
let isApplyingFromServer = false;
let hasStarted = false;

const originalSetItem = typeof window !== "undefined" ? Storage.prototype.setItem : null;
const originalRemoveItem = typeof window !== "undefined" ? Storage.prototype.removeItem : null;

// Saves a value here without sending it back, and tells the stores it changed
function applyFromServer(key: string, value: string | null) {
  if (window.localStorage.getItem(key) === value) return;
  isApplyingFromServer = true;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage full or blocked: this browser keeps what it had.
  } finally {
    isApplyingFromServer = false;
  }
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: value, storageArea: window.localStorage }));
}

async function sendToServer(key: string, value: string | null) {
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value, baseVersion: keyVersions.get(key) ?? 0 }),
    });
    if (!response.ok) return;
    const result = (await response.json()) as { version: number; value: string | null };
    keyVersions.set(key, result.version);
    // The server merged it with another browser's change: take the merged copy
    if (result.value !== value) applyFromServer(key, result.value);
  } catch {
    // Server not reachable: the change stays in this browser and goes with its next save.
  }
}

async function checkForChanges(isFirstCheck = false) {
  try {
    const response = await fetch(`${ENDPOINT}?since=${lastVersion}`, { cache: "no-store" });
    if (!response.ok) return;
    const result = (await response.json()) as { version: number; entries: { key: string; value: string | null; version: number }[] };
    const keysOnServer = new Set<string>();
    for (const entry of result.entries) {
      keysOnServer.add(entry.key);
      keyVersions.set(entry.key, entry.version);
      if (!isFirstCheck) {
        applyFromServer(entry.key, entry.value);
        continue;
      }
      // First visit: keep this browser's own records too (merged by ID), and send the merged copy back
      const localValue = window.localStorage.getItem(entry.key);
      if (localValue !== null && entry.value !== null && localValue !== entry.value) {
        const merged = mergeSharedValues(entry.value, localValue);
        applyFromServer(entry.key, merged);
        if (merged !== entry.value) void sendToServer(entry.key, merged);
      } else {
        applyFromServer(entry.key, entry.value);
      }
    }
    lastVersion = Math.max(lastVersion, result.version);
    if (isFirstCheck) {
      // Shared data only this browser has: send it to the server
      for (let index = 0; index < window.localStorage.length; index++) {
        const key = window.localStorage.key(index);
        if (key && isSharedKey(key) && !keysOnServer.has(key)) void sendToServer(key, window.localStorage.getItem(key));
      }
    }
  } catch {
    // Server not reachable: try again at the next check.
  }
}

function start() {
  if (hasStarted || typeof window === "undefined" || !originalSetItem || !originalRemoveItem) return;
  // Once per page, even if this file is loaded again (development reloads)
  const page = window as typeof window & { chiranviSharedDataSync?: boolean };
  if (page.chiranviSharedDataSync) return;
  page.chiranviSharedDataSync = true;
  hasStarted = true;
  const setItem = originalSetItem;
  const removeItem = originalRemoveItem;
  // Every save of a shared key in this browser also goes to the server
  Storage.prototype.setItem = function sharedSetItem(this: Storage, key: string, value: string) {
    setItem.call(this, key, value);
    if (this === window.localStorage && !isApplyingFromServer && isSharedKey(key)) void sendToServer(key, value);
  };
  Storage.prototype.removeItem = function sharedRemoveItem(this: Storage, key: string) {
    removeItem.call(this, key);
    if (this === window.localStorage && !isApplyingFromServer && isSharedKey(key)) void sendToServer(key, null);
  };
  void checkForChanges(true);
  window.setInterval(() => {
    if (document.visibilityState === "visible") void checkForChanges();
  }, CHECK_EVERY_MS);
  window.addEventListener("focus", () => void checkForChanges());
}

start();
