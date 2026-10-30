"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AGENT_REQUEST_KINDS,
  NOT_DELIVERED_REASONS,
  STOP_STEPS,
  callLink,
  finishStop,
  formatTime,
  messageLink,
  navigationLink,
  raiseRequest,
  rupees,
  setStopStep,
  shrinkPhoto,
  whatsAppLink,
  type AgentRequestKind,
  type AgentStop,
  type StopOutcome,
  type StopProof,
} from "@/store/delivery-agent-store";
import {
  DeliveryNotice,
  DeliveryPageHeading,
  DeliverySheet,
  DeliveryShiftNotices,
  deliveryButtonStyles,
  useDeliveryPanel,
} from "./delivery-panel-layout";
import styles from "./delivery-ongoing-page.module.css";

/*
  Deliveries → Ongoing (/delivery): the stop the agent is on now.
  - The customer: name, phone, address, landmark, gate code; Call, WhatsApp and Message; Navigate (Google Maps).
  - What to hand over (products and quantities), empty bottles to collect, cash to collect, the customer's note.
  - Steps: Picked up → On the way → Reached → Delivered (one button for the next step).
  - Finish: Delivered (proof: the customer's OTP or a photo), Left at door (photo), Not delivered (reason).
    The stop then moves to Completed and the next stop becomes Ongoing.
  - Raise a request to the manager (customer unavailable, wrong address, damaged product, missing item,
    reschedule, other); the stop's requests are listed with their status.
  Off duty: everything shows, but nothing can be changed until the agent goes on duty.
*/

type OpenSheet = { kind: "finish"; outcome: StopOutcome } | { kind: "request" } | null;

