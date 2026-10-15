"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./purity-promises-section.module.css";

/*
  Landing page section below the hero: five purity promises in one card
  (Raw Milk, No Adulteration, No Preservatives, No Urea, No Hormones).
  The icons are drawn inline (24 x 24 drawings) to match the design's icons.
  Scroll reveal: when the card scrolls into view, the whole card fades and slides up into place.
*/

// Red "not allowed" circle with a slash, drawn on top of the crossed-out icons.
const notAllowedSign = (
  <>
    <circle cx="12" cy="12" r="10.6" className={styles["purity-promise-icon-red-line"]} />
    <path d="M4.5 4.5l15 15" className={styles["purity-promise-icon-red-line"]} />
  </>
);

const purityPromises: { title: string; description: string; icon: ReactNode }[] = [
  {
    title: "Raw Milk",
    description: "Pure & unprocessed",
    icon: (
      <>
        {/* Milk inside the lower half of the bottle */}
        <rect x="8.4" y="13" width="7.2" height="7.3" rx="0.7" className={styles["purity-promise-icon-yellow-fill"]} />
        {/* Bottle: cap rim, neck, shoulders and body */}
        <path d="M9.2 3.6h5.6" className={styles["purity-promise-icon-green-line"]} />
        <path
          d="M10.1 3.6v2.6L7.6 9.4a2 2 0 0 0-.4 1.2v9.2a1.4 1.4 0 0 0 1.4 1.4h6.8a1.4 1.4 0 0 0 1.4-1.4v-9.2a2 2 0 0 0-.4-1.2l-2.5-3.2V3.6"
          className={styles["purity-promise-icon-green-line"]}
        />
      </>
    ),
  },
  {
    title: "No Adulteration",
    description: "Nothing added, ever",
    icon: (
      <>
        <path
          d="M12 3.2c-3.3 4.1-5.7 7.4-5.7 10.6a5.7 5.7 0 0 0 11.4 0c0-3.2-2.4-6.5-5.7-10.6z"
          className={styles["purity-promise-icon-green-line"]}
        />
        <path d="M9.3 14.4l1.9 1.8 3.6-3.6" className={styles["purity-promise-icon-yellow-line"]} />
      </>
    ),
  },
  {
    title: "No Preservatives",
    description: "Naturally fresh",
    icon: (
      <>
        {/* Liquid in the bottom of the flask */}
        <path d="M8.5 15.3h7l1 1.9a.6.6 0 0 1-.5.9H8a.6.6 0 0 1-.5-.9z" className={styles["purity-promise-icon-yellow-fill"]} />
        {/* Flask: rim, neck and body */}
        <path d="M9.6 6h4.8" className={styles["purity-promise-icon-green-line"]} />
        <path
          d="M10.6 6v4.4l-3.5 6.3a1.3 1.3 0 0 0 1.1 1.9h7.6a1.3 1.3 0 0 0 1.1-1.9l-3.5-6.3V6"
          className={styles["purity-promise-icon-green-line"]}
        />
        {notAllowedSign}
      </>
    ),
  },
  {
    title: "No Urea",
    description: "Safe for your family",
    icon: (
      <>
        {/* Molecule: two open atoms on top joined by a bond, one yellow atom below */}
        <path d="M10.9 9.2h2.2M9.6 11.2l1.3 2.4" className={styles["purity-promise-icon-green-line"]} />
        <circle cx="8.6" cy="9.2" r="2.2" className={styles["purity-promise-icon-green-line"]} />
        <circle cx="15.4" cy="9.2" r="2.2" className={styles["purity-promise-icon-green-line"]} />
        <circle cx="11.8" cy="15.7" r="2.2" className={styles["purity-promise-icon-yellow-fill-green-outline"]} />
        {notAllowedSign}
      </>
    ),
  },
  {
    title: "No Hormones",
    description: "No hormone injections",
    icon: (
      <>
        {/* Syringe from top right to bottom left: plunger handle, barrel with a yellow band, dashed needle */}
        <path d="M15.9 5.2l2.9 2.9M17.35 6.65l-2.4 2.4" className={styles["purity-promise-icon-green-line"]} />
        <path d="M13.9 7.9l2.2 2.2-6.2 6.2-2.2-2.2z" className={styles["purity-promise-icon-green-line"]} />
        <path d="M9.4 12.4l2.2 2.2" className={styles["purity-promise-icon-yellow-band"]} />
        <path d="M7.9 16.1l-.9.9M6.1 17.9l-.8.8" className={styles["purity-promise-icon-green-line"]} />
        {notAllowedSign}
      </>
    ),
  },
];

