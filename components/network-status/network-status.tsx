"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Poppins, Ubuntu } from "next/font/google";
import styles from "./network-status.module.css";

/*
  Network screens (designs), shown over any page; placed once in app/layout.tsx.
  - "No internet connection": while the browser is offline. The wi-fi sign crossed out with the sad milk
    bottle, Try again, "Offline · checking again in 12 seconds" and three tips. It closes by itself when
    the connection comes back, so the customer carries on where they were (the cart is kept).
  - "Slow internet connection": when a page's content (opening a product, the cart, any page) is still
    loading after 10 seconds, on any network (5G and Wi-Fi too), or after 5 seconds when the browser
    measures the speed under 1 Mbps (Chrome / Android only). A progress bar creeps up while it waits;
    Try again opens the page afresh; Keep waiting hides it for 10 seconds; it closes once the page loads.
  The pictures are drawn here (SVG), so they show without internet.
*/

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-poppins" });
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-ubuntu" });

const LOGO_SOURCE = "/images/brand/chiranvi-farm-logo.webp";
const CHECK_EVERY_SECONDS = 12;
const SLOW_AFTER_MILLISECONDS = 10_000;
const SLOW_AFTER_MILLISECONDS_ON_MEASURED_SLOW_NETWORK = 5_000;
const MEASURED_SLOW_BELOW_MBPS = 1;

// ---------- Online / offline ----------

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

// ---------- Page content loading (for the slow screen) ----------

/*
  Each new page's content comes from the server in a request marked "rsc: 1" (prefetches, which never
  hold up a page, are marked as prefetches). fetch is wrapped once to note when each such request starts
  and ends, so the slow screen knows the oldest page still loading and which page it is.
*/
type PageLoad = { startedAt: number; pagePath: string };
const pageLoadsInProgress = new Map<number, PageLoad>();
let oldestPageLoad: PageLoad | null = null;
let pageLoadCount = 0;
let isFetchWatched = false;
const pageLoadListeners = new Set<() => void>();

function notePageLoadsChanged() {
  oldestPageLoad = null;
  for (const pageLoad of pageLoadsInProgress.values()) {
    if (!oldestPageLoad || pageLoad.startedAt < oldestPageLoad.startedAt) oldestPageLoad = pageLoad;
  }
  pageLoadListeners.forEach((onChange) => onChange());
}

function watchPageLoads() {
  if (isFetchWatched) return;
  isFetchWatched = true;
  const browserFetch = window.fetch;
  window.fetch = function fetchNotingPageLoads(input: RequestInfo | URL, init?: RequestInit) {
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const isPageContent =
      headers.get("rsc") === "1" && !headers.has("next-router-prefetch") && !headers.has("next-router-segment-prefetch");
    if (!isPageContent) return browserFetch.call(window, input, init);

    const requestUrl = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    requestUrl.searchParams.delete("_rsc");
    const loadNumber = ++pageLoadCount;
    pageLoadsInProgress.set(loadNumber, { startedAt: Date.now(), pagePath: requestUrl.pathname + requestUrl.search });
    notePageLoadsChanged();
    return browserFetch.call(window, input, init).finally(() => {
      pageLoadsInProgress.delete(loadNumber);
      notePageLoadsChanged();
    });
  };
}

function subscribeToPageLoads(onChange: () => void) {
  watchPageLoads();
  pageLoadListeners.add(onChange);
  return () => {
    pageLoadListeners.delete(onChange);
  };
}

// The connection speed the browser measured, in Mbps (Chrome / Android only; null elsewhere)
function getMeasuredSpeed(): number | null {
  const connection = (navigator as Navigator & { connection?: { downlink?: number } }).connection;
  return typeof connection?.downlink === "number" ? connection.downlink : null;
}

// ---------- Pictures (SVG, so they show without internet) ----------

// Pale circle with a dashed ring, and two clouds
function PictureBackground() {
  return (
    <>
      <circle cx="170" cy="145" r="138" fill="none" stroke="#dde3dd" strokeWidth="1.5" strokeDasharray="4 6" />
      <circle cx="170" cy="145" r="108" fill="#eef4ee" />
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
    </>
  );
}

