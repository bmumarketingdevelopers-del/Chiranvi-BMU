import { useSyncExternalStore } from "react";

/*
  Placeholder login memory, until the real OTP login service is connected.
  After "Verify & log in", the login is remembered only in the open page's memory: it stays while
  moving between pages of the site, and is forgotten when the page is refreshed or the tab is closed
  (the user is asked to log in again). This is not secure login: it only decides where the cart and
  profile icons lead, and whether the account dashboard can be opened.

  Page after login: the cart icon, profile icon and account pages note where the visitor wanted to go,
  so the login opens that page afterwards (the cart page when nothing was noted).
*/

let isLoggedIn = false;
let pageAfterLogin: string | null = null;
const loginStatusListeners = new Set<() => void>();

function announceLoginStatusChange() {
  loginStatusListeners.forEach((onChange) => onChange());
}

export function rememberLogin() {
  isLoggedIn = true;
  announceLoginStatusChange();
}

export function logOut() {
  isLoggedIn = false;
  pageAfterLogin = null;
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
  return () => {
    loginStatusListeners.delete(onChange);
  };
}

// True once the user has logged in (until the page is refreshed or they log out). On the server it is false.
export function useIsLoggedIn() {
  return useSyncExternalStore(
    subscribeToLoginStatus,
    () => isLoggedIn,
    () => false,
  );
}
