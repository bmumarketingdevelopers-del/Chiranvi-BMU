"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./refer-a-friend-section.module.css";

/*
  Top part of the shared site footer (site-footer.tsx shows it on every page above the footer links):
  green "Refer a Friend & Get 7 Days of Milk Free!" banner
  with a "Claim Now" button and two app screens on the right (the purity screen with products,
  and the referral rewards screen).
  The app screens are pictures from the design; the products on the purity screen are the site's
  product images placed on top. "Claim Now" links to the products page until referrals exist.
  Scroll reveal: when the section scrolls into view, the banner fades and slides up.
  Line drawing: every time the section comes into view, the thin white lines draw themselves (top
  circle, then the long wave, then the bottom circle) and the leaf appears; when it leaves the screen
  they reset, so they draw again next time.
*/

export default function ReferAFriendSection() {
  const sectionRef = useRef<HTMLElement>(null);
  // "visible": shown normally (also the server-rendered state, so nothing is hidden without JavaScript).
  // "waiting": hidden, ready to animate. "revealed": animated into view.
  const [revealState, setRevealState] = useState<"visible" | "waiting" | "revealed">("visible");
  // White lines: "drawn" (server-rendered / reduced motion), "hidden" (off screen, ready) or "drawing".
  const [lineDrawState, setLineDrawState] = useState<"drawn" | "hidden" | "drawing">("drawn");

  // Draw the lines each time the section comes into view; reset them when it leaves.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lineObserver = new IntersectionObserver(
      ([sectionVisibility]) => setLineDrawState(sectionVisibility.isIntersecting ? "drawing" : "hidden"),
      { threshold: 0.35 },
    );
    lineObserver.observe(section);
    return () => lineObserver.disconnect();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already clearly on screen when the page opens (not just peeking in at the bottom): just show it.
    if (section.getBoundingClientRect().top < window.innerHeight - 100) return;

    setRevealState("waiting");
    const revealObserver = new IntersectionObserver(
      ([sectionVisibility]) => {
        if (sectionVisibility.isIntersecting) {
          setRevealState("revealed");
          revealObserver.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    revealObserver.observe(section);
    return () => revealObserver.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`${styles["refer-a-friend-section"]} ${
        revealState === "visible" ? "" : styles[`refer-a-friend-section-${revealState}`]
      }`}
      aria-labelledby="refer-a-friend-heading"
    >
      <div className={`${styles["refer-a-friend-banner"]} ${styles[`refer-a-friend-lines-${lineDrawState}`]}`}>
        {/*
          Thin white line pattern traced from the design (drawn on the banner's 930 x 341 grid):
          a circle at the top, a long wave rising from the bottom towards the top right,
          and a circle edge at the bottom left. A small leaf sits on the right.
        */}
        <svg
          viewBox="0 0 930 341"
          preserveAspectRatio="xMidYMid slice"
          className={styles["refer-a-friend-background-line-pattern"]}
          aria-hidden="true"
        >
          {/* pathLength="1" lets the CSS draw each line from 0 to its full length, whatever its real length */}
          <circle cx="362" cy="-18" r="102" pathLength={1} className={styles["refer-a-friend-line-top-circle"]} />
          <circle cx="31" cy="374" r="123" pathLength={1} className={styles["refer-a-friend-line-bottom-circle"]} />
          <path
            d="M228 341C300 300 382 302 452 268S560 196 604 168S760 58 870 84Q906 96 930 118"
            pathLength={1}
            className={styles["refer-a-friend-line-wave"]}
          />
        </svg>
        <svg viewBox="0 0 40 20" className={styles["refer-a-friend-background-leaf"]} aria-hidden="true">
          <path d="M1 18C8 4 24 1 39 2 33 14 19 20 1 18Z" />
        </svg>

        <div className={styles["refer-a-friend-text-block"]}>
          <h2 id="refer-a-friend-heading" className={styles["refer-a-friend-heading"]}>
            Refer a Friend &amp;
            <br />
            <span className={styles["refer-a-friend-heading-highlight"]}>Get 7 Days</span> of Milk Free!
          </h2>
          <p className={styles["refer-a-friend-description"]}>
            Invite your friends to Chiranvi Farms. When they make <br />a purchase, enjoy 7 days of fresh milk{" "}
            <strong>absolutely free!</strong>
          </p>
          <Link href="/products" className={styles["refer-a-friend-claim-button"]}>
            <span className={styles["refer-a-friend-claim-button-title"]}>Claim Now</span>
            <span className={styles["refer-a-friend-claim-button-subtitle"]}>Refer &amp; Get Rewarded</span>
          </Link>
        </div>

        {/* Purity app screen, with the products drawn on top of its empty middle */}
        <div className={styles["refer-a-friend-purity-screen"]} aria-hidden="true">
          <Image
            src="/images/refer-a-friend/purity-promise-app-screen.webp"
            alt=""
            width={873}
            height={1228}
            // Mostly small text: served as the original file, so it is never resized or recompressed.
            unoptimized
            className={styles["refer-a-friend-screen-image"]}
          />
          <Image
            src="/images/products/desi-cow-milk-bottle.webp"
            alt=""
            width={1188}
            height={2312}
            sizes="(max-width: 600px) 20vw, 120px"
            className={styles["refer-a-friend-purity-screen-milk-bottle"]}
          />
          <Image
            src="/images/products/desi-ghee-jar.webp"
            alt=""
            width={1524}
            height={2204}
            sizes="(max-width: 600px) 40vw, 200px"
            className={styles["refer-a-friend-purity-screen-ghee-jar"]}
          />
          <Image
            src="/images/categories/paneer-category.webp"
            alt=""
            width={428}
            height={288}
            sizes="(max-width: 600px) 45vw, 220px"
            className={styles["refer-a-friend-purity-screen-paneer"]}
          />
        </div>

        {/* Referral rewards app screen */}
        <div className={styles["refer-a-friend-rewards-screen"]} aria-hidden="true">
          <Image
            src="/images/refer-a-friend/referral-rewards-app-screen-editable-text.webp"
            alt=""
            width={939}
            height={1656}
            // Mostly small text: served as the original file, so it is never resized or recompressed.
            unoptimized
            className={styles["refer-a-friend-screen-image"]}
          />
          {/* Text written over the picture (the picture has these areas left blank, so they can be edited) */}
          <span className={styles["refer-a-friend-rewards-screen-user-name"]}>Harish</span>
          <span className={styles["refer-a-friend-rewards-screen-jersey-milk-label"]}>Jersey Milk</span>
          <svg viewBox="0 0 24 24" className={styles["refer-a-friend-rewards-screen-menu-icon"]}>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </div>
      </div>
    </section>
  );
}
