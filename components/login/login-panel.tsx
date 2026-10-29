"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addPendingProductToCart, forgetPendingCartProduct } from "@/store/cart-store";
import { createClient } from "@/lib/supabase/client";
import { loadCustomerProfile } from "@/store/customer-profiles-store";
import { rememberLogin, takePageAfterLogin } from "./login-status";
import styles from "./login-panel.module.css";

/*
  Login with a mobile number and a 6-digit OTP, in three steps (designs: Log in, Verify OTP, OTP expired):
    1. "enter-mobile-number"  - type a 10-digit mobile number, then Send OTP
    2. "verify-otp"           - type the 6-digit code; a countdown shows when a new code can be requested
    3. "otp-expired"          - the code's time ran out; request a new one or change the number
  The OTP is real: Supabase Auth makes the code, sends it (WhatsApp through Gupshup, once connected; the
  test numbers set in Supabase accept 123456 without a message) and checks it. A correct code logs the
  visitor in with Supabase; login-status.ts follows that login for the rest of the site.
  While Supabase answers, the button says "Sending…" / "Checking…"; a problem (wrong code, too many tries,
  no connection) shows in red under the field.
*/

type LoginStep = "enter-mobile-number" | "verify-otp" | "otp-expired";

const OTP_LENGTH = 6;
// Seconds a code stays valid (the same as "SMS OTP Expiry" in Supabase → Authentication → Phone).
// The countdown shows this; when it reaches 00:00 the boxes turn red ("OTP expired") and a new code can be
// requested.
const OTP_VALID_SECONDS = 60;

// Supabase's answer, in words the customer understands
function loginProblemMessage(error: { message?: string; status?: number; code?: string }) {
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  // The message service could not send the code (e.g. WhatsApp sending not connected yet)
  if (text.includes("sms_send_failed") || text.includes("provider")) return "We couldn't send the OTP to this number. Please try again in a moment.";
  if (text.includes("otp_expired") || text.includes("expired") || text.includes("invalid")) return "Wrong code. Check it and try again.";
  if (error.status === 429 || text.includes("rate") || text.includes("too many")) return "Too many tries. Please wait a minute and try again.";
  if (text.includes("fetch") || text.includes("network")) return "No internet connection. Check it and try again.";
  return "We couldn't send the OTP to this number. Please try again in a moment.";
}

