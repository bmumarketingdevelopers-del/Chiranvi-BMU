import { useSyncExternalStore } from "react";

/*
  Login memory, until the real OTP login service is connected.
  After "Verify & log in" the logged-in mobile number is saved in this browser (localStorage), so the
  login stays after a refresh and after closing and reopening the tab. It is forgotten only on Log out.
  Other open tabs of the site follow along (the "storage" event).
  This is not secure login: it decides where the cart and profile icons lead, whether the account
  dashboard can be opened, and (with store/staff-access-store.ts) who can open the Chiranvi Panel.

  Page after login: the cart icon, profile icon and account pages note where the visitor wanted to go,
  so the login opens that page afterwards (the cart page when nothing was noted).
*/

const LOGIN_STORAGE_KEY = "chiranvi-login";

// The logged-in mobile number, 10 digits (for example "8754852810"), or null when logged out.
let loggedInMobileNumber: string | null = null;
let hasReadSavedLogin = false;
let pageAfterLogin: string | null = null;
const loginStatusListeners = new Set<() => void>();

// Reads the saved login once, the first time it is needed in the browser.
function readSavedLogin() {
  if (hasReadSavedLogin || typeof window === "undefined") return;
  hasReadSavedLogin = true;
  try {
    const savedLogin = JSON.parse(window.localStorage.getItem(LOGIN_STORAGE_KEY) ?? "null");
    loggedInMobileNumber = typeof savedLogin?.mobileNumber === "string" ? savedLogin.mobileNumber : null;
  } catch {
    loggedInMobileNumber = null;
  }
}

function announceLoginStatusChange() {
  loginStatusListeners.forEach((onChange) => onChange());
}

// mobileNumber: the 10 digits that were typed on the login page.
export function rememberLogin(mobileNumber: string) {
  loggedInMobileNumber = mobileNumber;
  hasReadSavedLogin = true;
  try {
    window.localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify({ mobileNumber }));
  } catch {
    // Storage blocked (private window): the login still works until the page is refreshed.
  }
  announceLoginStatusChange();
}

export function logOut() {
  loggedInMobileNumber = null;
  hasReadSavedLogin = true;
  pageAfterLogin = null;
  try {
    window.localStorage.removeItem(LOGIN_STORAGE_KEY);
  } catch {
    // Nothing saved to forget.
  }
  announceLoginStatusChange();
}

// Where to go once the login finishes (for example "/account" when the profile icon was clicked).
export function rememberPageAfterLogin(pagePath: string) {
  pageAfterLogin = pagePath;
}

// The noted page (or null), forgotten once read.
export function takePageAfterLogin() {
  const notedPage = pageAfterLogin;
  pageAfterLogin = null;
  return notedPage;
}

function subscribeToLoginStatus(onChange: () => void) {
  loginStatusListeners.add(onChange);
  // A login or logout in another tab of the site
  function followOtherTabs(event: StorageEvent) {
    if (event.key !== LOGIN_STORAGE_KEY) return;
    hasReadSavedLogin = false;
    readSavedLogin();
    onChange();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    loginStatusListeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

function getLoggedInMobileNumber() {
  readSavedLogin();
  return loggedInMobileNumber;
}

// The logged-in mobile number (10 digits) or null. On the server (and while the page first loads) null.
export function useLoggedInMobileNumber() {
  return useSyncExternalStore(subscribeToLoginStatus, getLoggedInMobileNumber, () => null);
}

// True once the user has logged in (until they log out). On the server it is false.
export function useIsLoggedIn() {
  return useLoggedInMobileNumber() !== null;
}

/*
  False on the server and while the page is first being set up in the browser, true afterwards.
  Pages that send logged-out visitors away wait for this, so a refresh never sends a logged-in
  visitor to the login before the saved login has been read.
*/
export function useIsLoginStatusKnown() {
  return useSyncExternalStore(
    subscribeToLoginStatus,
    () => true,
    () => false,
  );
}
