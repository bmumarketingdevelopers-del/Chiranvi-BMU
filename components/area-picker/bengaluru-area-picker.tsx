"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./bengaluru-area-picker.module.css";

/*
  The Bengaluru area box used on every form that asks for the area: the delivery request pop-up (landing
  page), the address form (My Addresses and the cart), the Profile page and Chiranvi Panel → Customers.
  Choosing an area fills the form's Pincode box with that area's main pincode (pincodeForArea). An area
  can have more than one pincode, so the forms keep the Pincode box editable.
  Anything not on the list is "Others": the form then shows its own box to type the location, and saves
  that text as the area. Opening a saved area that is not on the list shows "Others" with the text
  (areaChoiceFor / otherAreaTextFor).
*/

/*
  Areas A to Z with each area's main post office pincode. Check them with the delivery team before going
  live, and remove areas Chiranvi does not deliver to.
*/
export const BENGALURU_AREA_PINCODES: Record<string, string> = {
  Banashankari: "560050",
  Banaswadi: "560043",
  "Bannerghatta Road": "560076",
  Basavanagudi: "560004",
  Basaveshwaranagar: "560079",
  Begur: "560068",
  Bellandur: "560103",
  Bommanahalli: "560068",
  Brookefield: "560037",
  "BTM Layout": "560076",
  "CV Raman Nagar": "560093",
  Chamrajpet: "560018",
  Domlur: "560071",
  "Electronic City": "560100",
  "Frazer Town": "560005",
  Girinagar: "560085",
  Hebbal: "560024",
  Hennur: "560043",
  Hoodi: "560048",
  Horamavu: "560043",
  "HSR Layout": "560102",
  Hulimavu: "560076",
  Indiranagar: "560038",
  Jalahalli: "560013",
  Jayanagar: "560011",
  "JP Nagar": "560078",
  Kadugodi: "560067",
  "Kalyan Nagar": "560043",
  Kengeri: "560060",
  Konanakunte: "560062",
  Koramangala: "560034",
  "KR Puram": "560036",
  "Kumaraswamy Layout": "560078",
  Mahadevapura: "560048",
  Malleshwaram: "560003",
  Marathahalli: "560037",
  Mathikere: "560054",
  "MG Road": "560001",
  Nagarbhavi: "560072",
  Padmanabhanagar: "560070",
  Peenya: "560058",
  Rajajinagar: "560010",
  "Richmond Town": "560025",
  "RR Nagar": "560098",
  "RT Nagar": "560032",
  Sadashivanagar: "560080",
  "Sahakara Nagar": "560092",
  "Sarjapur Road": "560035",
  "Shanti Nagar": "560027",
  Shivajinagar: "560051",
  Thanisandra: "560077",
  Ulsoor: "560008",
  Uttarahalli: "560061",
  Varthur: "560087",
  Vidyaranyapura: "560097",
  Vijayanagar: "560040",
  Whitefield: "560066",
  "Wilson Garden": "560027",
  Yelahanka: "560064",
  Yeshwanthpur: "560022",
};
export const BENGALURU_AREAS = Object.keys(BENGALURU_AREA_PINCODES);
export const OTHER_AREA = "Others";
const AREA_CHOICES = [...BENGALURU_AREAS, OTHER_AREA];

// The pincode to fill in for a chosen area ("Others" or nothing: empty, for the customer to type)
export function pincodeForArea(area: string) {
  return BENGALURU_AREA_PINCODES[area] ?? "";
}

// A saved area shown in the box: a listed area as it is, anything else typed as "Others"
export function areaChoiceFor(savedArea: string) {
  const area = savedArea.trim();
  if (!area) return "";
  return BENGALURU_AREA_PINCODES[area] ? area : OTHER_AREA;
}

// The text for the "Others" box when a saved area is not on the list
export function otherAreaTextFor(savedArea: string) {
  return areaChoiceFor(savedArea) === OTHER_AREA ? savedArea.trim() : "";
}

