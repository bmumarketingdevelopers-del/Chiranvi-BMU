"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Poppins, Ubuntu } from "next/font/google";
import styles from "./network-status.module.css";

/*
  "No internet connection" screen (design), shown over any page while the browser is offline:
  the wi-fi sign with the sad milk bottle, Try again, "Offline · checking again in 12 seconds" and three
  tips (desktop: a row of cards; phones: one card with the tips stacked and Try again at the bottom).
  It closes by itself when the connection comes back, so the customer carries on where they were (the
  cart is kept in the browser). The pictures are drawn here (SVG), so they show without internet.
  Placed once in app/layout.tsx, so it works on every page.
*/

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-poppins" });
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-ubuntu" });

const CHECK_EVERY_SECONDS = 12;

// The browser's online / offline status (on the server: online)
function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

// Online for real: the browser says so and a tiny request to this site gets through
async function canReachTheSite() {
  if (!navigator.onLine) return false;
  try {
    await fetch(`/favicon.ico?connection-check=${Date.now()}`, { method: "HEAD", cache: "no-store" });
    return true;
  } catch {
    return false;
  }
}

// Desktop cards / phone list: the same three tips, worded as in each design
const connectionTips = [
  {
    icon: "router",
    desktopTitle: "Check your router",
    desktopText: "Make sure the lights are on",
    phoneTitle: "Check your Wi-Fi",
    phoneText: "Make sure the router is on",
  },
  {
    icon: "phone",
    desktopTitle: "Try mobile data",
    desktopText: "Or switch to another Wi-Fi",
    phoneTitle: "Turn mobile data on",
    phoneText: "Or switch airplane mode off",
  },
  {
    icon: "shield",
    desktopTitle: "Turn off VPN",
    desktopText: "Then reload this page",
    phoneTitle: "Turn off VPN",
    phoneText: "Then try again",
  },
] as const;

function TipIcon({ icon }: { icon: (typeof connectionTips)[number]["icon"] }) {
  return (
    <span className={styles["offline-tip-icon"]} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        {icon === "router" && (
          <>
            <rect x="3" y="13" width="18" height="7" rx="2" />
            <path d="M7 16.5h3" />
            <path d="M6.5 9.5a8 8 0 0 1 11 0" />
            <path d="M9.2 11.8a4.2 4.2 0 0 1 5.6 0" />
          </>
        )}
        {icon === "phone" && (
          <>
            <rect x="7" y="3" width="10" height="18" rx="2" />
            <path d="M11 17.5h2" />
          </>
        )}
        {icon === "shield" && <path d="M12 3l7 3v5c0 4.6-3 8-7 10-4-2-7-5.4-7-10V6z" />}
      </svg>
    </span>
  );
}

// The picture: pale circle with a dashed ring, crossed-out wi-fi, two clouds and the sad milk bottle
function NoConnectionPicture() {
  return (
    <svg className={styles["offline-picture"]} viewBox="0 0 360 300" aria-hidden="true">
      <circle cx="170" cy="145" r="138" fill="none" stroke="#dde3dd" strokeWidth="1.5" strokeDasharray="4 6" />
      <circle cx="170" cy="145" r="108" fill="#eef4ee" />
      {/* Clouds */}
      <g fill="#dde6df">
        <circle cx="46" cy="70" r="13" />
        <circle cx="64" cy="60" r="18" />
        <circle cx="83" cy="70" r="13" />
        <rect x="33" y="68" width="63" height="15" rx="7.5" />
        <circle cx="262" cy="42" r="9" />
        <circle cx="275" cy="35" r="12" />
        <circle cx="288" cy="42" r="9" />
        <rect x="253" y="41" width="44" height="10" rx="5" />
      </g>
      {/* Wi-fi, crossed out */}
      <g fill="none" stroke="#c5d0c7" strokeWidth="13" strokeLinecap="round">
        <path d="M119 140 A72 72 0 0 1 221 140" />
        <path d="M136 157 A48 48 0 0 1 204 157" />
        <path d="M153 174 A24 24 0 0 1 187 174" />
      </g>
      <circle cx="170" cy="196" r="9" fill="#c5d0c7" />
      <path d="M118 106 L224 206" stroke="#ffffff" strokeWidth="20" strokeLinecap="round" />
      <path d="M118 106 L224 206" stroke="#d84b3c" strokeWidth="12" strokeLinecap="round" />
      {/* The sad milk bottle */}
      <ellipse cx="290" cy="282" rx="27" ry="4.5" fill="#e3e7e3" />
      <path
        d="M282 180 L282 191 Q266 199 266 216 L266 271 Q266 278 273 278 L307 278 Q314 278 314 271 L314 216 Q314 199 298 191 L298 180 Z"
        fill="#ffffff"
        stroke="#1f4d2e"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <rect x="278.5" y="170" width="23" height="11" rx="3.5" fill="#e9b44c" stroke="#1f4d2e" strokeWidth="3" />
      <rect x="267.75" y="241" width="44.5" height="19" fill="#1f4d2e" />
      <circle cx="290" cy="250.5" r="6.5" fill="#2f6b3a" />
      <path d="M292.8 247.6 A4 4 0 1 0 292.8 253.4" fill="none" stroke="#f5bf2c" strokeWidth="1.8" strokeLinecap="round" />
      <g fill="none" stroke="#1f4d2e" strokeWidth="2.4" strokeLinecap="round">
        <path d="M277 224 Q281.5 219 286 224" />
        <path d="M294 224 Q298.5 219 303 224" />
        <path d="M284 235 Q290 230 296 235" />
      </g>
    </svg>
  );
}

