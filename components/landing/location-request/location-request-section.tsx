"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { POWDER_PRODUCT_IDS, useProductCards } from "@/components/product/all-products-page";
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
  The pin's products follow the Chiranvi Panel (Products & pricing): every product on the website, in the
  All products page's order. A deleted product drops out, a new one joins; with none left the Chiranvi
  logo shows instead.
*/

const pinProductSeconds = 2;

type PinPicture = { imageSource: string; imageWidth: number; imageHeight: number; isServedAsIs?: boolean };

// The products on the website (from the panel), each picture once: the three milks share one bottle, so
// it would otherwise seem to stand still for 6 seconds. The "coming soon" flours are not in the panel.
function usePinPictures() {
  const productCards = useProductCards();
  return useMemo(() => {
    const pictures: PinPicture[] = [];
    productCards.forEach((card) => {
      const isInPanel = card.hasPage || POWDER_PRODUCT_IDS.includes(card.cardId);
      if (!isInPanel || !card.picture || pictures.some((picture) => picture.imageSource === card.picture?.imageSource)) return;
      pictures.push(card.picture);
    });
    return pictures;
  }, [productCards]);
}

const chiranviLogo: PinPicture = { imageSource: "/images/brand/chiranvi-farm-logo.webp", imageWidth: 516, imageHeight: 240 };

export default function LocationRequestSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const productPictures = usePinPictures();
  // Two products: each is listed twice, so one can wait on the left while the other slides out
  const pinPictures = productPictures.length === 2 ? [...productPictures, ...productPictures] : productPictures;
  // Counts up every 2 seconds; the product shown is this, round the list
  const [pinStep, setPinStep] = useState(0);

  // One product, or none (the logo): nothing slides
  useEffect(() => {
    if (pinPictures.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pinTimer = window.setInterval(() => setPinStep((step) => step + 1), pinProductSeconds * 1000);
    return () => window.clearInterval(pinTimer);
  }, [pinPictures.length]);
  const shownIndex = pinPictures.length ? pinStep % pinPictures.length : 0;
  const leavingIndex = pinStep > 0 && pinPictures.length > 1 ? (pinStep - 1) % pinPictures.length : -1;
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

          {/* Inside the pin's white circle: one product at a time (no products: the Chiranvi logo) */}
          <div className={styles["location-request-pin-products"]} aria-hidden="true">
            {pinPictures.length === 0 ? (
              <Image
                src={chiranviLogo.imageSource}
                alt=""
                width={chiranviLogo.imageWidth}
                height={chiranviLogo.imageHeight}
                sizes="100px"
                className={`${styles["location-request-pin-product"]} ${styles["location-request-pin-product-shown"]}`}
              />
            ) : (
              pinPictures.map((picture, pictureIndex) => (
                <Image
                  key={`${pictureIndex}-${picture.imageSource}`}
                  src={picture.imageSource}
                  alt=""
                  width={picture.imageWidth}
                  height={picture.imageHeight}
                  sizes="100px"
                  // Photos uploaded in the panel (data: addresses) are shown as they are
                  unoptimized={picture.isServedAsIs || picture.imageSource.startsWith("data:")}
                  className={`${styles["location-request-pin-product"]} ${
                    pictureIndex === shownIndex
                      ? styles["location-request-pin-product-shown"]
                      : pictureIndex === leavingIndex
                        ? styles["location-request-pin-product-leaving"]
                        : ""
                  }`}
                />
              ))
            )}
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