/*
  Note under the Pincode box once a listed area has filled it in: the pincode may not be the customer's
  exact one (an area can have more than one), so it asks them to check it before submitting.
*/
export function PincodeCheckNote({ look }: { look: "landing" | "account" | "admin" }) {
  return (
    <span className={`${styles["pincode-check-note"]} ${styles[`pincode-check-note-${look}`]}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 7.5v.5" />
      </svg>
      Verify &amp; Edit Pincode Before Submission
    </span>
  );
}

/*
  A box that opens its list inside itself (the box grows downwards and the list scrolls), instead of the
  browser's own dropdown. The chosen area is shown light green with a tick.
  Keyboard: Enter / Space / ↓ open it, ↑ ↓ move, Enter chooses, Escape closes the list only.
  A click outside the box closes the list.
  look: the size of the form's other boxes (landing pop-up, account pages, or the Chiranvi Panel).
  labelId: the id of the field's label text, read out with the box.
*/
export default function BengaluruAreaPicker({
  area,
  onChoose,
  labelId,
  look,
  hasError = false,
  isDisabled = false,
  className = "",
}: {
  area: string;
  onChoose: (area: string) => void;
  labelId: string;
  look: "landing" | "account" | "admin";
  hasError?: boolean;
  isDisabled?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  // The highlighted row while the list is open (keyboard and mouse)
  const [activeIndex, setActiveIndex] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isListShown = isOpen && !isDisabled;

  function open() {
    setActiveIndex(Math.max(0, AREA_CHOICES.indexOf(area)));
    setIsOpen(true);
  }
  function choose(choice: string) {
    onChoose(choice);
    setIsOpen(false);
  }

  // Click outside the box: close the list
  useEffect(() => {
    if (!isListShown) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isListShown]);

  // Keep the highlighted row in view inside the list
  useEffect(() => {
    if (!isListShown) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [isListShown, activeIndex]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!isListShown) {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        open();
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(AREA_CHOICES.length - 1, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1))));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(AREA_CHOICES[activeIndex]);
    } else if (event.key === "Escape") {
      // Closes the list, not the whole pop-up
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      setIsOpen(false);
    }
  }

  return (
    <div
      ref={pickerRef}
      className={`${styles["bengaluru-area-picker"]} ${styles[`bengaluru-area-picker-${look}`]} ${
        isListShown ? styles["bengaluru-area-picker-open"] : ""
      } ${hasError ? styles["bengaluru-area-picker-error"] : ""} ${isDisabled ? styles["bengaluru-area-picker-locked"] : ""} ${className}`}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isListShown}
        aria-labelledby={labelId}
        disabled={isDisabled}
        className={`${styles["bengaluru-area-picker-button"]} ${area ? "" : styles["bengaluru-area-picker-placeholder"]}`}
        onClick={() => (isListShown ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
      >
        <span className={styles["bengaluru-area-picker-chosen-text"]}>{area || "Choose your area in Bengaluru"}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles["bengaluru-area-picker-arrow"]}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {isListShown && (
        <ul ref={listRef} role="listbox" aria-labelledby={labelId} className={styles["bengaluru-area-picker-list"]} data-lenis-prevent>
          {AREA_CHOICES.map((choice, index) => (
            <li
              key={choice}
              role="option"
              aria-selected={choice === area}
              className={`${styles["bengaluru-area-picker-option"]} ${index === activeIndex ? styles["bengaluru-area-picker-option-active"] : ""} ${
                choice === area ? styles["bengaluru-area-picker-option-chosen"] : ""
              }`}
              onPointerEnter={() => setActiveIndex(index)}
              onClick={(event) => {
                // Inside a <label> (Chiranvi Panel forms), a click would otherwise also reopen the box
                event.preventDefault();
                choose(choice);
              }}
            >
              {choice}
              {choice === area && (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