// The milk bottle at the bottom right: sad (no internet) or with a straight face (slow)
function MilkBottle({ mood }: { mood: "sad" | "waiting" }) {
  return (
    <>
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
      {mood === "sad" ? (
        <g fill="none" stroke="#1f4d2e" strokeWidth="2.4" strokeLinecap="round">
          <path d="M277 224 Q281.5 219 286 224" />
          <path d="M294 224 Q298.5 219 303 224" />
          <path d="M284 235 Q290 230 296 235" />
        </g>
      ) : (
        <g fill="#1f4d2e">
          <circle cx="282" cy="222" r="2.6" />
          <circle cx="298" cy="222" r="2.6" />
          <rect x="284.5" y="231" width="11" height="2.6" rx="1.3" />
        </g>
      )}
    </>
  );
}

// No internet: the wi-fi crossed out in red
function NoConnectionPicture() {
  return (
    <svg className={styles["network-picture"]} viewBox="0 0 360 300" aria-hidden="true">
      <PictureBackground />
      <g fill="none" stroke="#c5d0c7" strokeWidth="13" strokeLinecap="round">
        <path d="M119 140 A72 72 0 0 1 221 140" />
        <path d="M136 157 A48 48 0 0 1 204 157" />
        <path d="M153 174 A24 24 0 0 1 187 174" />
      </g>
      <circle cx="170" cy="196" r="9" fill="#c5d0c7" />
      <path d="M118 106 L224 206" stroke="#ffffff" strokeWidth="20" strokeLinecap="round" />
      <path d="M118 106 L224 206" stroke="#d84b3c" strokeWidth="12" strokeLinecap="round" />
      <MilkBottle mood="sad" />
    </svg>
  );
}

// Slow internet: only the smallest wi-fi bar lit (gold) and a gold clock
function SlowConnectionPicture() {
  return (
    <svg className={styles["network-picture"]} viewBox="0 0 360 300" aria-hidden="true">
      <PictureBackground />
      <g fill="none" strokeWidth="13" strokeLinecap="round">
        <path d="M119 140 A72 72 0 0 1 221 140" stroke="#d5dcd6" />
        <path d="M136 157 A48 48 0 0 1 204 157" stroke="#d5dcd6" />
        <path d="M153 174 A24 24 0 0 1 187 174" stroke="#e9a23b" />
      </g>
      <circle cx="170" cy="196" r="9" fill="#e9a23b" />
      <circle cx="232" cy="118" r="21" fill="#ffffff" stroke="#e9a23b" strokeWidth="5" />
      <path d="M232 105 V119 L242 125" fill="none" stroke="#b87516" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <MilkBottle mood="waiting" />
    </svg>
  );
}

type TipIconName = "router" | "phone" | "shield" | "pin" | "pause" | "swap";

function TipIcon({ icon }: { icon: TipIconName }) {
  return (
    <span className={styles["network-tip-icon"]} aria-hidden="true">
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
        {icon === "pin" && (
          <>
            <path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" />
            <circle cx="12" cy="10" r="2.2" />
          </>
        )}
        {icon === "pause" && (
          <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M10 9v6M14 9v6" />
          </>
        )}
        {icon === "swap" && (
          <>
            <path d="M5 9h13l-3-3" />
            <path d="M19 15H6l3 3" />
          </>
        )}
      </svg>
    </span>
  );
}

type ConnectionTip = { icon: TipIconName; desktopTitle: string; desktopText: string; phoneTitle: string; phoneText: string };

