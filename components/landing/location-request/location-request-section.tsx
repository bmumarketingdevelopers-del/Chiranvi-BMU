"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./location-request-section.module.css";

/*
  Landing page section below delivery and offers: city illustration with a map pin on the left,
  "Welcome to Chiranvi Farms", a short note that delivery is limited to selected locations,
  and a "Request" button on the right.
  The button does nothing yet; it will be connected once delivery locations are decided.
  Scroll reveal: when the section scrolls into view, everything fades and slides up together.
*/

export default function LocationRequestSection() {
  const sectionRef = useRef<HTMLElement>(null);
  // "visible": shown normally (also the server-rendered state, so nothing is hidden without JavaScript).
  // "waiting": hidden, ready to animate. "revealed": animated into view.
  const [revealState, setRevealState] = useState<"visible" | "waiting" | "revealed">("visible");

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
      className={`${styles["location-request-section"]} ${
        revealState === "visible" ? "" : styles[`location-request-section-${revealState}`]
      }`}
      aria-labelledby="location-request-heading"
    >
      <div className={styles["location-request-content"]}>
        <Image
          src="/images/location/city-location-pin-illustration.webp"
          alt="City with a map location pin"
          width={2353}
          height={1012}
          sizes="(max-width: 600px) 100vw, 520px"
          className={styles["location-request-illustration"]}
        />

        <div className={styles["location-request-text-block"]}>
          <h2 id="location-request-heading" className={styles["location-request-heading"]}>
            Welcome to Chiranvi Farms
          </h2>
          <p className={styles["location-request-description"]}>
            Tell us where you are. We currently deliver{" "}
            <br />
            only to selected locations.
          </p>

          <button type="button" className={styles["location-request-button"]}>
            <svg viewBox="0 0 24 24" className={styles["location-request-button-icon"]} aria-hidden="true">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z" />
            </svg>
            Request
          </button>
        </div>
      </div>
    </section>
  );
}
