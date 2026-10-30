"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useProductCards } from "@/components/product/all-products-page";
import { addLead } from "@/store/admin-leads-store";
import styles from "./bulk-order-popup.module.css";

/*
  "We take bulk orders!" pop-up, on every customer page (mounted once in app/layout.tsx):
  - every time the site is opened, refreshed or reopened: shows 5 seconds after the page loads; closing it
    (×, Maybe later, Escape or a click outside it) brings it back once more, 30 seconds later; after that
    second close (or once a quote is sent) it does not come back until the next load. Kept only in memory,
    so moving between pages keeps the count, and every refresh starts fresh again;
  - never on /admin, /login, /cart or /checkout (it waits until a page where it may show);
  - while it is open, the page behind is blurred and dimmed and cannot be clicked or scrolled;
  - opens like the footer's "Good Milk. Good Health." banner: it fades and slides up (700 ms), while
    the lines on its green picture band draw themselves.
  "Get a bulk quote" turns it into the form: name, address, phone, email (optional), and every product with
  "− quantity +"; Submit saves it as a New lead from the Website (Chiranvi Panel → Leads, with the address,
  email and products in the lead's details).
*/

const FIRST_SHOW_AFTER_MS = 5_000;
const SECOND_SHOW_AFTER_MS = 30_000;
// Sent on window when the pop-up is closed: the log in / complete profile notification starts after it
export const BULK_ORDER_POPUP_CLOSED_EVENT = "chiranvi-bulk-order-popup-closed";
const PHONE_NUMBER = "9902881718";

const HIDDEN_PAGE_STARTS = ["/admin", "/login", "/cart", "/checkout"];

// Pictures in the green band (pictures the site already has)
const BAND_PICTURES = [
  { imageSource: "/images/products/desi-cow-milk-bottle-chiranvi-farm.webp", imageWidth: 1188, imageHeight: 2312, alt: "A2 Desi Cow Milk" },
  { imageSource: "/images/products/desi-ghee-jar-chiranvi-farm.webp", imageWidth: 1524, imageHeight: 2204, alt: "A2 Desi Ghee" },
  { imageSource: "/images/products/fresh-paneer-box-chiranvi-farm.webp", imageWidth: 3712, imageHeight: 2728, alt: "Fresh Paneer" },
  { imageSource: "/images/products/whole-wheat-atta-pack.webp", imageWidth: 1984, imageHeight: 1806, alt: "Whole Wheat Atta" },
  { imageSource: "/images/categories/flours-category-chiranvi-farm.webp", imageWidth: 412, imageHeight: 276, alt: "Ragi and Jowar Flour" },
];

type View = "hidden" | "offer" | "form" | "thanks";

// This page load: "fresh" (not closed yet), "closed-once" (shows once more, 30 s later), "done"
type VisitStage = "fresh" | "closed-once" | "done";

