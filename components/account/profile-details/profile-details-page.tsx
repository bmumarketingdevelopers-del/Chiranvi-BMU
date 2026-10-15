"use client";

import { useState, type FormEvent } from "react";
import { AccountPageHeading } from "../account-dashboard-layout";
import { saveAccountProfile, useAccountProfile, type AccountProfile } from "../account-profile";
import styles from "./profile-details-page.module.css";

/*
  "My Profile" dashboard page (design): welcome banner with the order numbers, the personal details
  form (Save changes keeps the new details until the page is refreshed) and the notification switches.
  Member since, customer ID, the banner numbers and the switches are placeholders from the design.
  The form starts empty, with the design values as grey example text; "Save changes" stores only the
  fields that were filled in (the sidebar name and welcome banner follow the saved name).
*/

// Grey example text in the empty fields (values from the design).
const fieldExamples: AccountProfile = {
  fullName: "Priya Sharma",
  mobileNumber: "+91 98450 12345",
  email: "priya.sharma@example.com",
  dateOfBirth: "14 / 08 / 1992",
  familySize: "3 – 4 members",
  preferredPlanType: "Weekly",
};

const emptyForm: AccountProfile = {
  fullName: "",
  mobileNumber: "",
  email: "",
  dateOfBirth: "",
  familySize: "",
  preferredPlanType: "",
};

const familySizeOptions = ["1 – 2 members", "3 – 4 members", "5 – 6 members", "7+ members"];
const planTypeOptions = ["Daily", "Weekly", "Monthly"];

const notificationSettings = [
  {
    id: "delivery-updates",
    title: "Delivery updates on WhatsApp",
    description: "Get a message when your milk is at the door.",
    isOnAtStart: true,
  },
  {
    id: "low-wallet-balance",
    title: "Low wallet balance alerts",
    description: "We remind you before your subscription pauses.",
    isOnAtStart: true,
  },
  {
    id: "offers-and-new-products",
    title: "Offers and new products",
    description: "At most one message a week.",
    isOnAtStart: false,
  },
];

const welcomeBannerNumbers = [
  { value: "24", label: "Orders" },
  { value: "186 L", label: "Milk delivered" },
  { value: "₹1,240", label: "Saved" },
];