export default function DeliveryOngoingPage() {
  const { login, stops } = useDeliveryPanel();
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const stop = stops.ongoing;
  const totalStops = stops.completed.length + stops.upNext.length + (stop ? 1 : 0);
  const canWork = stops.isOnDuty;

  return (
    <>
      <DeliveryPageHeading
        title="Ongoing"
        description="The stop you're on now. Finish it to move on: the next stop comes here by itself."
      />
      <DeliveryShiftNotices />

      {login.route && !stop && (
        <DeliveryNotice title="All stops done for today" text="Well done! Every stop on your list is finished.">
          <Link href="/delivery/completed" className={deliveryButtonStyles.filled}>
            See completed stops
          </Link>
        </DeliveryNotice>
      )}

      {stop && (
        <div className={styles["ongoing-columns"]}>
          {/* The customer and how to reach them */}
          <section className={styles["ongoing-card"]} aria-labelledby="ongoing-customer-name">
            <div className={styles["ongoing-stop-tags"]}>
              <span className={styles["ongoing-stop-number"]}>
                Stop {stops.completed.length + 1} of {totalStops}
              </span>
              <span className={styles["ongoing-slot"]}>{stop.slot}</span>
              {stop.changedByDispatch && <span className={styles["ongoing-dispatch-tag"]}>Changed by dispatch</span>}
            </div>
            <h2 id="ongoing-customer-name" className={styles["ongoing-customer-name"]}>
              {stop.customerName}
            </h2>
            <p className={styles["ongoing-customer-phone"]}>+91 {stop.phone}</p>

            <dl className={styles["ongoing-address-list"]}>
              <div>
                <dt>Address</dt>
                <dd>{stop.address}, Bengaluru</dd>
              </div>
              <div>
                <dt>Landmark</dt>
                <dd>{stop.landmark}</dd>
              </div>
              {stop.gateCode && (
                <div>
                  <dt>Gate code</dt>
                  <dd className={styles["ongoing-gate-code"]}>{stop.gateCode}</dd>
                </div>
              )}
            </dl>

            <div className={styles["ongoing-contact-buttons"]}>
              <a href={callLink(stop.phone)} className={styles["ongoing-contact-button"]}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
                </svg>
                Call
              </a>
              <a href={whatsAppLink(stop.phone)} target="_blank" rel="noreferrer" className={styles["ongoing-contact-button"]}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Z" />
                </svg>
                WhatsApp
              </a>
              <a href={messageLink(stop.phone)} className={styles["ongoing-contact-button"]}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5h16v11H8l-4 4V5Z" />
                </svg>
                Message
              </a>
            </div>
            <a href={navigationLink(stop)} target="_blank" rel="noreferrer" className={`${deliveryButtonStyles.filled} ${styles["ongoing-navigate-button"]}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles["ongoing-navigate-icon"]}>
                <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
                <path d="M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
              </svg>
              Navigate in Google Maps
            </a>
          </section>

          {/* What to hand over and collect */}
          <section className={styles["ongoing-card"]} aria-labelledby="ongoing-items-title">
            <h3 id="ongoing-items-title" className={styles["ongoing-card-title"]}>
              Hand over
            </h3>
            <ul className={styles["ongoing-item-list"]}>
              {stop.items.map((item) => (
                <li key={`${item.name}-${item.packSize}`} className={styles["ongoing-item"]}>
                  <span>
                    <span className={styles["ongoing-item-name"]}>{item.name}</span>
                    <span className={styles["ongoing-item-pack"]}>{item.packSize}</span>
                  </span>
                  <span className={styles["ongoing-item-quantity"]}>× {item.quantity}</span>
                </li>
              ))}
            </ul>
            <div className={styles["ongoing-collect-row"]}>
              <span className={styles["ongoing-collect-label"]}>Empty bottles to collect</span>
              <span className={styles["ongoing-collect-value"]}>{stop.bottlesToCollect}</span>
            </div>
            {stop.cashToCollect > 0 && (
              <div className={styles["ongoing-collect-row"]}>
                <span className={styles["ongoing-collect-label"]}>Cash to collect</span>
                <span className={styles["ongoing-collect-value"]}>{rupees(stop.cashToCollect)}</span>
              </div>
            )}
            {stop.note && (
              <p className={styles["ongoing-note"]}>
                <span className={styles["ongoing-note-label"]}>Customer note</span>
                {stop.note}
              </p>
            )}
          </section>

          {/* Steps and finishing the stop */}
          <section className={`${styles["ongoing-card"]} ${styles["ongoing-card-wide"]}`} aria-labelledby="ongoing-status-title">
            <h3 id="ongoing-status-title" className={styles["ongoing-card-title"]}>
              Status
            </h3>
            <StatusSteps stop={stop} />
            <NextStepButton stop={stop} mobileNumber={login.mobileNumber} canWork={canWork} />

            <div className={styles["ongoing-finish-buttons"]}>
              <button
                type="button"
                className={deliveryButtonStyles.filled}
                disabled={!canWork}
                onClick={() => setOpenSheet({ kind: "finish", outcome: "delivered" })}
              >
                Mark as delivered
              </button>
              <button
                type="button"
                className={deliveryButtonStyles.outlined}
                disabled={!canWork}
                onClick={() => setOpenSheet({ kind: "finish", outcome: "left-at-door" })}
              >
                Left at door
              </button>
              <button
                type="button"
                className={deliveryButtonStyles.danger}
                disabled={!canWork}
                onClick={() => setOpenSheet({ kind: "finish", outcome: "not-delivered" })}
              >
                Not delivered
              </button>
            </div>

            <div className={styles["ongoing-request-row"]}>
              <p className={styles["ongoing-request-text"]}>A problem at this stop?</p>
              <button
                type="button"
                className={`${deliveryButtonStyles.outlined} ${deliveryButtonStyles.small}`}
                disabled={!canWork}
                onClick={() => setOpenSheet({ kind: "request" })}
              >
                Raise a request to the manager
              </button>
            </div>
            {stop.requests.length > 0 && (
              <ul className={styles["ongoing-request-list"]}>
                {stop.requests.map((request) => (
                  <li key={request.id} className={styles["ongoing-request"]}>
                    <span>
                      <span className={styles["ongoing-request-kind"]}>{request.kind}</span>
                      {request.note && <span className={styles["ongoing-request-note"]}>{request.note}</span>}
                    </span>
                    <span
                      className={`${styles["ongoing-request-status"]} ${
                        request.status === "Resolved" ? styles["ongoing-request-status-resolved"] : ""
                      }`}
                    >
                      {request.status} · {formatTime(request.raisedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {stop && openSheet?.kind === "finish" && (
        <FinishStopSheet stop={stop} outcome={openSheet.outcome} mobileNumber={login.mobileNumber} onClose={() => setOpenSheet(null)} />
      )}
      {stop && openSheet?.kind === "request" && (
        <RequestSheet stop={stop} mobileNumber={login.mobileNumber} onClose={() => setOpenSheet(null)} />
      )}
    </>
  );
}

// Picked up → On the way → Reached → Delivered, the reached ones ticked
function StatusSteps({ stop }: { stop: AgentStop }) {
  const reachedIndex = stop.step ? STOP_STEPS.findIndex((step) => step.key === stop.step) : -1;
  const steps = [...STOP_STEPS.map((step) => step.label), "Delivered"];
  return (
    <ol className={styles["ongoing-steps"]}>
      {steps.map((label, index) => {
        const state = index <= reachedIndex ? "done" : index === reachedIndex + 1 ? "current" : "later";
        return (
          <li key={label} className={`${styles["ongoing-step"]} ${styles[`ongoing-step-${state}`]}`} aria-current={state === "current" ? "step" : undefined}>
            <span className={styles["ongoing-step-circle"]} aria-hidden="true">
              {state === "done" ? (
                <svg viewBox="0 0 24 24">
                  <path d="M6 12.5l4 4 8-8" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <span className={styles["ongoing-step-label"]}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

// One button for the next step (after Reached, the stop is finished with the buttons below)
function NextStepButton({ stop, mobileNumber, canWork }: { stop: AgentStop; mobileNumber: string; canWork: boolean }) {
  const reachedIndex = stop.step ? STOP_STEPS.findIndex((step) => step.key === stop.step) : -1;
  const nextStep = STOP_STEPS[reachedIndex + 1];
  if (!nextStep) return <p className={styles["ongoing-step-hint"]}>You&apos;ve reached the customer. Finish the stop below.</p>;
  return (
    <button
      type="button"
      className={`${deliveryButtonStyles.outlined} ${styles["ongoing-next-step-button"]}`}
      disabled={!canWork}
      onClick={() => setStopStep(mobileNumber, stop.id, nextStep.key)}
    >
      Mark as {nextStep.label.toLowerCase()}
    </button>
  );
}

/*
  Finishing the stop:
  - Delivered: proof by the customer's OTP (4 digits) or a photo; bottles and cash collected.
  - Left at door: a photo of what was left; bottles collected.
  - Not delivered: why.
*/
function FinishStopSheet({
  stop,
  outcome,
  mobileNumber,
  onClose,
}: {
  stop: AgentStop;
  outcome: StopOutcome;
  mobileNumber: string;
  onClose: () => void;
}) {
  const [proofKind, setProofKind] = useState<"otp" | "photo">(outcome === "left-at-door" ? "photo" : "otp");
  const [otp, setOtp] = useState("");
  const [photo, setPhoto] = useState("");
  const [bottlesCollected, setBottlesCollected] = useState(String(stop.bottlesToCollect));
  const [cashCollected, setCashCollected] = useState(String(stop.cashToCollect));
  const [reason, setReason] = useState(NOT_DELIVERED_REASONS[0]);
  const [error, setError] = useState("");
  const isNotDelivered = outcome === "not-delivered";

  async function takePhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await shrinkPhoto(file));
      setError("");
    } catch {
      setError("That photo couldn't be used. Please take it again.");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (isNotDelivered) {
      finishStop(mobileNumber, stop.id, outcome, { notDeliveredReason: reason });
      onClose();
      return;
    }
    let proof: StopProof;
    if (proofKind === "otp") {
      if (!/^\d{4}$/.test(otp)) {
        setError("Enter the 4-digit OTP the customer reads out.");
        return;
      }
      proof = { kind: "otp", code: otp };
    } else {
      if (!photo) {
        setError("Take a photo of the delivery first.");
        return;
      }
      proof = { kind: "photo", photo };
    }
    finishStop(mobileNumber, stop.id, outcome, {
      proof,
      bottlesCollected: Math.max(0, Number(bottlesCollected) || 0),
      cashCollected: outcome === "delivered" ? Math.max(0, Number(cashCollected) || 0) : 0,
    });
    onClose();
  }

  const title = isNotDelivered ? "Not delivered" : outcome === "left-at-door" ? "Left at door" : "Mark as delivered";

  return (
    <DeliverySheet title={title} onClose={onClose}>
      <form onSubmit={submit} className={styles["ongoing-form"]}>
        <p className={styles["ongoing-form-stop"]}>
          {stop.customerName} · {stop.address}
        </p>

        {isNotDelivered ? (
          <label className={styles["ongoing-field"]}>
            <span className={styles["ongoing-field-label"]}>Why wasn&apos;t it delivered?</span>
            <select className={styles["ongoing-input"]} value={reason} onChange={(event) => setReason(event.target.value)}>
              {NOT_DELIVERED_REASONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        ) : (
          <>
            {outcome === "delivered" && (
              <fieldset className={styles["ongoing-field"]}>
                <legend className={styles["ongoing-field-label"]}>Proof of delivery</legend>
                <div className={styles["ongoing-proof-options"]}>
                  {(["otp", "photo"] as const).map((kind) => (
                    <label
                      key={kind}
                      className={`${styles["ongoing-proof-option"]} ${proofKind === kind ? styles["ongoing-proof-option-chosen"] : ""}`}
                    >
                      <input type="radio" name="proof-kind" checked={proofKind === kind} onChange={() => setProofKind(kind)} />
                      {kind === "otp" ? "Customer's OTP" : "Photo"}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {proofKind === "otp" && outcome === "delivered" ? (
              <label className={styles["ongoing-field"]}>
                <span className={styles["ongoing-field-label"]}>OTP from the customer</span>
                <input
                  className={styles["ongoing-input"]}
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="one-time-code"
                  placeholder="4 digits"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                />
              </label>
            ) : (
              <label className={styles["ongoing-field"]}>
                <span className={styles["ongoing-field-label"]}>
                  {outcome === "left-at-door" ? "Photo of what you left at the door" : "Photo of the delivery"}
                </span>
                <input
                  className={styles["ongoing-photo-input"]}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => void takePhoto(event.target.files?.[0])}
                />
                {/* eslint-disable-next-line @next/next/no-img-element -- a photo just taken, not a site image */}
                {photo && <img src={photo} alt="The delivery photo" className={styles["ongoing-photo-preview"]} />}
              </label>
            )}
            <label className={styles["ongoing-field"]}>
              <span className={styles["ongoing-field-label"]}>Empty bottles collected</span>
              <input
                className={styles["ongoing-input"]}
                inputMode="numeric"
                value={bottlesCollected}
                onChange={(event) => setBottlesCollected(event.target.value.replace(/\D/g, ""))}
              />
            </label>
            {outcome === "delivered" && stop.cashToCollect > 0 && (
              <label className={styles["ongoing-field"]}>
                <span className={styles["ongoing-field-label"]}>Cash collected (₹)</span>
                <input
                  className={styles["ongoing-input"]}
                  inputMode="numeric"
                  value={cashCollected}
                  onChange={(event) => setCashCollected(event.target.value.replace(/\D/g, ""))}
                />
              </label>
            )}
          </>
        )}

        {error && (
          <p className={styles["ongoing-form-error"]} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={isNotDelivered ? deliveryButtonStyles.danger : deliveryButtonStyles.filled}>
          {isNotDelivered ? "Mark as not delivered" : "Finish this stop"}
        </button>
      </form>
    </DeliverySheet>
  );
}

// A request to the manager about this stop
function RequestSheet({ stop, mobileNumber, onClose }: { stop: AgentStop; mobileNumber: string; onClose: () => void }) {
  const [kind, setKind] = useState<AgentRequestKind>(AGENT_REQUEST_KINDS[0]);
  const [note, setNote] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    raiseRequest(mobileNumber, stop, kind, note);
    onClose();
  }

  return (
    <DeliverySheet title="Raise a request" onClose={onClose}>
      <form onSubmit={submit} className={styles["ongoing-form"]}>
        <p className={styles["ongoing-form-stop"]}>
          {stop.customerName} · {stop.address}
        </p>
        <label className={styles["ongoing-field"]}>
          <span className={styles["ongoing-field-label"]}>What&apos;s wrong?</span>
          <select className={styles["ongoing-input"]} value={kind} onChange={(event) => setKind(event.target.value as AgentRequestKind)}>
            {AGENT_REQUEST_KINDS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className={styles["ongoing-field"]}>
          <span className={styles["ongoing-field-label"]}>Details for the manager</span>
          <textarea
            className={styles["ongoing-textarea"]}
            rows={3}
            placeholder="E.g. called twice, no answer"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <button type="submit" className={deliveryButtonStyles.filled}>
          Send to the manager
        </button>
      </form>
    </DeliverySheet>
  );
}
