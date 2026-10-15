"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SavedAddress } from "@/store/address-store";
import styles from "./address-form-dialog.module.css";

/*
  Pop-up form to add a new address or edit one (opened from "Add new address" / "Edit" on My Addresses,
  and from the address step of the cart checkout).
  Fields: address name (Home / Work / Other), full name, mobile number, house / flat and street,
  area, city (Bengaluru only, as we deliver only there) and pincode, plus "Make this my default address".
  Checks before saving: every field filled, a 10-digit mobile number and a 6-digit pincode.
  Cancel, the close button, Escape or a click on the dimmed page closes it without saving.
*/

export type { SavedAddress };

const addressLabels = ["Home", "Work", "Other"];

type FormValues = Omit<SavedAddress, "id">;
type FieldErrors = Partial<Record<keyof FormValues, string>>;

const emptyForm: FormValues = {
  label: "Home",
  name: "",
  mobileNumber: "",
  houseAndStreet: "",
  area: "",
  city: "Bengaluru",
  pincode: "",
};

function findFieldErrors(formValues: FormValues): FieldErrors {
  const fieldErrors: FieldErrors = {};
  if (!formValues.name.trim()) fieldErrors.name = "Enter the full name";
  if (formValues.mobileNumber.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").length !== 10) {
    fieldErrors.mobileNumber = "Enter a 10-digit mobile number";
  }
  if (!formValues.houseAndStreet.trim()) fieldErrors.houseAndStreet = "Enter the house / flat and street";
  if (!formValues.area.trim()) fieldErrors.area = "Enter the area";
  if (!/^\d{6}$/.test(formValues.pincode.trim())) fieldErrors.pincode = "Enter a 6-digit pincode";
  return fieldErrors;
}

export default function AddressFormDialog({
  addressToEdit,
  isDefaultAtStart,
  onSave,
  onClose,
}: {
  addressToEdit: SavedAddress | null;
  isDefaultAtStart: boolean;
  onSave: (address: FormValues, shouldBeDefault: boolean) => void;
  onClose: () => void;
}) {
  const [formValues, setFormValues] = useState<FormValues>(() => (addressToEdit ? { ...addressToEdit } : emptyForm));
  const [shouldBeDefault, setShouldBeDefault] = useState(isDefaultAtStart);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const firstFieldRef = useRef<HTMLInputElement>(null);
  // Latest onClose, so the Escape listener below is set up only once.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Cursor in the first field; Escape closes; the page behind does not scroll while open.
  useEffect(() => {
    firstFieldRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", closeOnEscape);
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  function updateField(field: keyof FormValues, value: string) {
    setFormValues((previousValues) => ({ ...previousValues, [field]: value }));
    setFieldErrors((previousErrors) => ({ ...previousErrors, [field]: undefined }));
  }

  function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newFieldErrors = findFieldErrors(formValues);
    setFieldErrors(newFieldErrors);
    if (Object.keys(newFieldErrors).length > 0) return;
    onSave(
      {
        ...formValues,
        name: formValues.name.trim(),
        houseAndStreet: formValues.houseAndStreet.trim(),
        area: formValues.area.trim(),
        pincode: formValues.pincode.trim(),
      },
      shouldBeDefault,
    );
  }

  function renderTextField(
    field: keyof FormValues,
    label: string,
    options: { placeholder: string; inputMode?: "numeric" | "tel"; maxLength?: number; isWide?: boolean },
  ) {
    const errorId = `address-form-${field}-error`;
    return (
      <label className={`${styles["address-form-field"]} ${options.isWide ? styles["address-form-field-wide"] : ""}`}>
        <span className={styles["address-form-label"]}>{label}</span>
        <input
          ref={field === "name" ? firstFieldRef : undefined}
          value={formValues[field]}
          placeholder={options.placeholder}
          inputMode={options.inputMode}
          maxLength={options.maxLength}
          aria-invalid={fieldErrors[field] ? true : undefined}
          aria-describedby={fieldErrors[field] ? errorId : undefined}
          className={`${styles["address-form-input"]} ${fieldErrors[field] ? styles["address-form-input-error"] : ""}`}
          onChange={(event) => updateField(field, event.target.value)}
        />
        {fieldErrors[field] && (
          <span id={errorId} className={styles["address-form-error"]}>
            {fieldErrors[field]}
          </span>
        )}
      </label>
    );
  }

  return (
    <div className={styles["address-dialog-overlay"]}>
      <button
        type="button"
        aria-label="Close without saving"
        className={styles["address-dialog-dimmed-page"]}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-dialog-heading"
        className={styles["address-dialog"]}
      >
        <div className={styles["address-dialog-heading-row"]}>
          <h2 id="address-dialog-heading" className={styles["address-dialog-heading"]}>
            {addressToEdit ? "Edit address" : "Add new address"}
          </h2>
          <button type="button" aria-label="Close" className={styles["address-dialog-close-button"]} onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <p className={styles["address-dialog-description"]}>
          We currently deliver only to selected locations in Bengaluru.
        </p>

        <form noValidate onSubmit={saveAddress}>
          {/* Address name: Home / Work / Other */}
          <div className={styles["address-form-labels"]} role="radiogroup" aria-label="Save address as">
            {addressLabels.map((addressLabel) => (
              <button
                key={addressLabel}
                type="button"
                role="radio"
                aria-checked={formValues.label === addressLabel}
                className={`${styles["address-form-label-chip"]} ${
                  formValues.label === addressLabel ? styles["address-form-label-chip-selected"] : ""
                }`}
                onClick={() => updateField("label", addressLabel)}
              >
                {addressLabel}
              </button>
            ))}
          </div>

          <div className={styles["address-form-grid"]}>
            {renderTextField("name", "Full name", { placeholder: "Priya Sharma" })}
            {renderTextField("mobileNumber", "Mobile number", {
              placeholder: "+91 98450 12345",
              inputMode: "tel",
              maxLength: 16,
            })}
            {renderTextField("houseAndStreet", "House / flat and street", {
              placeholder: "#1312, Prestige Lakeside Habitat",
              isWide: true,
            })}
            {renderTextField("area", "Area", { placeholder: "Varthur" })}
            {renderTextField("pincode", "Pincode", { placeholder: "560087", inputMode: "numeric", maxLength: 6 })}
            <label className={`${styles["address-form-field"]} ${styles["address-form-field-wide"]}`}>
              <span className={styles["address-form-label"]}>City</span>
              <input
                value="Bengaluru"
                readOnly
                className={`${styles["address-form-input"]} ${styles["address-form-input-locked"]}`}
              />
            </label>
          </div>

          <label className={styles["address-form-default-option"]}>
            <input
              type="checkbox"
              checked={shouldBeDefault}
              onChange={(event) => setShouldBeDefault(event.target.checked)}
            />
            Make this my default address
          </label>

          <div className={styles["address-dialog-buttons"]}>
            <button type="button" className={styles["address-dialog-cancel-button"]} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles["address-dialog-save-button"]}>
              Save address
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
