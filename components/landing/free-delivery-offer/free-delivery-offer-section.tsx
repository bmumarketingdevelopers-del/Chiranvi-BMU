"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./free-delivery-offer-section.module.css";

/*
  Landing page section after Shop By Category: free delivery offer.
  Left: "Limited time offer" pill, "Subscribe to Any Plan & Enjoy FREE Delivery!" and a short line
  about doorstep delivery. Right: the delivery rider on the green electric scooter.
  Laptop / desktop: the heading and the line are pictures exported from Figma (so they look exactly
  like the design); the real text stays in the page for screen readers and search, and is what
  phones show. The pill is drawn in code (its exported picture lost its transparent background).
  Scroll reveal: when the section scrolls into view, the text fades and slides up.
  Scooter animation (like the delivery van): the first time the visitor reaches this section the
  scooter rides in from the right edge of the screen (it faces left) and stops in its place; it then
  keeps "riding" there: it bobs gently, its front wheel turns and air streaks rush past behind it.
*/

export default function FreeDeliveryOfferSection() {
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
      { threshold: 0.3 },
    );
    revealObserver.observe(section);
    return () => revealObserver.disconnect();
  }, []);

  /*
    Scooter animation: starts when the visitor arrives at this section (its top edge scrolls up past
    the bottom 30% of the screen), and then keeps running: the scooter rides in once and stays,
    while it bobs, its front wheel turns and the air streaks keep moving.
  */
  const [hasVisitorReachedSection, setHasVisitorReachedSection] = useState(false);
  // True once we know animations are allowed; until it rides in the scooter then waits off-screen,
  // so it is never seen standing still before its ride-in. Without JavaScript it simply stays in place.
  const [isScooterAnimationAllowed, setIsScooterAnimationAllowed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    setIsScooterAnimationAllowed(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const sectionArrivalObserver = new IntersectionObserver(
      ([sectionVisibility]) => {
        if (sectionVisibility.isIntersecting) {
          setHasVisitorReachedSection(true);
          // Never reset afterwards, so the ride-in happens only once.
          sectionArrivalObserver.disconnect();
        }
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    sectionArrivalObserver.observe(section);
    return () => sectionArrivalObserver.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`${styles["free-delivery-offer-section"]} ${
        revealState === "visible" ? "" : styles[`free-delivery-offer-section-${revealState}`]
      }`}
      aria-labelledby="free-delivery-offer-heading"
    >
      <div className={styles["free-delivery-offer-content"]}>
        <div className={styles["free-delivery-offer-text-block"]}>
          <p className={styles["free-delivery-offer-pill"]}>Limited time offer</p>

          <h2 id="free-delivery-offer-heading" className={styles["free-delivery-offer-heading"]}>
            <Image
              src="/images/free-delivery-offer/free-delivery-heading-text.webp"
              alt=""
              width={1623}
              height={351}
              unoptimized
              className={styles["free-delivery-offer-heading-image"]}
            />
            <span className={styles["free-delivery-offer-text-for-phones"]}>
              Subscribe to Any Plan &amp;
              <br />
              Enjoy <span className={styles["free-delivery-offer-heading-highlight"]}>FREE Delivery!</span>
            </span>
          </h2>

          <p className={styles["free-delivery-offer-description"]}>
            <Image
              src="/images/free-delivery-offer/free-delivery-description-text.webp"
              alt=""
              width={2217}
              height={195}
              unoptimized
              className={styles["free-delivery-offer-description-image"]}
            />
            <span className={styles["free-delivery-offer-text-for-phones"]}>
              Fresh milk, ghee, paneer and more, delivered to your doorstep on monthly plan with{" "}
              <strong>zero extra charges!</strong>
            </span>
          </p>
        </div>

        {/*
          Parking spot: the scooter's place in the row; it stays still while the scooter inside it rides in.
          The front wheel is a copy of the wheel cut from the same picture: its rim turns, and a still
          copy of the fork and brake sits on top so they do not turn with it.
        */}
        <div
          className={`${styles["free-delivery-offer-scooter-parking-spot"]} ${
            hasVisitorReachedSection
              ? styles["free-delivery-offer-scooter-animation-running"]
              : isScooterAnimationAllowed
                ? styles["free-delivery-offer-scooter-waiting-to-ride-in"]
                : ""
          }`}
        >
          <div
            className={styles["free-delivery-offer-scooter"]}
            role="img"
            aria-label="Chiranvi Farms delivery rider on a green electric scooter with a delivery box"
          >
            <span className={styles["free-delivery-offer-scooter-air-streak"]} aria-hidden="true" />
            <span className={styles["free-delivery-offer-scooter-air-streak"]} aria-hidden="true" />
            <span className={styles["free-delivery-offer-scooter-air-streak"]} aria-hidden="true" />

            <span className={styles["free-delivery-offer-scooter-moving-parts"]} aria-hidden="true">
              <Image
                src="/images/free-delivery-offer/delivery-rider-electric-scooter.webp"
                alt=""
                width={1612}
                height={1444}
                sizes="(max-width: 600px) 80vw, 420px"
                className={styles["free-delivery-offer-scooter-image"]}
              />
              <span className={styles["free-delivery-offer-scooter-front-wheel"]}>
                <Image
                  src="/images/free-delivery-offer/delivery-scooter-front-wheel-rim.webp"
                  alt=""
                  width={280}
                  height={280}
                  unoptimized
                  className={styles["free-delivery-offer-scooter-front-wheel-rim"]}
                />
                <Image
                  src="/images/free-delivery-offer/delivery-scooter-front-wheel.webp"
                  alt=""
                  width={280}
                  height={280}
                  unoptimized
                  className={styles["free-delivery-offer-scooter-front-wheel-fork"]}
                />
              </span>
              {/*
                Rear wheel: mostly hidden behind the scooter in the picture, so its tyre and rim edge are
                rebuilt as a full ring that turns, with a still copy of the cover, panel and stand on top.
              */}
              <span className={styles["free-delivery-offer-scooter-rear-wheel"]}>
                <Image
                  src="/images/free-delivery-offer/delivery-scooter-rear-wheel-turning.webp"
                  alt=""
                  width={360}
                  height={360}
                  unoptimized
                  className={styles["free-delivery-offer-scooter-rear-wheel-tyre"]}
                />
                <Image
                  src="/images/free-delivery-offer/delivery-scooter-rear-wheel-still.webp"
                  alt=""
                  width={360}
                  height={360}
                  unoptimized
                  className={styles["free-delivery-offer-scooter-rear-wheel-cover"]}
                />
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
