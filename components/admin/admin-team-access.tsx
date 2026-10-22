"use client";

import { useState, type FormEvent } from "react";
import { formatIndianMobileNumber } from "@/components/account/account-profile";
import {
  PANEL_FEATURES,
  removeStaffMember,
  saveOwnerDetails,
  saveStaffMember,
  useOwnerDetails,
  useStaffMembers,
  type PanelFeature,
  type StaffMember,
} from "@/store/staff-access-store";
import { AdminFeatureGate, AdminPageHeading } from "./admin-panel-layout";
import styles from "./admin-panel.module.css";

/*
  Access to the Chiranvi Panel, shown at the top of Roles & permissions (/admin/roles), owner only (it was
  the Staff page until Staff became the team list): give other mobile numbers access to the panel.
  - Admin: every panel page except this one.
  - Manager: only the features ticked here.
  The person logs in with that number as usual and finds "Chiranvi Panel" in their account.
  "Edit" fills the form with a person's access; saving the same number again updates it.
  The owner's own row has "Edit" too, to change their name or mobile number (OwnerRow below).
*/

type AccessForm = { name: string; mobileNumber: string; role: StaffMember["role"]; features: PanelFeature[] };

const EMPTY_FORM: AccessForm = { name: "", mobileNumber: "", role: "manager", features: [] };

export default function AdminTeamAccess() {
  return (
    <AdminFeatureGate feature="owner-only">
      <TeamAccessPage />
    </AdminFeatureGate>
  );
}

