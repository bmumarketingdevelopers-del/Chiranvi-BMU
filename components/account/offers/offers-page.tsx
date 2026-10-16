"use client";

import { useState } from "react";
import { AccountPageHeading } from "../account-dashboard-layout";
import styles from "./offers-page.module.css";

/*
  "My Offers" dashboard page (design): filter buttons (All / Available / Used / Expired), the available
  coupons as tickets (copy the code, Apply or Share) and the used and expired coupons, faded.
  The coupons are placeholders from the design. There is no checkout yet, so "Apply" only marks the
  coupon as chosen (one at a time) until the page is refreshed.
*/

type CouponFilter = "all" | "available" | "used" | "expired";

const couponFilters: { id: CouponFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "used", label: "Used" },
  { id: "expired", label: "Expired" },
];

const availableCoupons = [
  {
    code: "FLAT100",
    title: "₹50 off",
    description: "On orders above ₹499",
    validity: "Valid till 20 Oct",
    iconColour: "green",
    action: "apply",
  },
  {
    code: "GHEE20",
    title: "20% off",
    description: "A2 Desi Ghee · up to ₹650 off",
    validity: "Valid till 25 Oct",
    iconColour: "yellow",
    action: "apply",
  },
  {
    code: "FREEDEL",
    title: "Free delivery",
    description: "On orders below ₹499",
    validity: "3 uses left",
    iconColour: "blue",
    action: "apply",
  },
  {
    code: "PRIYA100",
    title: "₹100 credit",
    description: "For every friend who subscribes",
    validity: "No expiry",
    iconColour: "green",
    action: "share",
  },
] as const;

const usedAndExpiredCoupons = [
  { code: "WELCOME50", title: "₹50 off", description: "Your first order", status: "used", statusText: "Used on 02 Oct" },
  { code: "DIWALI25", title: "25% off", description: "Festive ghee offer", status: "expired", statusText: "Expired 20 Sep" },
] as const;

function CouponTagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12V4h8l10 10-8 8L3 12Z" />
      <path d="M7.5 7.5h.01" />
    </svg>
  );
}

export default function OffersPage() {
  const [selectedFilter, setSelectedFilter] = useState<CouponFilter>("all");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  // The code just copied or shared, for the short "Copied" note on its button.
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);

  const isAvailableShown = selectedFilter === "all" || selectedFilter === "available";
  const shownUsedAndExpiredCoupons = usedAndExpiredCoupons.filter(
    (coupon) => selectedFilter === "all" || coupon.status === selectedFilter,
  );

  async function copyCouponCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCouponCode(code);
      window.setTimeout(() => setCopiedCouponCode((shownCode) => (shownCode === code ? null : shownCode)), 1500);
    } catch {
      // Copying blocked by the browser: the code is still visible to copy by hand.
    }
  }

  // Share: the phone's share menu where there is one; otherwise the invite text is copied.
  async function shareReferralCode(code: string) {
    const inviteText = `Get fresh A2 milk from Chiranvi Farm. Use my code ${code} when you subscribe.`;
    if (navigator.share) {
      try {
        await navigator.share({ text: inviteText });
      } catch {
        // Share menu closed: nothing to do.
      }
      return;
    }
    await copyCouponCode(code);
  }

  return (
    <>
      <AccountPageHeading
        title="My Offers"
        description="Coupons and savings on your Chiranvi orders."
        action={
          <div className={styles["offers-filter-buttons"]} role="group" aria-label="Show coupons">
            {couponFilters.map((couponFilter) => (
              <button
                key={couponFilter.id}
                type="button"
                aria-pressed={selectedFilter === couponFilter.id}
                className={`${styles["offers-filter-button"]} ${
                  selectedFilter === couponFilter.id ? styles["offers-filter-button-selected"] : ""
                }`}
                onClick={() => setSelectedFilter(couponFilter.id)}
              >
                {couponFilter.label}
              </button>
            ))}
          </div>
        }
      />

      {isAvailableShown && (
        <section aria-labelledby="available-coupons-heading">
          <h2 id="available-coupons-heading" className={styles["offers-section-heading"]}>
            Available coupons
          </h2>
          <ul className={styles["offers-coupon-grid"]}>
            {availableCoupons.map((coupon) => {
              const isApplied = appliedCouponCode === coupon.code;
              return (
                <li key={coupon.code} className={styles["offers-coupon-ticket"]}>
                  <span
                    className={`${styles["offers-coupon-icon-box"]} ${styles[`offers-coupon-icon-box-${coupon.iconColour}`]}`}
                  >
                    <CouponTagIcon />
                  </span>

                  <div className={styles["offers-coupon-details"]}>
                    <div className={styles["offers-coupon-title-row"]}>
                      <h3 className={styles["offers-coupon-title"]}>{coupon.title}</h3>
                      <p className={styles["offers-coupon-validity"]}>{coupon.validity}</p>
                    </div>
                    <p className={styles["offers-coupon-description"]}>{coupon.description}</p>

                    <div className={styles["offers-coupon-bottom-row"]}>
                      <button
                        type="button"
                        aria-label={`Copy code ${coupon.code}`}
                        className={styles["offers-coupon-code"]}
                        onClick={() => copyCouponCode(coupon.code)}
                      >
                        {copiedCouponCode === coupon.code ? "Copied" : coupon.code}
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="8" y="8" width="12" height="12" rx="2" />
                          <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
                        </svg>
                      </button>

                      {coupon.action === "share" ? (
                        <button
                          type="button"
                          className={styles["offers-coupon-action-button"]}
                          onClick={() => shareReferralCode(coupon.code)}
                        >
                          Share
                        </button>
                      ) : (
                        <button
                          type="button"
                          aria-pressed={isApplied}
                          className={`${styles["offers-coupon-action-button"]} ${
                            isApplied ? styles["offers-coupon-action-button-applied"] : ""
                          }`}
                          onClick={() => setAppliedCouponCode(isApplied ? null : coupon.code)}
                        >
                          {isApplied ? "Applied ✓" : "Apply"}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {shownUsedAndExpiredCoupons.length > 0 && (
        <section aria-labelledby="used-coupons-heading">
          <h2 id="used-coupons-heading" className={styles["offers-section-heading"]}>
            {selectedFilter === "used" ? "Used" : selectedFilter === "expired" ? "Expired" : "Used and expired"}
          </h2>
          <ul className={styles["offers-coupon-grid"]}>
            {shownUsedAndExpiredCoupons.map((coupon) => (
              <li key={coupon.code} className={`${styles["offers-coupon-ticket"]} ${styles["offers-coupon-ticket-faded"]}`}>
                <span className={`${styles["offers-coupon-icon-box"]} ${styles["offers-coupon-icon-box-grey"]}`}>
                  <CouponTagIcon />
                </span>
                <div className={styles["offers-coupon-details"]}>
                  <div className={styles["offers-coupon-title-row"]}>
                    <h3 className={styles["offers-faded-coupon-title"]}>
                      {coupon.title} · {coupon.code}
                    </h3>
                    <span className={styles["offers-coupon-status-badge"]}>{coupon.statusText}</span>
                  </div>
                  <p className={styles["offers-coupon-description"]}>{coupon.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