// Phone layout: three dashes under the swipeable cards show where the row is (start, middle, end).
const SWIPE_POSITION_COUNT = 3;

export default function PurityPromisesSection() {
  const promisesCardRef = useRef<HTMLUListElement>(null);
  const [activeSwipePosition, setActiveSwipePosition] = useState(0);
  // "visible": shown normally (also the server-rendered state, so nothing is hidden without JavaScript).
  // "waiting": hidden, ready to animate. "revealed": animated into view.
  const [revealState, setRevealState] = useState<"visible" | "waiting" | "revealed">("visible");

  useEffect(() => {
    const promisesCard = promisesCardRef.current;
    if (!promisesCard) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already clearly on screen when the page opens (not just peeking in at the bottom): just show it.
    if (promisesCard.getBoundingClientRect().top < window.innerHeight - 100) return;

    setRevealState("waiting");
    const revealObserver = new IntersectionObserver(
      ([cardVisibility]) => {
        if (cardVisibility.isIntersecting) {
          setRevealState("revealed");
          revealObserver.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    revealObserver.observe(promisesCard);
    return () => revealObserver.disconnect();
  }, []);

  // Phone layout: how far the cards are swiped decides which dash is highlighted.
  function updateActiveSwipePosition() {
    const promisesRow = promisesCardRef.current;
    if (!promisesRow) return;
    const maxScroll = promisesRow.scrollWidth - promisesRow.clientWidth;
    if (maxScroll <= 0) return;
    const swipeProgress = promisesRow.scrollLeft / maxScroll;
    setActiveSwipePosition(Math.min(SWIPE_POSITION_COUNT - 1, Math.round(swipeProgress * (SWIPE_POSITION_COUNT - 1))));
  }

  // Tapping a dash moves the cards to that part of the row.
  function swipeToPosition(position: number) {
    const promisesRow = promisesCardRef.current;
    if (!promisesRow) return;
    const maxScroll = promisesRow.scrollWidth - promisesRow.clientWidth;
    promisesRow.scrollTo({ left: (maxScroll * position) / (SWIPE_POSITION_COUNT - 1), behavior: "smooth" });
  }

  return (
    <section className={styles["purity-promises-section"]} aria-label="Our purity promises">
      <ul
        ref={promisesCardRef}
        className={`${styles["purity-promises-card"]} ${
          revealState === "visible" ? "" : styles[`purity-promises-card-${revealState}`]
        }`}
        onScroll={updateActiveSwipePosition}
      >
        {purityPromises.map((purityPromise) => (
          <li key={purityPromise.title} className={styles["purity-promise-item"]}>
            <span className={styles["purity-promise-icon-circle"]}>
              <svg viewBox="0 0 24 24" className={styles["purity-promise-icon"]} aria-hidden="true">
                {purityPromise.icon}
              </svg>
            </span>
            <span className={styles["purity-promise-text"]}>
              <span className={styles["purity-promise-title"]}>{purityPromise.title}</span>
              <span className={styles["purity-promise-description"]}>{purityPromise.description}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Phone layout only: three dashes showing the cards can be swiped */}
      <div className={styles["purity-promises-swipe-dashes"]} role="group" aria-label="Scroll the promises">
        {Array.from({ length: SWIPE_POSITION_COUNT }, (_, position) => (
          <button
            key={position}
            type="button"
            aria-label={`Show part ${position + 1} of ${SWIPE_POSITION_COUNT}`}
            aria-current={position === activeSwipePosition ? "true" : undefined}
            className={`${styles["purity-promises-swipe-dash"]} ${
              position === activeSwipePosition ? styles["purity-promises-swipe-dash-active"] : ""
            }`}
            onClick={() => swipeToPosition(position)}
          />
        ))}
      </div>
    </section>
  );
}