// "9876543210" -> "98765 43210"
function formatMobileNumber(digits: string) {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/*
  layout "page"         - the /login page: a centred card on a grey page (desktop and direct visits).
  layout "bottom-sheet" - inside the phone bottom sheet (login-bottom-sheet.tsx): no grey page, and the
                         close button calls onClose instead of leaving the page.
*/

// True when the visitor reached the login from another page of this site (so Back stays on the site)
function cameFromThisSite() {
  const navigationApi = (window as { navigation?: { canGoBack?: boolean } }).navigation;
  if (typeof navigationApi?.canGoBack === "boolean") return navigationApi.canGoBack;
  return window.history.length > 1;
}
export default function LoginPanel({
  layout = "page",
  onClose,
}: {
  layout?: "page" | "bottom-sheet";
  onClose?: () => void;
}) {
  const [loginStep, setLoginStep] = useState<LoginStep>("enter-mobile-number");
  const [mobileNumberDigits, setMobileNumberDigits] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [focusedOtpBoxIndex, setFocusedOtpBoxIndex] = useState(0);
  const [secondsUntilOtpExpires, setSecondsUntilOtpExpires] = useState(OTP_VALID_SECONDS);
  // Time (in milliseconds) when the current code expires.
  const otpExpiresAtRef = useRef(0);
  const otpBoxRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  // Waiting for Supabase: sending the code, or checking it
  const [waitingFor, setWaitingFor] = useState<"sending" | "checking" | null>(null);
  // A problem to show in red (wrong code, couldn't send …)
  const [problem, setProblem] = useState("");

  const isMobileNumberComplete = mobileNumberDigits.length === 10;
  const isOtpComplete = otpDigits.every((otpDigit) => otpDigit !== "");
  const fullMobileNumber = `+91 ${formatMobileNumber(mobileNumberDigits)}`;

  // While verifying: count down once per second; when the code's time runs out, show "OTP expired".
  useEffect(() => {
    if (loginStep !== "verify-otp") return;
    const countdownTimer = window.setInterval(() => {
      const now = Date.now();
      setSecondsUntilOtpExpires(Math.max(0, Math.ceil((otpExpiresAtRef.current - now) / 1000)));
      if (now >= otpExpiresAtRef.current) setLoginStep("otp-expired");
    }, 1000);
    return () => window.clearInterval(countdownTimer);
  }, [loginStep]);

  // Put the cursor in the first OTP box when the verify step opens.
  useEffect(() => {
    if (loginStep === "verify-otp") otpBoxRefs.current[0]?.focus();
  }, [loginStep]);

  // Asks Supabase to send a code to +91 and the number; only then the code boxes open
  async function sendOtp() {
    if (waitingFor) return;
    setWaitingFor("sending");
    setProblem("");
    const { error } = await createClient().auth.signInWithOtp({ phone: `+91${mobileNumberDigits}` });
    setWaitingFor(null);
    if (error) {
      setProblem(loginProblemMessage(error));
      return;
    }
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    setFocusedOtpBoxIndex(0);
    setSecondsUntilOtpExpires(OTP_VALID_SECONDS);
    otpExpiresAtRef.current = Date.now() + OTP_VALID_SECONDS * 1000;
    setLoginStep("verify-otp");
  }

  // Sends the typed code to Supabase; a correct code logs the visitor in
  async function verifyOtpAndLogIn() {
    if (!isOtpComplete || waitingFor) return;
    setWaitingFor("checking");
    setProblem("");
    const { error } = await createClient().auth.verifyOtp({ phone: `+91${mobileNumberDigits}`, token: otpDigits.join(""), type: "sms" });
    setWaitingFor(null);
    if (error) {
      setProblem(loginProblemMessage(error));
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      otpBoxRefs.current[0]?.focus();
      return;
    }
    rememberLogin(mobileNumberDigits);
    // Their saved Profile, read from the database (null: a new customer)
    const savedProfile = await loadCustomerProfile(mobileNumberDigits, true);
    // A new customer (no saved profile yet): straight to the Profile page to fill in their details
    // (a product they were adding still goes into the cart first). Back from Profile returns to where they
    // started (e.g. Best Sellers), not to the login: the login page is replaced by Profile in the history
    // (the phone sheet is not a page of its own, so there Profile is simply opened on top).
    if (!savedProfile) {
      addPendingProductToCart();
      takePageAfterLogin();
      onClose?.();
      if (layout === "bottom-sheet") router.push("/account");
      else router.replace("/account");
      return;
    }
    // Login started from "Add to cart": the product goes into the cart and the visitor stays on the
    // landing page (the phone sheet just closes; the login page goes back to the landing page).
    if (addPendingProductToCart()) {
      if (layout === "bottom-sheet") onClose?.();
      else router.back();
      return;
    }
    // Login started from the cart icon, profile icon or an account page: open that page
    // (the cart page when nothing was noted).
    onClose?.();
    router.push(takePageAfterLogin() ?? "/cart");
  }

  /*
    × on the login page: back to the page and spot the visitor came from (Best Sellers, a product page,
    the cart...), or the home page when the login was opened directly. Nothing waiting is kept: the
    product from "Add to cart" and the noted page are forgotten, so a later login doesn't use them.
  */
  function closeLoginPage() {
    forgetPendingCartProduct();
    takePageAfterLogin();
    if (cameFromThisSite()) router.back();
    else router.push("/");
  }

  function changeMobileNumber() {
    setProblem("");
    setLoginStep("enter-mobile-number");
  }

  function updateOtpDigit(boxIndex: number, typedValue: string) {
    const typedDigit = typedValue.replace(/\D/g, "").slice(-1);
    setOtpDigits((digits) => digits.map((digit, index) => (index === boxIndex ? typedDigit : digit)));
    if (typedDigit && boxIndex < OTP_LENGTH - 1) otpBoxRefs.current[boxIndex + 1]?.focus();
  }

  function handleOtpBoxKeyDown(boxIndex: number, event: KeyboardEvent<HTMLInputElement>) {
    // Backspace in an empty box goes back to the previous box.
    if (event.key === "Backspace" && !otpDigits[boxIndex] && boxIndex > 0) {
      otpBoxRefs.current[boxIndex - 1]?.focus();
    }
  }

  function handleOtpPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pastedDigits) return;
    event.preventDefault();
    setOtpDigits(Array.from({ length: OTP_LENGTH }, (_, index) => pastedDigits[index] ?? ""));
    otpBoxRefs.current[Math.min(pastedDigits.length, OTP_LENGTH - 1)]?.focus();
  }

  const closeIcon = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
  const closeButton =
    layout === "bottom-sheet" ? (
      <button type="button" onClick={onClose} aria-label="Close login" className={styles["login-close-button"]}>
        {closeIcon}
      </button>
    ) : (
      <button type="button" onClick={closeLoginPage} aria-label="Close and go back" className={styles["login-close-button"]}>
        {closeIcon}
      </button>
    );

  return (
    <div className={layout === "bottom-sheet" ? undefined : styles["login-page-background"]}>
      <section
        className={`${styles["login-card"]} ${layout === "bottom-sheet" ? styles["login-card-in-bottom-sheet"] : ""}`}
        aria-labelledby="login-card-heading"
      >
        {/* The bottom sheet has no close button; tapping the dimmed page above it closes it. */}
        {layout === "bottom-sheet" ? null : closeButton}

        {loginStep === "enter-mobile-number" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (isMobileNumberComplete) sendOtp();
            }}
          >
            <h1 id="login-card-heading" className={styles["login-heading"]}>
              Log in
            </h1>
            {/* Phone bottom sheet: compact, like the phone design (no description or field label). */}
            {layout === "bottom-sheet" ? null : (
              <>
                <p className={styles["login-description"]}>
                  Enter your mobile number. We’ll send you{" "}
                  <br />
                  a 6-digit OTP to verify it’s you.
                </p>
                <label htmlFor="login-mobile-number" className={styles["login-field-label"]}>
                  Mobile number
                </label>
              </>
            )}
            <div className={styles["login-mobile-number-field"]}>
              <span className={styles["login-country-code"]}>+91</span>
              <span className={styles["login-country-code-divider"]} aria-hidden="true" />
              <input
                id="login-mobile-number"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={layout === "bottom-sheet" ? "Mobile number" : "98765 43210"}
                aria-label="Mobile number"
                value={formatMobileNumber(mobileNumberDigits)}
                onChange={(event) => setMobileNumberDigits(event.target.value.replace(/\D/g, "").slice(0, 10))}
                className={styles["login-mobile-number-input"]}
              />
            </div>
            <p className={styles["login-field-hint"]}>OTP will be sent by Whatsapp to this number.</p>
            {problem && (
              <p className={styles["login-error-message"]} role="alert">
                <span className={styles["login-error-icon"]} aria-hidden="true">
                  !
                </span>
                {problem}
              </p>
            )}

            <button type="submit" disabled={!isMobileNumberComplete || waitingFor !== null} className={styles["login-primary-button"]}>
              {waitingFor === "sending" ? "Sending…" : "Send OTP"}
            </button>
            <p className={styles["login-footnote"]}>
              By continuing you agree to our <Link href="#">Terms</Link> and <Link href="#">Privacy Policy</Link>
            </p>
          </form>
        )}

        {loginStep !== "enter-mobile-number" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (loginStep === "otp-expired") sendOtp();
              else verifyOtpAndLogIn();
            }}
          >
            <h1 id="login-card-heading" className={styles["login-heading"]}>
              {loginStep === "otp-expired" ? "OTP expired" : "Verify OTP"}
            </h1>
            <p className={styles["login-description"]}>Enter the 6-digit code sent to</p>
            <p className={styles["login-sent-to-number"]}>
              <span
                className={
                  loginStep === "otp-expired"
                    ? styles["login-sent-to-number-bold"]
                    : styles["login-sent-to-number-regular"]
                }
              >
                {fullMobileNumber}
              </span>
              {loginStep === "otp-expired" && (
                <button type="button" onClick={changeMobileNumber} className={styles["login-edit-number-button"]}>
                  Edit
                </button>
              )}
            </p>

            <div
              className={`${styles["login-otp-boxes"]} ${
                loginStep === "otp-expired" ? styles["login-otp-boxes-expired"] : ""
              }`}
              role="group"
              aria-label="6-digit code"
            >
              {otpDigits.map((otpDigit, boxIndex) => (
                <input
                  key={boxIndex}
                  ref={(otpBox) => {
                    otpBoxRefs.current[boxIndex] = otpBox;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={boxIndex === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  aria-label={`Digit ${boxIndex + 1}`}
                  value={loginStep === "otp-expired" ? "" : otpDigit}
                  disabled={loginStep === "otp-expired"}
                  onChange={(event) => updateOtpDigit(boxIndex, event.target.value)}
                  onKeyDown={(event) => handleOtpBoxKeyDown(boxIndex, event)}
                  onPaste={handleOtpPaste}
                  onFocus={() => setFocusedOtpBoxIndex(boxIndex)}
                  className={`${styles["login-otp-box"]} ${otpDigit ? styles["login-otp-box-filled"] : ""} ${
                    boxIndex === focusedOtpBoxIndex ? styles["login-otp-box-active"] : ""
                  }`}
                />
              ))}
            </div>

            {/* A wrong code or a problem sending replaces the countdown line with the red message */}
            {loginStep === "verify-otp" && !problem ? (
              <p className={styles["login-resend-status"]}>
                <span className={styles["login-resend-spinner"]} aria-hidden="true" />
                Resend OTP in <strong>{formatCountdown(secondsUntilOtpExpires)}</strong>
              </p>
            ) : (
              <p className={styles["login-error-message"]} role="alert">
                <span className={styles["login-error-icon"]} aria-hidden="true">
                  !
                </span>
                {problem || "The code has expired. Request a new one."}
              </p>
            )}

            <button
              type="submit"
              disabled={(loginStep === "verify-otp" && !isOtpComplete) || waitingFor !== null}
              className={styles["login-primary-button"]}
            >
              {waitingFor === "checking"
                ? "Checking…"
                : waitingFor === "sending"
                  ? "Sending…"
                  : loginStep === "otp-expired"
                    ? "Resend OTP"
                    : "Verify & log in"}
            </button>

            {loginStep === "verify-otp" ? (
              <p className={styles["login-footnote"]}>
                Entered Wrong Number?{" "}
                <button type="button" onClick={changeMobileNumber} className={styles["login-footnote-button"]}>
                  Change It
                </button>
              </p>
            ) : (
              <p className={styles["login-footnote"]}>
                <button
                  type="button"
                  onClick={changeMobileNumber}
                  className={`${styles["login-footnote-button"]} ${styles["login-footnote-button-medium"]}`}
                >
                  Or try a different number
                </button>
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