export default function BulkOrderPopup() {
  const pathname = usePathname();
  const isHiddenPage = HIDDEN_PAGE_STARTS.some((start) => pathname.startsWith(start));
  const [view, setView] = useState<View>("hidden");
  // Becomes true once the timer has run out; the pop-up then waits for a page where it may show
  const [isDue, setIsDue] = useState(false);
  // This page load's stage (only in memory, so a refresh starts fresh)
  const [visitStage, setVisitStage] = useState<VisitStage>("fresh");

  // The timer: 5 s after the page loads, or 30 s after the first close; none once done
  useEffect(() => {
    if (visitStage === "done") return;
    const timer = window.setTimeout(() => setIsDue(true), visitStage === "fresh" ? FIRST_SHOW_AFTER_MS : SECOND_SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [visitStage]);

  // Due, and on a page where it may show: open it
  useEffect(() => {
    if (!isDue || isHiddenPage || view !== "hidden") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opening when the timer and the page allow it
    setView("offer");
    setIsDue(false);
  }, [isDue, isHiddenPage, view]);

  // While it is open the page behind does not scroll (it is blurred behind the pop-up)
  const isOpen = view !== "hidden" && !isHiddenPage;
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Closing: the first time it comes back 30 s later; the second time (or after a quote) it is done for
  // this page load. The notification's 10 s start now.
  function close() {
    setVisitStage(view === "thanks" || visitStage === "closed-once" ? "done" : "closed-once");
    setView("hidden");
    window.dispatchEvent(new Event(BULK_ORDER_POPUP_CLOSED_EVENT));
  }

  // Escape, or a click anywhere outside the pop-up, closes it
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view === "hidden") return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    function closeOnOutsideClick(event: PointerEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) close();
    }
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  });

  if (!isOpen) return null;

  return (
    // The blurred, dimmed layer over the page; a click on it (outside the pop-up) closes the pop-up
    <div className={styles["bulk-order-backdrop"]}>
      <div
        ref={popupRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-order-title"
        className={`${styles["bulk-order-popup"]} ${view === "form" ? styles["bulk-order-popup-wide"] : ""}`}
      >
        <button type="button" className={styles["bulk-order-close-button"]} aria-label="Close" onClick={close}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {view === "offer" && (
          <>
            <PictureBand />
            <div className={styles["bulk-order-offer"]}>
              <span className={styles["bulk-order-badge"]}>Now available</span>
              <h2 id="bulk-order-title" className={styles["bulk-order-title"]}>
                We take bulk orders!
              </h2>
              <p className={styles["bulk-order-text"]}>Fresh milk, ghee, paneer and atta for hotels, cafes, caterers, offices and events.</p>
              <button type="button" className={styles["bulk-order-main-button"]} onClick={() => setView("form")}>
                Get a bulk quote
              </button>
              <p className={styles["bulk-order-footnote"]}>
                or call{" "}
                <a href={`tel:+91${PHONE_NUMBER}`} className={styles["bulk-order-phone-link"]}>
                  +91 {PHONE_NUMBER}
                </a>{" "}
                ·{" "}
                <button type="button" className={styles["bulk-order-maybe-later"]} onClick={close}>
                  Maybe later
                </button>
              </p>
            </div>
          </>
        )}

        {view === "form" && <BulkQuoteForm onSent={() => setView("thanks")} />}

        {view === "thanks" && (
          <div className={styles["bulk-order-offer"]}>
            <span className={styles["bulk-order-thanks-icon"]} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h2 id="bulk-order-title" className={styles["bulk-order-title"]}>
              Thank you!
            </h2>
            <p className={styles["bulk-order-text"]}>We have your bulk order request. Our team will call you soon with a quote.</p>
            <button type="button" className={styles["bulk-order-main-button"]} onClick={close}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// The green band with the products and the self-drawing lines (like the footer's banner)
function PictureBand() {
  return (
    <div className={styles["bulk-order-band"]} aria-hidden="true">
      <svg className={styles["bulk-order-band-lines"]} viewBox="0 0 480 200" preserveAspectRatio="none">
        <circle cx="400" cy="10" r="110" pathLength={1} />
        <path d="M-10 170 C 80 120, 160 200, 250 150 S 420 90, 500 130" pathLength={1} />
      </svg>
      <div className={styles["bulk-order-band-pictures"]}>
        {BAND_PICTURES.map((picture) => (
          <Image
            key={picture.imageSource}
            src={picture.imageSource}
            alt=""
            width={picture.imageWidth}
            height={picture.imageHeight}
            sizes="120px"
            className={styles["bulk-order-band-picture"]}
          />
        ))}
      </div>
    </div>
  );
}

/*
  The bulk quote form: name, address, phone (10 digits) and email (optional), and every product (from the
  All products page) with "− quantity +". At least one product must have a quantity.
*/
function BulkQuoteForm({ onSent }: { onSent: () => void }) {
  const productCards = useProductCards();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const firstFieldRef = useRef<HTMLInputElement>(null);
  // The list shows two products and does not scroll; "View more products" opens all of them (scrollable)
  const productListRef = useRef<HTMLUListElement>(null);
  const [isListExpanded, setIsListExpanded] = useState(false);
  function toggleProductList() {
    const list = productListRef.current;
    const popup = list?.closest("[role=dialog]");
    if (isListExpanded) {
      // Back to the first two products, and the pop-up back to its top
      list?.scrollTo({ top: 0 });
      popup?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // The opened list and the Submit button slide into view (on short screens the fields above move up)
      window.setTimeout(() => popup?.scrollTo({ top: popup.scrollHeight, behavior: "smooth" }), 320);
    }
    setIsListExpanded(!isListExpanded);
  }

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const setQuantity = (cardId: string, quantity: number) => setQuantities((current) => ({ ...current, [cardId]: Math.max(0, quantity) }));
  // − / +: from the latest count, so quick taps all count
  const changeQuantity = (cardId: string, change: number) =>
    setQuantities((current) => ({ ...current, [cardId]: Math.max(0, (current[cardId] ?? 0) + change) }));
  const chosenCount = Object.values(quantities).filter((quantity) => quantity > 0).length;
  const digits = phone.replace(/\D/g, "");
  // Submit unlocks only when every detail is filled: name, address, 10-digit phone, a valid email (or none),
  // and at least one product
  const isFormComplete =
    name.trim() !== "" &&
    address.trim() !== "" &&
    digits.length === 10 &&
    (email.trim() === "" || /^\S+@\S+\.\S+$/.test(email.trim())) &&
    chosenCount > 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isFormComplete) return;
    const bulkOrderItems = productCards
      .filter((card) => (quantities[card.cardId] ?? 0) > 0)
      .map((card) => ({ productName: card.name, packLabel: card.packLabel, quantity: quantities[card.cardId] }));
    addLead({
      name: name.trim(),
      phone: `${digits.slice(0, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`,
      source: "Website",
      note: "Bulk quote",
      address: address.trim(),
      email: email.trim() || undefined,
      bulkOrderItems,
    });
    onSent();
  }

  return (
    <form className={styles["bulk-order-form"]} onSubmit={submit} noValidate>
      <h2 id="bulk-order-title" className={styles["bulk-order-form-title"]}>
        Get a bulk quote
      </h2>
      <p className={styles["bulk-order-form-intro"]}>Tell us what you need; our team will call you with the best price.</p>

      <div className={styles["bulk-order-fields"]}>
        <label className={styles["bulk-order-field"]}>
          <span>Name *</span>
          <input ref={firstFieldRef} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name or business" />
        </label>
        <label className={styles["bulk-order-field"]}>
          <span>Phone number *</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10-digit mobile number"
          />
        </label>
        <label className={`${styles["bulk-order-field"]} ${styles["bulk-order-field-wide"]}`}>
          <span>Address *</span>
          <textarea value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" placeholder="Delivery address" rows={2} />
        </label>
        <label className={`${styles["bulk-order-field"]} ${styles["bulk-order-field-wide"]}`}>
          <span>Email (optional)</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" />
        </label>
      </div>

      <div className={styles["bulk-order-products-heading"]}>
        <span>Products you need</span>
        <span className={styles["bulk-order-products-count"]}>{chosenCount > 0 ? `${chosenCount} chosen` : "Add the quantity"}</span>
      </div>
      <ul
        ref={productListRef}
        className={`${styles["bulk-order-products"]} ${isListExpanded ? styles["bulk-order-products-expanded"] : ""}`}
        data-lenis-prevent
      >
        {productCards.map((card) => {
          const quantity = quantities[card.cardId] ?? 0;
          return (
            <li key={card.cardId} className={`${styles["bulk-order-product"]} ${quantity > 0 ? styles["bulk-order-product-chosen"] : ""}`}>
              {card.picture && (
                <span className={styles["bulk-order-product-picture"]}>
                  <Image src={card.picture.imageSource} alt="" width={card.picture.imageWidth} height={card.picture.imageHeight} sizes="44px" />
                </span>
              )}
              <span className={styles["bulk-order-product-text"]}>
                <strong>{card.name}</strong>
                <span>{card.packLabel}</span>
              </span>
              <span className={styles["bulk-order-quantity"]} role="group" aria-label={`${card.name} quantity`}>
                <button type="button" aria-label={`One less ${card.name}`} onClick={() => changeQuantity(card.cardId, -1)} disabled={quantity === 0}>
                  −
                </button>
                <input
                  aria-label={`${card.name} quantity`}
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) => setQuantity(card.cardId, Number(event.target.value.replace(/\D/g, "").slice(0, 5)) || 0)}
                />
                <button type="button" aria-label={`One more ${card.name}`} onClick={() => changeQuantity(card.cardId, 1)}>
                  +
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {productCards.length > 2 && (
        <button type="button" className={styles["bulk-order-view-more"]} onClick={toggleProductList} aria-expanded={isListExpanded}>
          {isListExpanded ? "View less" : "View more products"}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={isListExpanded ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </button>
      )}

      <button type="submit" className={styles["bulk-order-main-button"]} disabled={!isFormComplete}>
        Submit request
      </button>
      <p className={styles["bulk-order-footnote"]}>
        Prefer to talk?{" "}
        <a href={`tel:+91${PHONE_NUMBER}`} className={styles["bulk-order-phone-link"]}>
          +91 {PHONE_NUMBER}
        </a>
      </p>
    </form>
  );
}
