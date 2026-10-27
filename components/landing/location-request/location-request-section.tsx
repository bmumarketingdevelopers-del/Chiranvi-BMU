"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { POWDER_PRODUCT_IDS, useProductCards } from "@/components/product/all-products-page";
import BengaluruAreaPicker, { OTHER_AREA, PincodeCheckNote, pincodeForArea } from "@/components/area-picker/bengaluru-area-picker";
import { addLead } from "@/store/admin-leads-store";
import styles from "./location-request-section.module.css";

/*
  Landing page section below delivery and offers: city illustration with a map pin on the left,
  "Welcome to Chiranvi Farm", a short note that delivery is limited to selected locations,
  and a "Request" button on the right.
  "Request" opens the delivery request pop-up over the landing page (see LocationRequestPopup below).
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
  const [isRequestPopupOpen, setIsRequestPopupOpen] = useState(false);
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

          <button type="button" className={styles["location-request-button"]} onClick={() => setIsRequestPopupOpen(true)}>
            <svg viewBox="0 0 24 24" className={styles["location-request-button-icon"]} aria-hidden="true">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z" />
            </svg>
            Request
          </button>
        </div>
      </div>

      {isRequestPopupOpen && <LocationRequestPopup onClose={() => setIsRequestPopupOpen(false)} />}
    </section>
  );
}

/*
  Delivery request pop-up ("Request"): over the landing page, which stays behind it, dimmed.
  Name, phone number (10 digits) and the area: a Bengaluru area from the list, or "Others", which opens a
  box to type the location; then the pincode, filled from the chosen area (optional, 6 digits when given).
  "Request delivery" stays greyed until name, number and area are filled; it saves a New
  lead from the Website (Chiranvi Panel → Leads: the area in the lead's address, "Location request" as its
  note), then shows a thank-you. ×, Escape or a click on the dimmed page closes it.
  Drawn inside the section but outside its content (which the scroll animation moves), so it keeps the
  page's fonts and stays fixed to the screen.
*/
function LocationRequestPopup({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [otherLocation, setOtherLocation] = useState("");
  const [pincode, setPincode] = useState("");
  const [requestedLocation, setRequestedLocation] = useState<string | null>(null);
  const nameFieldRef = useRef<HTMLInputElement>(null);

  const location = area === OTHER_AREA ? otherLocation.trim() : area;
  // Pincode: optional, but 6 digits when given
  const isFormComplete = name.trim() !== "" && phone.length === 10 && location !== "" && (pincode === "" || pincode.length === 6);

  // Choosing an area fills its pincode (Others: empty, for the customer to type)
  function chooseArea(chosenArea: string) {
    setArea(chosenArea);
    setPincode(pincodeForArea(chosenArea));
  }

  // The latest onClose, so the set-up below runs only once (not again on every keystroke)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Opens with the cursor in Name; Escape closes it; the page behind does not scroll meanwhile
  useEffect(() => {
    nameFieldRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isFormComplete) return;
    addLead({
      name: name.trim(),
      phone: `${phone.slice(0, 5)} ${phone.slice(5, 7)} ${phone.slice(7)}`,
      source: "Website",
      note: "Location request",
      address: `${location}, Bengaluru${pincode ? ` ${pincode}` : ""}`,
    });
    setRequestedLocation(location);
  }

  return (
    <div className={styles["location-popup-backdrop"]} data-lenis-prevent onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="location-popup-title" className={styles["location-popup"]}>
        <button type="button" className={styles["location-popup-close-button"]} aria-label="Close" onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {requestedLocation === null ? (
          <form onSubmit={submit} noValidate>
            <h2 id="location-popup-title" className={styles["location-popup-title"]}>
              Request delivery
            </h2>
            <p className={styles["location-popup-intro"]}>Tell us where you are. We will call you when we deliver to your area.</p>

            <label className={styles["location-popup-field"]}>
              <span>Name *</span>
              <input ref={nameFieldRef} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" />
            </label>
            <label className={styles["location-popup-field"]}>
              <span>Phone number *</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit mobile number"
              />
            </label>
            <div className={styles["location-popup-field"]}>
              <span id="location-popup-area-label">Your area *</span>
              <BengaluruAreaPicker area={area} onChoose={chooseArea} labelId="location-popup-area-label" look="landing" />
            </div>
            {/* "Others": the location in the customer's own words */}
            {area === OTHER_AREA && (
              <label className={styles["location-popup-field"]}>
                <span>Your location *</span>
                <input value={otherLocation} onChange={(event) => setOtherLocation(event.target.value)} placeholder="Area, landmark or city" autoFocus />
              </label>
            )}
            {/* Filled from the chosen area; can be changed */}
            <label className={styles["location-popup-field"]}>
              <span>Pincode</span>
              <input
                value={pincode}
                onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="6-digit pincode"
              />
              {pincodeForArea(area) && <PincodeCheckNote look="landing" />}
            </label>

            <button type="submit" className={styles["location-popup-submit-button"]} disabled={!isFormComplete}>
              Request delivery
            </button>
          </form>
        ) : (
          <div className={styles["location-popup-thanks"]}>
            <span className={styles["location-popup-thanks-icon"]} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h2 id="location-popup-title" className={styles["location-popup-title"]}>
              Thank you!
            </h2>
            <p className={styles["location-popup-intro"]}>
              We have your request for {requestedLocation}. Our team will call you soon.
            </p>
            <button type="button" className={styles["location-popup-submit-button"]} onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