export default function ProfileDetailsPage() {
  const accountProfile = useAccountProfile();
  // The form's own copy, saved to the account details with "Save changes".
  const [formValues, setFormValues] = useState<AccountProfile>(emptyForm);
  // The date box shows its example text until clicked, then becomes a date picker.
  const [isDateFieldFocused, setIsDateFieldFocused] = useState(false);
  const [isSavedMessageShown, setIsSavedMessageShown] = useState(false);
  const [switchedOnNotifications, setSwitchedOnNotifications] = useState(
    () => new Set(notificationSettings.filter((setting) => setting.isOnAtStart).map((setting) => setting.id)),
  );

  const firstName = accountProfile.fullName.trim().split(/\s+/)[0] ?? "";

  function updateFormValue(field: keyof AccountProfile, value: string) {
    setFormValues((previousValues) => ({ ...previousValues, [field]: value }));
    setIsSavedMessageShown(false);
  }

  function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Only the filled-in fields replace the saved details.
    const filledInFields = Object.fromEntries(
      Object.entries(formValues).filter(([, fieldValue]) => fieldValue.trim() !== ""),
    );
    saveAccountProfile({ ...accountProfile, ...filledInFields });
    setIsSavedMessageShown(true);
  }

  function toggleNotification(settingId: string) {
    setSwitchedOnNotifications((previousSettings) => {
      const newSettings = new Set(previousSettings);
      if (newSettings.has(settingId)) newSettings.delete(settingId);
      else newSettings.add(settingId);
      return newSettings;
    });
  }

  return (
    <>
      <AccountPageHeading title="My Profile" description="Your details, used for delivery and order updates." />

      <section className={styles["profile-welcome-banner"]} aria-label="Your account summary">
        <span className={styles["profile-welcome-banner-ring"]} aria-hidden="true" />
        <span className={styles["profile-welcome-banner-circle"]} aria-hidden="true" />
        <div className={styles["profile-welcome-banner-text"]}>
          <h2 className={styles["profile-welcome-heading"]}>
            Welcome back, <span className={styles["profile-welcome-name"]}>{firstName}</span>
          </h2>
          <p className={styles["profile-welcome-member-details"]}>Member since March 2025 · Customer ID CF-20418</p>
        </div>
        <dl className={styles["profile-welcome-numbers"]}>
          {welcomeBannerNumbers.map((bannerNumber) => (
            <div key={bannerNumber.label} className={styles["profile-welcome-number"]}>
              <dt className={styles["profile-welcome-number-label"]}>{bannerNumber.label}</dt>
              <dd className={styles["profile-welcome-number-value"]}>{bannerNumber.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <form className={styles["profile-card"]} onSubmit={saveChanges}>
        <h2 className={styles["profile-card-heading"]}>Personal details</h2>

        <div className={styles["profile-form-grid"]}>
          <label className={styles["profile-form-field"]}>
            <span className={styles["profile-form-label"]}>Full name</span>
            <input
              className={styles["profile-form-input"]}
              value={formValues.fullName}
              autoComplete="name"
              placeholder={fieldExamples.fullName}
              onChange={(event) => updateFormValue("fullName", event.target.value)}
            />
          </label>
          <label className={styles["profile-form-field"]}>
            <span className={styles["profile-form-label"]}>Mobile number</span>
            <input
              className={styles["profile-form-input"]}
              type="tel"
              value={formValues.mobileNumber}
              autoComplete="tel"
              placeholder={fieldExamples.mobileNumber}
              onChange={(event) => updateFormValue("mobileNumber", event.target.value)}
            />
          </label>
          <label className={styles["profile-form-field"]}>
            <span className={styles["profile-form-label"]}>Email</span>
            <input
              className={styles["profile-form-input"]}
              type="email"
              value={formValues.email}
              autoComplete="email"
              placeholder={fieldExamples.email}
              onChange={(event) => updateFormValue("email", event.target.value)}
            />
          </label>
          <label className={styles["profile-form-field"]}>
            <span className={styles["profile-form-label"]}>Date of birth</span>
            <input
              className={styles["profile-form-input"]}
              type={isDateFieldFocused || formValues.dateOfBirth ? "date" : "text"}
              value={formValues.dateOfBirth}
              placeholder={fieldExamples.dateOfBirth}
              onFocus={() => setIsDateFieldFocused(true)}
              onBlur={() => setIsDateFieldFocused(false)}
              onChange={(event) => updateFormValue("dateOfBirth", event.target.value)}
            />
          </label>
          <label className={styles["profile-form-field"]}>
            <span className={styles["profile-form-label"]}>Family size</span>
            <select
              className={`${styles["profile-form-input"]} ${styles["profile-form-select"]} ${
                formValues.familySize ? "" : styles["profile-form-select-empty"]
              }`}
              value={formValues.familySize}
              onChange={(event) => updateFormValue("familySize", event.target.value)}
            >
              <option value="" disabled hidden>
                {fieldExamples.familySize}
              </option>
              {familySizeOptions.map((familySize) => (
                <option key={familySize}>{familySize}</option>
              ))}
            </select>
          </label>
          <label className={styles["profile-form-field"]}>
            <span className={styles["profile-form-label"]}>Preferred plan type</span>
            <select
              className={`${styles["profile-form-input"]} ${styles["profile-form-select"]} ${
                formValues.preferredPlanType ? "" : styles["profile-form-select-empty"]
              }`}
              value={formValues.preferredPlanType}
              onChange={(event) => updateFormValue("preferredPlanType", event.target.value)}
            >
              <option value="" disabled hidden>
                {fieldExamples.preferredPlanType}
              </option>
              {planTypeOptions.map((planType) => (
                <option key={planType}>{planType}</option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles["profile-form-actions"]}>
          {isSavedMessageShown && (
            <p className={styles["profile-form-saved-message"]} role="status">
              Changes saved
            </p>
          )}
          <button type="submit" className={styles["profile-save-button"]}>
            Save changes
          </button>
        </div>
      </form>

      <section className={styles["profile-card"]} aria-labelledby="profile-notifications-heading">
        <h2 id="profile-notifications-heading" className={styles["profile-card-heading"]}>
          Notifications
        </h2>
        <ul className={styles["profile-notification-list"]}>
          {notificationSettings.map((setting) => {
            const isSwitchedOn = switchedOnNotifications.has(setting.id);
            return (
              <li key={setting.id} className={styles["profile-notification-row"]}>
                <div>
                  <p className={styles["profile-notification-title"]}>{setting.title}</p>
                  <p className={styles["profile-notification-description"]}>{setting.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSwitchedOn}
                  aria-label={setting.title}
                  className={`${styles["profile-notification-switch"]} ${
                    isSwitchedOn ? styles["profile-notification-switch-on"] : ""
                  }`}
                  onClick={() => toggleNotification(setting.id)}
                >
                  <span className={styles["profile-notification-switch-knob"]} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