// Desktop: a row of cards; phones: one card with the tips stacked (each design has its own wording)
function ConnectionTips({ tips }: { tips: ConnectionTip[] }) {
  return (
    <ul className={styles["network-tips"]}>
      {tips.map((tip) => (
        <li key={tip.icon} className={styles["network-tip"]}>
          <TipIcon icon={tip.icon} />
          <span>
            <span className={styles["network-tip-title"]}>
              <span className={styles["network-desktop-only"]}>{tip.desktopTitle}</span>
              <span className={styles["network-phone-only"]}>{tip.phoneTitle}</span>
            </span>
            <span className={styles["network-tip-text"]}>
              <span className={styles["network-desktop-only"]}>{tip.desktopText}</span>
              <span className={styles["network-phone-only"]}>{tip.phoneText}</span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const noConnectionTips: ConnectionTip[] = [
  { icon: "router", desktopTitle: "Check your router", desktopText: "Make sure the lights are on", phoneTitle: "Check your Wi-Fi", phoneText: "Make sure the router is on" },
  { icon: "phone", desktopTitle: "Try mobile data", desktopText: "Or switch to another Wi-Fi", phoneTitle: "Turn mobile data on", phoneText: "Or switch airplane mode off" },
  { icon: "shield", desktopTitle: "Turn off VPN", desktopText: "Then reload this page", phoneTitle: "Turn off VPN", phoneText: "Then try again" },
];

const slowConnectionTips: ConnectionTip[] = [
  { icon: "pin", desktopTitle: "Move closer", desktopText: "Stay near your Wi-Fi router", phoneTitle: "Move to a better spot", phoneText: "Near a window or the router" },
  { icon: "pause", desktopTitle: "Pause downloads", desktopText: "Stop videos and big uploads", phoneTitle: "Pause downloads", phoneText: "Stop videos and big uploads" },
  { icon: "swap", desktopTitle: "Switch network", desktopText: "Try mobile data instead", phoneTitle: "Switch network", phoneText: "Try Wi-Fi or mobile data" },
];

// The screen's frame: page cover, pale corner circles, logo; the page behind does not scroll
function NetworkScreenFrame({ labelledBy, describedBy, children }: { labelledBy: string; describedBy: string; children: React.ReactNode }) {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <div
      className={`${styles["network-screen"]} ${poppinsFont.variable} ${ubuntuFont.variable}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
    >
      <span className={styles["network-corner-circle-top"]} aria-hidden="true" />
      <span className={styles["network-corner-circle-bottom"]} aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element -- the plain file, loaded while online (see NetworkStatus) */}
      <img className={styles["network-logo"]} src={LOGO_SOURCE} alt="Chiranvi Farm" />
      <div className={styles["network-content"]}>{children}</div>
    </div>
  );
}

function RefreshIcon({ isSpinning }: { isSpinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={isSpinning ? styles["network-try-again-icon-spinning"] : undefined}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v4h-4" />
    </svg>
  );
}

// ---------- No internet connection ----------

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

  // Countdown to the next check; focus on Try again
  useEffect(() => {
    tryAgainButtonRef.current?.focus();
    const countdown = window.setInterval(() => {
      secondsLeftRef.current -= 1;
      if (secondsLeftRef.current <= 0) {
        void checkConnectionRef.current();
        return;
      }
      setSecondsLeft(secondsLeftRef.current);
    }, 1000);
    return () => window.clearInterval(countdown);
  }, []);

  const secondsText = `${secondsLeft} ${secondsLeft === 1 ? "second" : "seconds"}`;

  return (
    <NetworkScreenFrame labelledBy="no-connection-heading" describedBy="no-connection-description">
      <NoConnectionPicture />

      <h1 id="no-connection-heading" className={styles["network-heading"]}>
        No internet connection
      </h1>
      <p id="no-connection-description" className={styles["network-description"]}>
        Looks like you&rsquo;re offline. Check your Wi-Fi or mobile data and try again.
        <span className={styles["network-description-second-line"]}>
          This page will reload on its own once you&rsquo;re back online.
        </span>
      </p>

      <button
        ref={tryAgainButtonRef}
        type="button"
        className={styles["network-try-again-button"]}
        disabled={isChecking}
        onClick={() => void checkConnection()}
      >
        <RefreshIcon isSpinning={isChecking} />
        {isChecking ? "Checking…" : "Try again"}
      </button>

      <p className={styles["network-status"]} role="status">
        <span className={styles["network-status-dot"]} aria-hidden="true" />
        {isChecking ? (
          "Checking your connection…"
        ) : (
          <>
            <span className={styles["network-desktop-only"]}>Offline · checking again in {secondsText}</span>
            <span className={styles["network-phone-only"]}>Checking again in {secondsText}</span>
          </>
        )}
      </p>

      <ConnectionTips tips={noConnectionTips} />

      <p className={styles["network-error-code"]}>Chiranvi Farms · Error OFFLINE</p>
    </NetworkScreenFrame>
  );
}

// ---------- Slow internet connection ----------

function SlowConnectionScreen({ pagePath, onKeepWaiting }: { pagePath: string; onKeepWaiting: () => void }) {
  // Pages can't know their real loading percentage: the bar starts at 20% and creeps towards 95%
  const [loadingPercent, setLoadingPercent] = useState(20);
  const [measuredSpeed] = useState(getMeasuredSpeed);
  const tryAgainButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    tryAgainButtonRef.current?.focus();
    const creep = window.setInterval(() => {
      setLoadingPercent((percent) => Math.min(95, percent + Math.max(1, Math.round((95 - percent) / 12))));
    }, 700);
    return () => window.clearInterval(creep);
  }, []);

  const speedText = measuredSpeed === null ? null : `${measuredSpeed < 10 ? measuredSpeed.toFixed(1) : Math.round(measuredSpeed)} Mbps`;

  return (
    <NetworkScreenFrame labelledBy="slow-connection-heading" describedBy="slow-connection-description">
      <SlowConnectionPicture />

      <h1 id="slow-connection-heading" className={styles["network-heading"]}>
        Slow internet connection
      </h1>
      <p id="slow-connection-description" className={styles["network-description"]}>
        <span className={styles["network-desktop-only"]}>
          This is taking longer than usual. Your network is slow right now,
          <span className={styles["network-description-second-line"]}>
            so please wait a moment &mdash; we&rsquo;ll keep trying in the background.
          </span>
        </span>
        <span className={styles["network-phone-only"]}>
          This is taking longer than usual.
          <span className={styles["network-description-phone-line"]}>Please wait a moment or try again.</span>
        </span>
      </p>

      {/* Progress: gold bar, "Loading… 42%" and the measured speed (where the browser gives it) */}
      <div className={styles["network-progress"]}>
        <div
          className={styles["network-progress-track"]}
          role="progressbar"
          aria-label="Loading the page"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={loadingPercent}
        >
          <span className={styles["network-progress-fill"]} style={{ width: `${loadingPercent}%` }} />
        </div>
        <p className={styles["network-progress-labels"]}>
          <span>Loading&hellip; {loadingPercent}%</span>
          {speedText && (
            <span>
              <span className={styles["network-desktop-only"]}>Network speed: </span>
              {speedText}
            </span>
          )}
        </p>
      </div>

      <div className={styles["network-buttons"]}>
        <button
          ref={tryAgainButtonRef}
          type="button"
          className={styles["network-try-again-button"]}
          onClick={() => window.location.assign(pagePath)}
        >
          <RefreshIcon />
          Try again
        </button>
        <button type="button" className={styles["network-keep-waiting-button"]} onClick={onKeepWaiting}>
          Keep waiting
        </button>
      </div>

      <ConnectionTips tips={slowConnectionTips} />

      <p className={styles["network-error-code"]}>Chiranvi Farms · Error SLOW_NETWORK</p>
    </NetworkScreenFrame>
  );
}

// ---------- Which screen shows ----------

export default function NetworkStatus() {
  const isOnline = useSyncExternalStore(subscribeToConnection, () => navigator.onLine, () => true);
  const pageLoad = useSyncExternalStore(subscribeToPageLoads, () => oldestPageLoad, () => null);
  // The page load shown as slow (by when it started), and "Keep waiting" (hidden until then)
  const [slowPageLoadStartedAt, setSlowPageLoadStartedAt] = useState<number | null>(null);
  const [hiddenUntil, setHiddenUntil] = useState(0);

  // While online, the logo is loaded once, so the screens can still show it without internet
  useEffect(() => {
    const logo = new Image();
    logo.src = LOGO_SOURCE;
  }, []);

  // A page still loading after 10 s (5 s on a measured slow connection), or after Keep waiting runs out
  useEffect(() => {
    if (!pageLoad) return;
    const speed = getMeasuredSpeed();
    const waitMilliseconds =
      speed !== null && speed < MEASURED_SLOW_BELOW_MBPS ? SLOW_AFTER_MILLISECONDS_ON_MEASURED_SLOW_NETWORK : SLOW_AFTER_MILLISECONDS;
    const showAt = Math.max(pageLoad.startedAt + waitMilliseconds, hiddenUntil);
    const timer = window.setTimeout(() => setSlowPageLoadStartedAt(pageLoad.startedAt), Math.max(0, showAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [pageLoad, hiddenUntil]);

  function keepWaiting() {
    setSlowPageLoadStartedAt(null);
    setHiddenUntil(Date.now() + SLOW_AFTER_MILLISECONDS);
  }

  if (!isOnline) return <NoConnectionScreen />;
  if (pageLoad && slowPageLoadStartedAt === pageLoad.startedAt) {
    return <SlowConnectionScreen key={pageLoad.startedAt} pagePath={pageLoad.pagePath} onKeepWaiting={keepWaiting} />;
  }
  return null;
}
