"use client";

import { useEffect, useState } from "react";
import LoginPanel from "./login-panel";
import styles from "./login-bottom-sheet.module.css";

/*
  Phone login: instead of leaving the landing page, links to /login (the profile icon in the
  bottom bar, "Add to cart") open the login as a bottom sheet with a curved top edge.
  The landing page stays visible above it, lightly dimmed. Tapping the dimmed area or the
  close button closes the sheet.
  Only in the phone layout (chosen by the landing page script); on desktop the links still open /login.
*/

export default function LoginBottomSheet() {
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);

  // Catch taps on any /login link before the link itself handles them, but only in the phone layout.
  useEffect(() => {
    function openLoginSheetInsteadOfLoginPage(event: MouseEvent) {
      const loginLink = (event.target as Element | null)?.closest?.('a[href="/login"]');
      const isPhoneLayout = !!document.querySelector('style[data-landing-layout="mobile"]');
      if (!loginLink || !isPhoneLayout) return;
      event.preventDefault();
      event.stopPropagation();
      setIsLoginSheetOpen(true);
    }
    document.addEventListener("click", openLoginSheetInsteadOfLoginPage, true);
    return () => document.removeEventListener("click", openLoginSheetInsteadOfLoginPage, true);
  }, []);

  // While open: the page behind does not scroll, and Escape closes the sheet.
  useEffect(() => {
    if (!isLoginSheetOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsLoginSheetOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isLoginSheetOpen]);

  if (!isLoginSheetOpen) return null;

  return (
    <div className={styles["login-bottom-sheet-overlay"]} data-lenis-prevent>
      <button
        type="button"
        aria-label="Close login"
        className={styles["login-bottom-sheet-dimmed-page"]}
        onClick={() => setIsLoginSheetOpen(false)}
      />
      <div role="dialog" aria-modal="true" aria-labelledby="login-card-heading" className={styles["login-bottom-sheet"]}>
        <LoginPanel layout="bottom-sheet" onClose={() => setIsLoginSheetOpen(false)} />
      </div>
    </div>
  );
}