function NoConnectionScreen() {
  const [secondsLeft, setSecondsLeft] = useState(CHECK_EVERY_SECONDS);
  const [isChecking, setIsChecking] = useState(false);
  const secondsLeftRef = useRef(CHECK_EVERY_SECONDS);
  const tryAgainButtonRef = useRef<HTMLButtonElement>(null);

  // "Try again" or the countdown reaching 0: check now; the screen closes by itself once back online
  async function checkConnection() {
    setIsChecking(true);
    await canReachTheSite();
    setIsChecking(false);
    secondsLeftRef.current = CHECK_EVERY_SECONDS;
    setSecondsLeft(CHECK_EVERY_SECONDS);
  }
  const checkConnectionRef = useRef(checkConnection);
  useEffect(() => {
    checkConnectionRef.current = checkConnection;
  });

  // Countdown to the next check; the page behind does not scroll; focus on Try again
  useEffect(() => {
    tryAgainButtonRef.current?.focus();
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const countdown = window.setInterval(() => {
      secondsLeftRef.current -= 1;
      if (secondsLeftRef.current <= 0) {
        void checkConnectionRef.current();
        return;
      }
      setSecondsLeft(secondsLeftRef.current);
    }, 1000);
    return () => {
      window.clearInterval(countdown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const secondsText = `${secondsLeft} ${secondsLeft === 1 ? "second" : "seconds"}`;

  return (
    <div
      className={`${styles["offline-screen"]} ${poppinsFont.variable} ${ubuntuFont.variable}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="offline-heading"
      aria-describedby="offline-description"
    >
      {/* Pale circles in two corners */}
      <span className={styles["offline-corner-circle-top"]} aria-hidden="true" />
      <span className={styles["offline-corner-circle-bottom"]} aria-hidden="true" />

      {/* eslint-disable-next-line @next/next/no-img-element -- the plain file, loaded while online (see NetworkStatus) */}
      <img className={styles["offline-logo"]} src={LOGO_SOURCE} alt="Chiranvi Farm" />

      <div className={styles["offline-content"]}>
        <NoConnectionPicture />

        <h1 id="offline-heading" className={styles["offline-heading"]}>
          No internet connection
        </h1>
        <p id="offline-description" className={styles["offline-description"]}>
          Looks like you&rsquo;re offline. Check your Wi-Fi or mobile data and try again.
          <span className={styles["offline-description-second-line"]}>
            This page will reload on its own once you&rsquo;re back online.
          </span>
        </p>

        <button
          ref={tryAgainButtonRef}
          type="button"
          className={styles["offline-try-again-button"]}
          disabled={isChecking}
          onClick={() => void checkConnection()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className={isChecking ? styles["offline-try-again-icon-spinning"] : undefined}>
            <path d="M20 12a8 8 0 1 1-2.3-5.6" />
            <path d="M20 4v4h-4" />
          </svg>
          {isChecking ? "Checking…" : "Try again"}
        </button>

        <p className={styles["offline-status"]} role="status">
          <span className={styles["offline-status-dot"]} aria-hidden="true" />
          {isChecking ? (
            "Checking your connection…"
          ) : (
            <>
              <span className={styles["offline-desktop-only"]}>Offline · checking again in {secondsText}</span>
              <span className={styles["offline-phone-only"]}>Checking again in {secondsText}</span>
            </>
          )}
        </p>

        <ul className={styles["offline-tips"]}>
          {connectionTips.map((tip) => (
            <li key={tip.icon} className={styles["offline-tip"]}>
              <TipIcon icon={tip.icon} />
              <span>
                <span className={styles["offline-tip-title"]}>
                  <span className={styles["offline-desktop-only"]}>{tip.desktopTitle}</span>
                  <span className={styles["offline-phone-only"]}>{tip.phoneTitle}</span>
                </span>
                <span className={styles["offline-tip-text"]}>
                  <span className={styles["offline-desktop-only"]}>{tip.desktopText}</span>
                  <span className={styles["offline-phone-only"]}>{tip.phoneText}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p className={styles["offline-error-code"]}>Chiranvi Farms · Error OFFLINE</p>
      </div>
    </div>
  );
}

const LOGO_SOURCE = "/images/brand/chiranvi-farm-logo.webp";

export default function NetworkStatus() {
  const isOnline = useSyncExternalStore(subscribeToConnection, () => navigator.onLine, () => true);

  // While online, the logo is loaded once, so the offline screen can still show it without internet
  useEffect(() => {
    const logo = new Image();
    logo.src = LOGO_SOURCE;
  }, []);

  return isOnline ? null : <NoConnectionScreen />;
}
