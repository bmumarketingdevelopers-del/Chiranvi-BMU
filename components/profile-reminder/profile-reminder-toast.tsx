"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { rememberPageAfterLogin, useIsLoginStatusKnown, useLoggedInMobileNumber } from "@/components/login/login-status";
import { BULK_ORDER_POPUP_CLOSED_EVENT } from "@/components/bulk-order/bulk-order-popup";
import { useCustomerProfile, useIsCustomerProfileKnown } from "@/store/customer-profiles-store";
import styles from "./profile-reminder-toast.module.css";

/*
  A notification on the right side of the customer pages (mounted once in app/layout.tsx), after the bulk
  order pop-up:
  - not logged in: "Log in for a better experience" (Log in opens the login, which comes back to this page);
  - logged in without a saved Profile: "Complete your profile" (opens the Profile page, /account);
  - logged in with a saved Profile: nothing.
  Timing: the first one 10 seconds after the bulk order pop-up is first closed (each page load starts with
  the bulk order pop-up, 5 seconds in). It slides out by itself after 8 seconds (× closes
  it sooner), then comes back 20 seconds later, again and again, until the visitor logs in / saves the
  profile. While the bulk order pop-up is open (its second showing) it waits, and starts its count again
  when that closes, so the two never show together.
  Never on /admin, /login, /cart or /checkout, and "Complete your profile" not on the Profile page itself.
*/

const FIRST_AFTER_MS = 10_000;
const AGAIN_AFTER_MS = 20_000;
const SHOWN_FOR_MS = 8_000;
const HIDDEN_PAGE_STARTS = ["/admin", "/login", "/cart", "/checkout"];
const PROFILE_PAGE = "/account";

type Reminder = "log-in" | "complete-profile";

const REMINDER_WORDS: Record<Reminder, { title: string; text: string; button: string }> = {
  "log-in": {
    title: "Log in for a better experience",
    text: "Log in to save your cart, track your orders and check out faster.",
    button: "Log in",
  },
  "complete-profile": {
    title: "Complete your profile",
    text: "Your profile isn’t finished yet. Add your details for faster checkout and on-time deliveries.",
    button: "Complete profile",
  },
};

export default function ProfileReminderToast() {
  const pathname = usePathname();
  const mobileNumber = useLoggedInMobileNumber();
  const isLoginStatusKnown = useIsLoginStatusKnown();
  const profile = useCustomerProfile(mobileNumber);
  const isProfileKnown = useIsCustomerProfileKnown(mobileNumber);

  // Which notification this visitor needs (none until the login and the profile have been read)
  let reminder: Reminder | null = null;
  if (isLoginStatusKnown && !mobileNumber) reminder = "log-in";
  else if (mobileNumber && isProfileKnown && !profile) reminder = "complete-profile";
  const isAllowedPage =
    !HIDDEN_PAGE_STARTS.some((start) => pathname.startsWith(start)) && !(reminder === "complete-profile" && pathname === PROFILE_PAGE);

  /*
    Waits for the bulk order pop-up: its first close starts the count. bulkClosings counts its closes, so
    each close starts the count again.
  */
  const [isBulkPopupDone, setIsBulkPopupDone] = useState(false);
  const [bulkClosings, setBulkClosings] = useState(0);
  useEffect(() => {
    const onBulkPopupClosed = () => {
      setIsBulkPopupDone(true);
      setBulkClosings((count) => count + 1);
    };
    window.addEventListener(BULK_ORDER_POPUP_CLOSED_EVENT, onBulkPopupClosed);
    return () => window.removeEventListener(BULK_ORDER_POPUP_CLOSED_EVENT, onBulkPopupClosed);
  }, []);

  const [isShown, setIsShown] = useState(false);
  const [timesShown, setTimesShown] = useState(0);
  const isActive = isBulkPopupDone && reminder !== null && isAllowedPage;

  // Hidden: shows after 10 s (the first time) or 20 s (after that). Shown: hides itself after 8 s.
  useEffect(() => {
    if (!isActive) return;
    const timer = isShown
      ? window.setTimeout(() => setIsShown(false), SHOWN_FOR_MS)
      : window.setTimeout(
          () => {
            // The bulk order pop-up is open (its second showing): wait; its close starts the count again
            if (document.querySelector('[aria-labelledby="bulk-order-title"]')) return;
            setIsShown(true);
            setTimesShown((count) => count + 1);
          },
          timesShown === 0 ? FIRST_AFTER_MS : AGAIN_AFTER_MS,
        );
    return () => window.clearTimeout(timer);
  }, [isActive, isShown, timesShown, bulkClosings]);

  if (!isActive || !isShown || !reminder) return null;
  const words = REMINDER_WORDS[reminder];

  return (
    <aside className={styles["profile-reminder-toast"]} role="status" aria-labelledby="profile-reminder-title">
      <span className={styles["profile-reminder-icon"]} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 20c.8-3.6 3.9-6 7.5-6s6.7 2.4 7.5 6" />
        </svg>
      </span>
      <div className={styles["profile-reminder-words"]}>
        <p id="profile-reminder-title" className={styles["profile-reminder-title"]}>
          {words.title}
        </p>
        <p className={styles["profile-reminder-text"]}>{words.text}</p>
        <Link
          href={reminder === "log-in" ? "/login" : PROFILE_PAGE}
          className={styles["profile-reminder-link"]}
          onClick={() => {
            // After logging in, the login comes back to the page the visitor was on
            if (reminder === "log-in") rememberPageAfterLogin(window.location.pathname + window.location.search);
            setIsShown(false);
          }}
        >
          {words.button}
        </Link>
      </div>
      <button type="button" className={styles["profile-reminder-close-button"]} aria-label="Close" onClick={() => setIsShown(false)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </aside>
  );
}
