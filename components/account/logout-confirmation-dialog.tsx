"use client";

import { useEffect, useRef } from "react";
import styles from "./logout-confirmation-dialog.module.css";

/*
  "Log out?" box (design), shown over the dimmed dashboard when Logout is clicked.
  Cancel, Escape or a click on the dimmed page closes it; "Log out" logs out.
*/

export default function LogoutConfirmationDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  // Latest onCancel, so the Escape listener below is set up only once.
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  // Cancel is focused first (the safe choice), and Escape closes the box.
  useEffect(() => {
    cancelButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCancelRef.current();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <div className={styles["logout-dialog-overlay"]} data-lenis-prevent>
      <button type="button" aria-label="Stay logged in" className={styles["logout-dialog-dimmed-page"]} onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-heading"
        aria-describedby="logout-dialog-description"
        className={styles["logout-dialog"]}
      >
        <span className={styles["logout-dialog-icon-circle"]} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M10 4H5v16h5" />
            <path d="M14 8l4 4-4 4M18 12H9" />
          </svg>
        </span>
        <h2 id="logout-dialog-heading" className={styles["logout-dialog-heading"]}>
          Log out?
        </h2>
        <p id="logout-dialog-description" className={styles["logout-dialog-description"]}>
          Your deliveries will continue as usual.
        </p>
        <div className={styles["logout-dialog-buttons"]}>
          <button ref={cancelButtonRef} type="button" className={styles["logout-dialog-cancel-button"]} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={styles["logout-dialog-confirm-button"]} onClick={onConfirm}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
