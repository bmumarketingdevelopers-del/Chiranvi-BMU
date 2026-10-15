"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./delivery-and-offers-section.module.css";

/*
  Landing page section below the customer reviews.
  Top row: "Goodness, Delivered" text, the delivery van picture, "Choose what's good for you" text.
  Bottom row: four promotion cards (Farm Fresh Combo, Homemade Powders, Pure Cow Ghee, Fresh Dairy).
  The card pictures come from the design. "Everyday essentials" on the combo card and
  "PURE COW GHEE" + the "Order Now" button on the ghee banner are part of the pictures;
  the rest of the text is real text placed on top. Every card leads to the login page.
  Scroll reveal: when the section scrolls into view, everything fades and slides up together.
*/

export default function DeliveryAndOffersSection() {
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
      { threshold: 0.15 },
    );
    revealObserver.observe(section);
    return () => revealObserver.disconnect();
  }, []);

  /*
    Van animation: starts when the visitor arrives at this section (its top edge scrolls up past
    the bottom 30% of the screen), and then keeps running: the van drives in once and stays parked,
    while its wheels, bottles, air streaks and leaves keep moving.
  */
  const vanRef = useRef<HTMLDivElement>(null);
  const [hasVisitorReachedSection, setHasVisitorReachedSection] = useState(false);
  // True once we know animations are allowed; until the van drives in it then waits off-screen,
  // so it is never seen standing still before its drive-in. Without JavaScript it simply stays parked.
  const [isVanAnimationAllowed, setIsVanAnimationAllowed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    setIsVanAnimationAllowed(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const sectionArrivalObserver = new IntersectionObserver(
      ([sectionVisibility]) => {
        if (sectionVisibility.isIntersecting) {
          setHasVisitorReachedSection(true);
          // Never reset afterwards, so the drive-in happens only once.
          sectionArrivalObserver.disconnect();
        }
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    sectionArrivalObserver.observe(section);
    return () => sectionArrivalObserver.disconnect();
  }, []);

  /*
    "Goodness, Delivered" is uncovered by the van itself: on every frame of the drive-in, the text
    is shown only up to the back of the van, so each word appears right after the van passes it.
    Runs before the browser paints, so the text never flashes before the van arrives.
  */
  const textRevealedByVanRef = useRef<HTMLDivElement>(null);
  const isVanAnimationRunning = hasVisitorReachedSection;

  useLayoutEffect(() => {
    const van = vanRef.current;
    const textBlock = textRevealedByVanRef.current;
    if (!isVanAnimationRunning || !van || !textBlock) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animationFrameId = 0;
    const startTime = performance.now();
    // Phones: the text stays static (always shown); only the van animates there.
    if (document.querySelector('style[data-landing-layout="mobile"]')) return;

    function uncoverTextBehindVan() {
      if (!van || !textBlock) return;
      const textBox = textBlock.getBoundingClientRect();
      const vanBox = van.getBoundingClientRect();
      const uncoveredWidth = vanBox.left - textBox.left;
      const hiddenWidth = Math.max(0, textBox.width - Math.max(0, uncoveredWidth));
      textBlock.style.clipPath = `inset(-20% ${hiddenWidth}px -20% 0)`;
      // The drive-in lasts 3.6 seconds; keep following a little longer, then show the text fully.
      if (performance.now() - startTime < 3900) {
        animationFrameId = requestAnimationFrame(uncoverTextBehindVan);
      } else {
        textBlock.style.clipPath = "";
      }
    }
    uncoverTextBehindVan();

    return () => {
      cancelAnimationFrame(animationFrameId);
      textBlock.style.clipPath = "";
    };
  }, [isVanAnimationRunning]);

  return (
    <section
      ref={sectionRef}
      className={`${styles["delivery-and-offers-section"]} ${
        revealState === "visible" ? "" : styles[`delivery-and-offers-section-${revealState}`]
      }`}
      aria-label="Fresh from the farm, delivered"
    >
      {/*
        Top row: text, van, text.
        Van animation (runs each time this row comes into view, see the CSS file):
        the van drives in from the left, revealing "Goodness, Delivered" as it passes, then stays in
        place with its wheels turning, the cargo of bottles shaking, air streaks rushing past
        and leaves blowing back onto the "Goodness, Delivered" text.
      */}
      <div
        className={`${styles["delivery-row"]} ${
          isVanAnimationRunning
            ? styles["delivery-van-animation-running"]
            : isVanAnimationAllowed
              ? styles["delivery-van-waiting-to-drive-in"]
              : ""
        }`}
      >
        <div ref={textRevealedByVanRef} className={styles["delivery-text-block"]}>
          <p className={styles["delivery-text-kicker"]}>Fresh from the farm</p>
          <h2 className={styles["delivery-text-heading"]}>Goodness, Delivered</h2>
          <p className={styles["delivery-text-paragraph"]}>
            Made with care using quality ingredients, bringing natural goodness to every family table.
          </p>
        </div>

        {/*
          Parking spot: the van's place in the row; it stays still while the van inside it drives in.
          The van is built from layers cut from one picture, so its parts can move separately.
        */}
        <div className={styles["delivery-van-parking-spot"]}>
          <div
            ref={vanRef}
            className={styles["delivery-van"]}
            role="img"
            aria-label="Chiranvi Farms delivery van carrying fresh milk, ghee and vegetables"
          >
            <span className={styles["delivery-van-air-streak"]} aria-hidden="true" />
            <span className={styles["delivery-van-air-streak"]} aria-hidden="true" />
            <span className={styles["delivery-van-air-streak"]} aria-hidden="true" />

            <span className={styles["delivery-van-moving-parts"]} aria-hidden="true">
              <Image
                src="/images/delivery/delivery-van-body-plain-side.webp"
                alt=""
                width={1840}
                height={1064}
                sizes="500px"
                className={styles["delivery-van-body"]}
              />
              {/* Chiranvi Farms logo on the van side (in place of the leaf in the original picture) */}
              <Image
                src="/images/brand/chiranvi-farms-logo.webp"
                alt=""
                width={499}
                height={220}
                sizes="150px"
                className={styles["delivery-van-logo"]}
              />
              <Image
                src="/images/delivery/delivery-van-cargo.webp"
                alt=""
                width={680}
                height={218}
                sizes="200px"
                className={styles["delivery-van-cargo"]}
              />
              <Image
                src="/images/delivery/delivery-van-rear-wheel.webp"
                alt=""
                width={220}
                height={220}
                sizes="60px"
                className={`${styles["delivery-van-wheel"]} ${styles["delivery-van-rear-wheel"]}`}
              />
              <Image
                src="/images/delivery/delivery-van-front-wheel.webp"
                alt=""
                width={220}
                height={220}
                sizes="60px"
                className={`${styles["delivery-van-wheel"]} ${styles["delivery-van-front-wheel"]}`}
              />
            </span>

            {/* Leaves blown off the van; each one drifts back onto the left text. */}
            {[1, 2, 3, 4, 5].map((leafNumber) => (
              <Image
                key={leafNumber}
                src={`/images/delivery/delivery-van-leaf-${leafNumber % 2 === 0 ? 2 : 1}.webp`}
                alt=""
                width={leafNumber % 2 === 0 ? 124 : 100}
                height={leafNumber % 2 === 0 ? 80 : 100}
                sizes="40px"
                aria-hidden="true"
                className={`${styles["delivery-van-leaf"]} ${styles[`delivery-van-leaf-${leafNumber}`]}`}
              />
            ))}
          </div>
        </div>

        <div className={`${styles["delivery-text-block"]} ${styles["delivery-text-block-aligned-with-dairy-card"]}`}>
          <p className={styles["delivery-text-kicker"]}>Fresh every day</p>
          <h2 className={styles["delivery-text-heading"]}>Choose what’s good for you</h2>
          <p className={`${styles["delivery-text-paragraph"]} ${styles["delivery-text-paragraph-justified"]}`}>
            Natural, wholesome food made with traditional methods from farm-fresh dairy to homemade food products.
          </p>
        </div>
      </div>

      {/* Bottom row: promotion cards */}
      <div className={styles["offer-cards-grid"]}>
        <Link href="/login" className={`${styles["offer-card"]} ${styles["offer-card-farm-fresh-combo"]}`}>
          <Image
            src="/images/promotions/farm-fresh-combo-card.webp"
            alt=""
            width={960}
            height={920}
            sizes="260px"
            className={styles["offer-card-image"]}
          />
          <span className={styles["offer-card-small-heading"]}>
            FARM FRESH
            <br />
            COMBO
          </span>
          <span className={styles["offer-card-visually-hidden"]}>Everyday essentials: Farm Fresh Combo</span>
        </Link>

        <Link href="/login" className={`${styles["offer-card"]} ${styles["offer-card-homemade-powders"]}`}>
          <Image
            src="/images/promotions/homemade-powders-card.webp"
            alt=""
            width={960}
            height={920}
            sizes="260px"
            className={styles["offer-card-image"]}
          />
          <span className={styles["offer-card-small-label"]}>Traditional goodness</span>
          <span className={styles["offer-card-small-heading"]}>
            HOMEMADE
            <br />
            POWDERS
          </span>
        </Link>

        <div className={`${styles["offer-card"]} ${styles["offer-card-pure-cow-ghee"]}`}>
          <Image
            src="/images/promotions/pure-cow-ghee-banner.webp"
            alt="Pure Cow Ghee"
            width={2088}
            height={1928}
            sizes="560px"
            className={styles["offer-card-image"]}
          />
          <span className={styles["ghee-banner-label"]}>Traditional goodness</span>
          <span className={styles["ghee-banner-tagline"]}>Pure goodness, from our farm</span>
          {/* Invisible link exactly over the "Order Now" button drawn in the picture */}
          <Link href="/login" className={styles["ghee-banner-order-now-link"]}>
            <span className={styles["offer-card-visually-hidden"]}>Order Pure Cow Ghee now</span>
          </Link>
        </div>

        <Link href="/login" className={`${styles["offer-card"]} ${styles["offer-card-fresh-dairy"]}`}>
          <Image
            src="/images/promotions/fresh-dairy-banner.webp"
            alt=""
            width={1132}
            height={1928}
            sizes="300px"
            className={styles["offer-card-image"]}
          />
          <span className={styles["dairy-banner-label"]}>Fresh &amp; Natural</span>
          <span className={styles["dairy-banner-heading"]}>
            FRESH
            <br />
            DAIRY
          </span>
          <span className={styles["dairy-banner-tagline"]}>From our farm to your home</span>
        </Link>
      </div>
    </section>
  );
}
