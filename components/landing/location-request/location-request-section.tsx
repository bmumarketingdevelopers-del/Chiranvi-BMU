"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./location-request-section.module.css";

/*
  Landing page section below delivery and offers: city illustration with a map pin on the left,
  "Welcome to Chiranvi Farm", a short note that delivery is limited to selected locations,
  and a "Request" button on the right.
  The button does nothing yet; it will be connected once delivery locations are decided.
  Scroll reveal: when the section scrolls into view, everything fades and slides up together.
  City animation (always running, see the CSS file): clouds drift behind the buildings without a gap,
  the van (left to right) and the scooter (right to left) keep riding past behind the pin, and our
  products slide through the pin's circle from left to right, one after another.
*/

// Products that slide through the pin (the Best Sellers products), a new one every 2 seconds.
const pinProducts = [
  { imageSource: "/images/products/a2-cow-milk-1-litre-bottle.webp", imageWidth: 232, imageHeight: 500 },
  { imageSource: "/images/products/desi-ghee-jar-chiranvi-farm.webp", imageWidth: 1524, imageHeight: 2204 },
  { imageSource: "/images/products/fresh-paneer-200g-box.webp", imageWidth: 604, imageHeight: 444 },
  { imageSource: "/images/products/moringa-leaves-powder-pouch.webp", imageWidth: 336, imageHeight: 516 },
  { imageSource: "/images/products/turmeric-powder-pouch.webp", imageWidth: 360, imageHeight: 548 },
  { imageSource: "/images/products/red-chilli-powder-pouch.webp", imageWidth: 360, imageHeight: 548 },
];
const pinProductSeconds = 2;

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
        {/*
          Animated city: layers cut from one picture (2353 x 1012), from back to front:
          clouds drifting behind the buildings, the city, the delivery van and the scooter riding
          past from right to left, a still copy of the map pin (so the vehicles pass behind it), and
          our products appearing one by one inside the pin's white circle.
        */}
        <div className={styles["location-request-illustration"]} role="img" aria-label="City with a map location pin">
          <div className={styles["location-request-cloud-layer"]} aria-hidden="true">
            {/* Six clouds (the picture's three, twice) spaced evenly along one endless drift */}
            {[1, 2, 3, 4, 5, 6].map((cloudNumber) => (
              <Image
                key={cloudNumber}
                src={`/images/location/location-cloud-${((cloudNumber - 1) % 3) + 1}.webp`}
                alt=""
                width={300}
                height={130}
                unoptimized
                className={`${styles["location-request-cloud"]} ${styles[`location-request-cloud-${cloudNumber}`]}`}
              />
            ))}
          </div>

          <Image
            src="/images/location/location-city-without-clouds.webp"
            alt=""
            width={2353}
            height={1012}
            sizes="(max-width: 600px) 100vw, 900px"
            className={styles["location-request-city"]}
          />

          <div className={styles["location-request-vehicle-lane"]} aria-hidden="true">
            <span className={`${styles["location-request-vehicle"]} ${styles["location-request-van"]}`}>
              <Image
                src="/images/location/location-delivery-van-facing-right.webp"
                alt=""
                width={720}
                height={416}
                unoptimized
                className={styles["location-request-vehicle-image"]}
              />
            </span>
            <span className={`${styles["location-request-vehicle"]} ${styles["location-request-scooter"]}`}>
              <Image
                src="/images/free-delivery-offer/delivery-rider-electric-scooter-chiranvi-farm-logo.webp"
                alt=""
                width={1612}
                height={1444}
                sizes="120px"
                className={styles["location-request-vehicle-image"]}
              />
            </span>
          </div>

          <Image
            src="/images/location/location-pin.webp"
            alt=""
            width={455}
            height={630}
            unoptimized
            className={styles["location-request-pin"]}
          />

          {/* Inside the pin's white circle: one product at a time */}
          <div className={styles["location-request-pin-products"]} aria-hidden="true">
            {pinProducts.map((product, productIndex) => (
              <Image
                key={product.imageSource}
                src={product.imageSource}
                alt=""
                width={product.imageWidth}
                height={product.imageHeight}
                sizes="100px"
                className={styles["location-request-pin-product"]}
                style={{ animationDelay: `${productIndex * pinProductSeconds}s` }}
              />
            ))}
          </div>
        </div>

        <div className={styles["location-request-text-block"]}>
          <h2 id="location-request-heading" className={styles["location-request-heading"]}>
            Welcome to Chiranvi Farm
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