function TeamAccessPage() {
  const staffMembers = useStaffMembers();
  const owner = useOwnerDetails();
  const [accessForm, setAccessForm] = useState<AccessForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  // The number whose "Remove" was clicked, waiting for "Yes, remove"
  const [numberToRemove, setNumberToRemove] = useState<string | null>(null);

  const isUpdatingExisting = staffMembers.some((member) => member.mobileNumber === accessForm.mobileNumber);

  function updateForm(changes: Partial<AccessForm>) {
    setAccessForm((current) => ({ ...current, ...changes }));
    setFormError("");
    setSavedMessage("");
  }

  function toggleFeature(feature: PanelFeature) {
    updateForm({
      features: accessForm.features.includes(feature)
        ? accessForm.features.filter((existing) => existing !== feature)
        : [...accessForm.features, feature],
    });
  }

  function giveAccess(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const name = accessForm.name.trim();
    if (!name) return setFormError("Enter the person's name.");
    if (accessForm.mobileNumber.length !== 10) return setFormError("Enter a 10-digit mobile number.");
    if (accessForm.mobileNumber === owner.mobileNumber) return setFormError("This is the owner's number.");
    if (accessForm.role === "manager" && accessForm.features.length === 0) {
      return setFormError("Tick at least one page for the manager.");
    }
    saveStaffMember({
      name,
      mobileNumber: accessForm.mobileNumber,
      role: accessForm.role,
      features: accessForm.role === "manager" ? accessForm.features : [],
    });
    setSavedMessage(`${isUpdatingExisting ? "Access updated" : "Access given"} for ${name}.`);
    setAccessForm(EMPTY_FORM);
  }

  function editMember(member: StaffMember) {
    setAccessForm({ name: member.name, mobileNumber: member.mobileNumber, role: member.role, features: member.features });
    setFormError("");
    setSavedMessage("");
    setNumberToRemove(null);
  }

  return (
    <>
      <AdminPageHeading
        title="Roles & permissions"
        description="Choose who else can open the Chiranvi Panel. Admins can open every page except Staff and Roles & permissions; managers only the pages you tick."
      />

      <div className={styles["admin-team-columns"]}>
        <form className={styles["admin-card"]} onSubmit={giveAccess} noValidate>
          <h2 className={styles["admin-card-title"]}>{isUpdatingExisting ? "Update access" : "Add a person"}</h2>

          <label className={styles["admin-field"]}>
            <span className={styles["admin-field-label"]}>Name</span>
            <input
              type="text"
              value={accessForm.name}
              placeholder="Their name"
              onChange={(changeEvent) => updateForm({ name: changeEvent.target.value })}
              className={styles["admin-input"]}
            />
          </label>

          <label className={styles["admin-field"]}>
            <span className={styles["admin-field-label"]}>Mobile number</span>
            <span className={styles["admin-mobile-input"]}>
              <span className={styles["admin-mobile-input-prefix"]}>+91</span>
              <input
                type="tel"
                inputMode="numeric"
                value={accessForm.mobileNumber}
                placeholder="10-digit number"
                onChange={(changeEvent) => updateForm({ mobileNumber: changeEvent.target.value.replace(/\D/g, "").slice(0, 10) })}
                className={styles["admin-input"]}
              />
            </span>
          </label>

          <fieldset className={styles["admin-field"]}>
            <legend className={styles["admin-field-label"]}>Role</legend>
            <div className={styles["admin-role-options"]}>
              {(["admin", "manager"] as const).map((role) => (
                <label
                  key={role}
                  className={`${styles["admin-role-option"]} ${accessForm.role === role ? styles["admin-role-option-selected"] : ""}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={accessForm.role === role}
                    onChange={() => updateForm({ role })}
                  />
                  <span>
                    <span className={styles["admin-role-option-title"]}>{role === "admin" ? "Admin" : "Manager"}</span>
                    <span className={styles["admin-role-option-text"]}>
                      {role === "admin" ? "Every page except Staff and Roles" : "Only the pages you tick"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {accessForm.role === "manager" && (
            <fieldset className={styles["admin-field"]}>
              <legend className={styles["admin-field-label"]}>Pages this manager can open</legend>
              <div className={styles["admin-feature-options"]}>
                {PANEL_FEATURES.map((feature) => (
                  <label key={feature.key} className={styles["admin-feature-option"]}>
                    <input
                      type="checkbox"
                      checked={accessForm.features.includes(feature.key)}
                      onChange={() => toggleFeature(feature.key)}
                    />
                    <span>
                      <span className={styles["admin-role-option-title"]}>{feature.label}</span>
                      <span className={styles["admin-role-option-text"]}>{feature.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <p className={styles["admin-form-message"]} role="status">
            {formError ? <span className={styles["admin-form-error"]}>{formError}</span> : savedMessage}
          </p>

          <div className={styles["admin-form-buttons"]}>
            <button type="submit" className={styles["admin-button-filled"]}>
              {isUpdatingExisting ? "Update access" : "Give access"}
            </button>
            {(accessForm.name || accessForm.mobileNumber) && (
              <button type="button" className={styles["admin-button-outlined"]} onClick={() => updateForm(EMPTY_FORM)}>
                Clear
              </button>
            )}
          </div>
        </form>

        <section className={styles["admin-card"]} aria-labelledby="admin-team-list-heading">
          <h2 id="admin-team-list-heading" className={styles["admin-card-title"]}>
            People with access
          </h2>
          <ul className={styles["admin-team-list"]}>
            <OwnerRow staffMembers={staffMembers} />

            {staffMembers.map((member) => (
              <li key={member.mobileNumber} className={styles["admin-team-member"]}>
                <div>
                  <span className={styles["admin-team-member-name"]}>{member.name}</span>
                  <span className={styles["admin-team-member-number"]}>{formatIndianMobileNumber(member.mobileNumber)}</span>
                </div>
                <span className={styles["admin-role-badge"]}>{member.role === "admin" ? "Admin" : "Manager"}</span>
                <span className={styles["admin-team-member-features"]}>
                  {member.role === "admin"
                    ? "Every page except Staff and Roles"
                    : PANEL_FEATURES.filter((feature) => member.features.includes(feature.key))
                        .map((feature) => feature.label)
                        .join(", ")}
                </span>
                <div className={styles["admin-team-member-actions"]}>
                  {numberToRemove === member.mobileNumber ? (
                    <>
                      <button
                        type="button"
                        className={styles["admin-text-button-danger"]}
                        onClick={() => {
                          removeStaffMember(member.mobileNumber);
                          setNumberToRemove(null);
                          if (accessForm.mobileNumber === member.mobileNumber) setAccessForm(EMPTY_FORM);
                        }}
                      >
                        Yes, remove
                      </button>
                      <button type="button" className={styles["admin-text-button"]} onClick={() => setNumberToRemove(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className={styles["admin-text-button"]} onClick={() => editMember(member)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles["admin-text-button-danger"]}
                        onClick={() => setNumberToRemove(member.mobileNumber)}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {staffMembers.length === 0 && (
            <p className={styles["admin-note"]}>No one else has access yet. Add a person with the form.</p>
          )}
        </section>
      </div>
    </>
  );
}

/*
  The owner's own row: "Name (You)", their number, Owner, Everything, and "Edit".
  Edit opens a small form to change the name and the mobile number. A new number must be 10 digits and
  not already on the team; the owner stays logged in and uses the new number from then on.
*/
function OwnerRow({ staffMembers }: { staffMembers: StaffMember[] }) {
  const owner = useOwnerDetails();
  const [isEditing, setIsEditing] = useState(false);
  const [ownerName, setOwnerName] = useState(owner.name);
  const [ownerNumber, setOwnerNumber] = useState(owner.mobileNumber);
  const [ownerError, setOwnerError] = useState("");
  const [ownerSavedMessage, setOwnerSavedMessage] = useState("");

  function startEditing() {
    setOwnerName(owner.name);
    setOwnerNumber(owner.mobileNumber);
    setOwnerError("");
    setOwnerSavedMessage("");
    setIsEditing(true);
  }

  function saveOwner(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const name = ownerName.trim();
    if (!name) return setOwnerError("Enter your name.");
    if (ownerNumber.length !== 10) return setOwnerError("Enter a 10-digit mobile number.");
    if (staffMembers.some((member) => member.mobileNumber === ownerNumber)) {
      return setOwnerError("This number already belongs to someone on the team.");
    }
    const isNumberChanged = ownerNumber !== owner.mobileNumber;
    saveOwnerDetails({ name, mobileNumber: ownerNumber });
    setIsEditing(false);
    setOwnerSavedMessage(isNumberChanged ? "Saved. Log in with your new number from now on." : "Saved.");
  }

  if (isEditing) {
    return (
      <li className={styles["admin-owner-edit"]}>
        <form onSubmit={saveOwner} noValidate>
          <p className={styles["admin-owner-edit-title"]}>Your details</p>
          <div className={styles["admin-owner-edit-fields"]}>
            <label className={styles["admin-field"]}>
              <span className={styles["admin-field-label"]}>Your name</span>
              <input
                type="text"
                value={ownerName}
                onChange={(changeEvent) => {
                  setOwnerName(changeEvent.target.value);
                  setOwnerError("");
                }}
                className={styles["admin-input"]}
              />
            </label>
            <label className={styles["admin-field"]}>
              <span className={styles["admin-field-label"]}>Your mobile number</span>
              <span className={styles["admin-mobile-input"]}>
                <span className={styles["admin-mobile-input-prefix"]}>+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={ownerNumber}
                  onChange={(changeEvent) => {
                    setOwnerNumber(changeEvent.target.value.replace(/D/g, "").slice(0, 10));
                    setOwnerError("");
                  }}
                  className={styles["admin-input"]}
                />
              </span>
            </label>
          </div>
          <p className={styles["admin-form-message"]} role="status">
            {ownerError ? <span className={styles["admin-form-error"]}>{ownerError}</span> : "Changing the number changes the number you log in with."}
          </p>
          <div className={styles["admin-form-buttons"]}>
            <button type="submit" className={styles["admin-button-filled"]}>
              Save
            </button>
            <button type="button" className={styles["admin-button-outlined"]} onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={styles["admin-team-member"]}>
      <div>
        <span className={styles["admin-team-member-name"]}>{owner.name} (You)</span>
        <span className={styles["admin-team-member-number"]}>{formatIndianMobileNumber(owner.mobileNumber)}</span>
        {ownerSavedMessage && <span className={styles["admin-owner-saved"]}>{ownerSavedMessage}</span>}
      </div>
      <span className={`${styles["admin-role-badge"]} ${styles["admin-role-badge-owner"]}`}>Owner</span>
      <span className={styles["admin-team-member-features"]}>Everything</span>
      <div className={styles["admin-team-member-actions"]}>
        <button type="button" className={styles["admin-text-button"]} onClick={startEditing}>
          Edit
        </button>
      </div>
    </li>
  );
}
