"use client";

import { useState } from "react";
import { formatIndianMobileNumber } from "@/components/account/account-profile";
import {
  OWNER_ROLE,
  PANEL_MODULES,
  PERMISSION_ACTIONS,
  addRole,
  deleteRole,
  removeStaffMember,
  renameRole,
  saveOwnerDetails,
  saveRolePermissions,
  saveStaffMember,
  useOwnerDetails,
  usePanelRoles,
  useStaffMembers,
  type PanelModule,
  type PanelRole,
  type PermissionAction,
  type RolePermissions,
  type StaffMember,
} from "@/store/staff-access-store";
import { useStaffList } from "@/store/admin-staff-store";
import { AdminFeatureGate } from "./admin-panel-layout";
import {
  AdminDialog,
  AdminDialogField,
  AdminPageTop,
  AdminRowMenu,
  adminInputClassName,
  useAdminToast,
  useIsPanelOwner,
} from "./admin-shared";
import dashboardStyles from "./admin-dashboard.module.css";
import sharedStyles from "./admin-shared.module.css";
import styles from "./admin-roles-page.module.css";

/*
  Roles & permissions (/admin/roles), from the design 15-roles-permissions: who in the team can see and
  change what.
    left       the roles (Owner, Admin, Manager, Delivery agent, and any added) with how many people
               have each; "Add new role"; the people with the chosen role ("Invite person" gives a
               mobile number that role, "..." changes their role or removes their access; the owner can
               change their own name and number); what each role can do
    right      the chosen role's permissions: for every panel page, View / Create / Edit / Delete /
               Export. View opens the page; Create shows its New / Add button, Export its Export button,
               Edit and Delete the changes in its row menus and delete buttons. Reset / Save.
               The owner can always do everything; delivery agents only use the delivery app.
    note       sensitive actions (prices, salaries, deleting customers, refunds above ₹500) always need
               the owner.
  Only the owner changes anything here; anyone else with View on this page can only look.
  Roles and people come from store/staff-access-store.ts; delivery agents from the Staff page.
*/

const ROLE_ICONS: Record<string, string[]> = {
  owner: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z", "M8.5 12l2.5 2.5L16 9.5"],
  "delivery-agent": ["M2.5 6.5h11v9.5h-11z", "M13.5 9.5h4l3.5 3.5v3h-7.5", "M6.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
};
const PEOPLE_ICON = ["M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M3 20a6 6 0 0 1 12 0", "M16 4.5a3.5 3.5 0 0 1 0 6.5", "M18 14.5a6 6 0 0 1 3 5.5"];

const initialsOf = (fullName: string) =>
  fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// "managers", "admins", "delivery agents"
const pluralOf = (roleName: string) => (roleName.endsWith("s") ? roleName.toLowerCase() : `${roleName.toLowerCase()}s`);

// What a role can do, in one short line
function summaryOf(role: PanelRole) {
  if (role.id === "owner") return "Everything, including prices, staff salaries and roles";
  if (!role.hasPanelAccess) return "Only the delivery app: route, assigned customers and proof of delivery";
  const pages = PANEL_MODULES.filter((module) => role.permissions[module.key].view).map((module) => module.label);
  if (pages.length === 0) return "Nothing yet: tick the pages they can see";
  if (pages.length === PANEL_MODULES.length) return "Every page";
  const shown = pages.slice(0, 4).join(", ");
  return pages.length > 4 ? `${shown} and ${pages.length - 4} more` : shown;
}

const samePermissions = (first: RolePermissions, second: RolePermissions) => JSON.stringify(first) === JSON.stringify(second);

type PersonForm = { name: string; mobileNumber: string; roleId: string; title: string };

export default function AdminRolesPage() {
  return (
    <AdminFeatureGate feature="roles">
      <RolesPage />
    </AdminFeatureGate>
  );
}

function RolesPage() {
  const roles = usePanelRoles();
  const team = useStaffMembers();
  const owner = useOwnerDetails();
  const staff = useStaffList();
  const isOwner = useIsPanelOwner();
  const [searchText, setSearchText] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("manager");
  // Unsaved ticks, per role, until Save or Reset
  const [drafts, setDrafts] = useState<Record<string, RolePermissions>>({});
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [personForm, setPersonForm] = useState<PersonForm | null>(null);
  const [ownerForm, setOwnerForm] = useState<{ name: string; mobileNumber: string } | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<StaffMember | null>(null);
  const { showToast, toast } = useAdminToast();

  const allRoles = [OWNER_ROLE, ...roles];
  const selectedRole = allRoles.find((role) => role.id === selectedRoleId) ?? allRoles[0];
  const panelRoles = roles.filter((role) => role.hasPanelAccess);
  const deliveryAgents = staff.filter((person) => person.group === "Delivery");
  const isLocked = !isOwner || selectedRole.id === "owner" || !selectedRole.hasPanelAccess;
  const shownPermissions = drafts[selectedRole.id] ?? selectedRole.permissions;
  const hasUnsavedChanges = Boolean(drafts[selectedRole.id]) && !samePermissions(drafts[selectedRole.id], selectedRole.permissions);

  const peopleIn = (role: PanelRole) =>
    role.id === "owner" ? 1 : role.id === "delivery-agent" ? deliveryAgents.length : team.filter((member) => member.roleId === role.id).length;
  const totalPeople = allRoles.reduce((sum, role) => sum + peopleIn(role), 0);

  // People shown on the left: the chosen role's, or everyone matching the search
  const words = searchText.trim().toLowerCase();
  type PersonRow = { key: string; name: string; detail: string; member?: StaffMember; isOwnerRow?: boolean; roleName?: string };
  const everyone: (PersonRow & { roleId: string })[] = [
    { key: owner.mobileNumber, name: owner.name, detail: `Owner · ${formatIndianMobileNumber(owner.mobileNumber)}`, isOwnerRow: true, roleId: "owner" },
    ...team.map((member) => ({
      key: member.mobileNumber,
      name: member.name,
      detail: `${member.title ? `${member.title} · ` : ""}${formatIndianMobileNumber(member.mobileNumber)}`,
      member,
      roleId: member.roleId,
    })),
    ...deliveryAgents.map((person) => ({
      key: `agent-${person.id}`,
      name: person.name,
      detail: `${person.job} · delivery app`,
      roleId: "delivery-agent",
    })),
  ];
  const shownPeople = (words
    ? everyone.filter((person) => `${person.name} ${person.detail}`.toLowerCase().includes(words))
    : everyone.filter((person) => person.roleId === selectedRole.id)
  ).map((person) => ({ ...person, roleName: allRoles.find((role) => role.id === person.roleId)?.name }));

  // Ticking any action ticks View; unticking View unticks the rest
  function toggle(module: PanelModule, action: PermissionAction) {
    const current = shownPermissions[module];
    const isOn = !current[action];
    const next =
      action === "view" && !isOn
        ? { view: false, create: false, edit: false, delete: false, export: false }
        : { ...current, [action]: isOn, view: current.view || isOn };
    setDrafts({ ...drafts, [selectedRole.id]: { ...shownPermissions, [module]: next } });
  }

  function toggleColumn(action: PermissionAction) {
    const isAllOn = PANEL_MODULES.every((module) => shownPermissions[module.key][action]);
    const next = Object.fromEntries(
      PANEL_MODULES.map((module) => {
        const current = shownPermissions[module.key];
        const value = !isAllOn;
        return [
          module.key,
          action === "view" && !value
            ? { view: false, create: false, edit: false, delete: false, export: false }
            : { ...current, [action]: value, view: current.view || value },
        ];
      }),
    ) as RolePermissions;
    setDrafts({ ...drafts, [selectedRole.id]: next });
  }

  function resetDraft() {
    const rest = { ...drafts };
    delete rest[selectedRole.id];
    setDrafts(rest);
  }

  function savePermissions() {
    saveRolePermissions(selectedRole.id, shownPermissions);
    resetDraft();
    showToast(`${selectedRole.name} permissions saved`);
  }

  function saveNewRole() {
    const name = roleName.trim();
    if (!name) {
      showToast("Enter a name for the role");
      return;
    }
    if (allRoles.some((role) => role.name.toLowerCase() === name.toLowerCase())) {
      showToast(`There is already a ${name} role`);
      return;
    }
    const added = addRole(name);
    setIsAddRoleOpen(false);
    setRoleName("");
    setSelectedRoleId(added.id);
    showToast(`${added.name} added. Tick what they can do, then Save`);
  }

  function saveRename() {
    const name = roleName.trim();
    if (!name) return;
    renameRole(selectedRole.id, name);
    setIsRenameOpen(false);
    showToast(`Role renamed to ${name}`);
  }

  function savePerson() {
    if (!personForm) return;
    const mobileNumber = personForm.mobileNumber.replace(/\D/g, "");
    if (!personForm.name.trim() || mobileNumber.length !== 10) {
      showToast("Enter the name and a 10-digit mobile number");
      return;
    }
    if (mobileNumber === owner.mobileNumber) {
      showToast("That is the owner's number");
      return;
    }
    const existing = team.find((member) => member.mobileNumber === mobileNumber);
    saveStaffMember({ name: personForm.name.trim(), mobileNumber, roleId: personForm.roleId, title: personForm.title.trim() || existing?.title });
    const role = allRoles.find((item) => item.id === personForm.roleId);
    setPersonForm(null);
    setSelectedRoleId(personForm.roleId);
    showToast(
      existing ? `${personForm.name.trim()} is now ${role?.name}` : `${personForm.name.trim()} can now log in with ${formatIndianMobileNumber(mobileNumber)} as ${role?.name}`,
    );
  }

  function saveOwner() {
    if (!ownerForm) return;
    const mobileNumber = ownerForm.mobileNumber.replace(/\D/g, "");
    if (!ownerForm.name.trim() || mobileNumber.length !== 10) {
      showToast("Enter your name and a 10-digit mobile number");
      return;
    }
    if (team.some((member) => member.mobileNumber === mobileNumber)) {
      showToast("That number belongs to someone on the team");
      return;
    }
    saveOwnerDetails({ name: ownerForm.name.trim(), mobileNumber });
    setOwnerForm(null);
    showToast(mobileNumber === owner.mobileNumber ? "Your name is saved" : `Saved. Log in with ${formatIndianMobileNumber(mobileNumber)} from now on`);
  }

  return (
    <div className={dashboardStyles["admin-dashboard"]}>
      <AdminPageTop
        title="Roles & permissions"
        description={isOwner ? "Control who in your team can see and change what" : "Who in the team can see and change what (only the owner can change this)"}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchPlaceholder="Search people..."
      />

      <div className={styles["admin-roles-columns"]}>
        {/* ---------- Left: roles, people, what each role can do ---------- */}
        <section className={dashboardStyles["admin-card"]} aria-labelledby="admin-roles-list-heading">
          <h2 id="admin-roles-list-heading" className={dashboardStyles["admin-card-title"]}>
            Roles
          </h2>
          <p className={dashboardStyles["admin-card-subtitle"]}>
            {allRoles.length} roles · {totalPeople} people
          </p>

          <ul className={styles["admin-role-list"]}>
            {allRoles.map((role) => {
              const count = peopleIn(role);
              return (
                <li key={role.id}>
                  <button
                    type="button"
                    aria-pressed={role.id === selectedRole.id}
                    className={`${styles["admin-role-button"]} ${role.id === selectedRole.id ? styles["admin-role-button-selected"] : ""}`}
                    onClick={() => {
                      setSelectedRoleId(role.id);
                      setSearchText("");
                    }}
                  >
                    <span className={styles["admin-role-icon"]} aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        {(ROLE_ICONS[role.id] ?? PEOPLE_ICON).map((path) => (
                          <path key={path} d={path} />
                        ))}
                      </svg>
                    </span>
                    <span className={styles["admin-role-text"]}>
                      <span className={styles["admin-role-name"]}>{role.name}</span>
                      <span className={styles["admin-role-count"]}>
                        {count} {count === 1 ? "person" : "people"}
                        {role.id === "owner" ? " · full access" : role.hasPanelAccess ? "" : " · delivery app only"}
                        {drafts[role.id] && !samePermissions(drafts[role.id], role.permissions) ? " · not saved" : ""}
                      </span>
                    </span>
                    <svg viewBox="0 0 24 24" className={styles["admin-role-arrow"]} aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>

          {isOwner && (
            <button
              type="button"
              className={styles["admin-role-add"]}
              onClick={() => {
                setRoleName("");
                setIsAddRoleOpen(true);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add new role
            </button>
          )}

          <h3 className={styles["admin-roles-section-title"]}>{words ? "People matching the search" : "People with this role"}</h3>
          <ul className={styles["admin-person-list"]}>
            {shownPeople.map((person, index) => (
              <li key={person.key} className={styles["admin-person-row"]}>
                <span className={`${sharedStyles["admin-initials"]} ${index % 2 ? sharedStyles["admin-initials-yellow"] : ""}`} aria-hidden="true">
                  {initialsOf(person.name)}
                </span>
                <span className={styles["admin-person-text"]}>
                  <span className={styles["admin-person-name"]}>
                    {person.name}
                    {person.isOwnerRow && isOwner ? " (You)" : ""}
                  </span>
                  <span className={styles["admin-person-detail"]}>
                    {words ? `${person.roleName} · ` : ""}
                    {person.detail}
                  </span>
                </span>
                {isOwner && person.isOwnerRow && (
                  <button
                    type="button"
                    className={styles["admin-roles-text-button"]}
                    onClick={() => setOwnerForm({ name: owner.name, mobileNumber: owner.mobileNumber })}
                  >
                    Edit
                  </button>
                )}
                {isOwner && person.member && (
                  <AdminRowMenu
                    label={`Actions for ${person.name}`}
                    title={person.name}
                    options={[
                      ...panelRoles
                        .filter((role) => role.id !== person.member!.roleId)
                        .map((role) => ({
                          label: `Make ${role.name}`,
                          onSelect: () => {
                            saveStaffMember({ ...person.member!, roleId: role.id });
                            showToast(`${person.name} is now ${role.name}`);
                          },
                        })),
                      {
                        label: "Edit name or title",
                        onSelect: () =>
                          setPersonForm({
                            name: person.member!.name,
                            mobileNumber: person.member!.mobileNumber,
                            roleId: person.member!.roleId,
                            title: person.member!.title ?? "",
                          }),
                      },
                      { label: "Remove access", isDanger: true, permission: "delete", onSelect: () => setMemberToRemove(person.member!) },
                    ]}
                  />
                )}
              </li>
            ))}
            {shownPeople.length === 0 && <li className={styles["admin-person-empty"]}>{words ? "No one matches this search." : "No one has this role yet."}</li>}
          </ul>

          {isOwner && selectedRole.hasPanelAccess && selectedRole.id !== "owner" && !words && (
            <button
              type="button"
              className={styles["admin-person-invite"]}
              onClick={() => setPersonForm({ name: "", mobileNumber: "", roleId: selectedRole.id, title: "" })}
            >
              + Invite person
            </button>
          )}
          {!selectedRole.hasPanelAccess && !words && (
            <p className={styles["admin-roles-hint"]}>Delivery agents are added on the Staff page and use the delivery app, not the panel.</p>
          )}

          <h3 className={styles["admin-roles-section-title"]}>What each role can do</h3>
          <ul className={styles["admin-role-summaries"]}>
            {allRoles.map((role) => (
              <li key={role.id}>
                <span className={styles["admin-role-summary-name"]}>{role.name}</span>
                <span className={styles["admin-role-summary-text"]}>{summaryOf(role)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Right: the chosen role's permissions ---------- */}
        <section className={dashboardStyles["admin-card"]} aria-labelledby="admin-permissions-heading">
          <div className={dashboardStyles["admin-card-heading-row"]}>
            <div>
              <h2 id="admin-permissions-heading" className={dashboardStyles["admin-card-title"]}>
                {selectedRole.name} permissions
                {hasUnsavedChanges && <span className={styles["admin-permissions-unsaved"]}>Not saved</span>}
              </h2>
              <p className={dashboardStyles["admin-card-subtitle"]}>
                {selectedRole.id === "owner"
                  ? "The owner can always see and change everything"
                  : !selectedRole.hasPanelAccess
                    ? "Delivery agents can't open the panel"
                    : isOwner
                      ? `Choose what ${pluralOf(selectedRole.name)} can see and change`
                      : `What ${pluralOf(selectedRole.name)} can see and change`}
              </p>
            </div>
            {!isLocked && (
              <div className={styles["admin-permissions-buttons"]}>
                {!selectedRole.isBuiltIn && (
                  <>
                    <button
                      type="button"
                      className={styles["admin-roles-text-button"]}
                      onClick={() => {
                        setRoleName(selectedRole.name);
                        setIsRenameOpen(true);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className={styles["admin-roles-delete-role"]}
                      onClick={() => {
                        if (peopleIn(selectedRole) > 0) {
                          showToast(`Move the ${peopleIn(selectedRole)} people with this role to another role first`);
                          return;
                        }
                        deleteRole(selectedRole.id);
                        setSelectedRoleId("manager");
                        showToast(`${selectedRole.name} role deleted`);
                      }}
                    >
                      Delete role
                    </button>
                  </>
                )}
                <button type="button" className={styles["admin-permissions-reset"]} disabled={!hasUnsavedChanges} onClick={resetDraft}>
                  Reset
                </button>
                <button type="button" className={styles["admin-permissions-save"]} disabled={!hasUnsavedChanges} onClick={savePermissions}>
                  Save
                </button>
              </div>
            )}
          </div>

          <div className={dashboardStyles["admin-table-scroll"]}>
            <table className={`${dashboardStyles["admin-orders-table"]} ${styles["admin-permissions-table"]}`}>
              <thead>
                <tr>
                  <th scope="col">Module</th>
                  {PERMISSION_ACTIONS.map((action) => (
                    <th key={action.key} scope="col" className={styles["admin-permissions-column"]}>
                      {isLocked ? (
                        action.label
                      ) : (
                        <button
                          type="button"
                          className={styles["admin-permissions-column-button"]}
                          title={`Tick or untick ${action.label} for every page`}
                          onClick={() => toggleColumn(action.key)}
                        >
                          {action.label}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PANEL_MODULES.map((module) => (
                  <tr key={module.key}>
                    <td className={dashboardStyles["admin-orders-customer"]}>{module.label}</td>
                    {PERMISSION_ACTIONS.map((action) => {
                      const isOn = shownPermissions[module.key][action.key];
                      return (
                        <td key={action.key} className={styles["admin-permissions-column"]}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isOn}
                            aria-label={`${selectedRole.name}: ${action.label} ${module.label}`}
                            disabled={isLocked}
                            className={`${styles["admin-permission-box"]} ${isOn ? styles["admin-permission-box-on"] : ""}`}
                            onClick={() => toggle(module.key, action.key)}
                          >
                            {isOn && (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 12.5l4 4 8-9" />
                              </svg>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles["admin-sensitive-note"]}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 11h12v9.5H6z" />
              <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
            </svg>
            <div>
              <p className={styles["admin-sensitive-title"]}>Sensitive actions always need the owner</p>
              <p className={styles["admin-sensitive-text"]}>
                Changing prices, deleting customers, refunds above ₹500 and editing salaries can only be done by the owner, whatever
                is ticked here. Later this will send a one-time code to the owner&rsquo;s phone.
              </p>
            </div>
          </div>
        </section>
      </div>

      {isAddRoleOpen && (
        <AdminDialog title="Add new role" submitLabel="Add role" onClose={() => setIsAddRoleOpen(false)} onSubmit={saveNewRole}>
          <AdminDialogField label="Role name" isWide>
            <input
              className={adminInputClassName}
              placeholder="e.g. Accountant"
              value={roleName}
              onChange={(changeEvent) => setRoleName(changeEvent.target.value.slice(0, 30))}
              autoFocus
            />
          </AdminDialogField>
          <p className={styles["admin-roles-dialog-note"]}>It starts with only the dashboard. Tick what this role can do, then Save.</p>
        </AdminDialog>
      )}

      {isRenameOpen && (
        <AdminDialog title={`Rename ${selectedRole.name}`} submitLabel="Save" onClose={() => setIsRenameOpen(false)} onSubmit={saveRename}>
          <AdminDialogField label="Role name" isWide>
            <input className={adminInputClassName} value={roleName} onChange={(changeEvent) => setRoleName(changeEvent.target.value.slice(0, 30))} autoFocus />
          </AdminDialogField>
        </AdminDialog>
      )}

      {personForm && (
        <AdminDialog
          title={team.some((member) => member.mobileNumber === personForm.mobileNumber) ? `Edit ${personForm.name}` : "Invite person"}
          submitLabel={team.some((member) => member.mobileNumber === personForm.mobileNumber) ? "Save" : "Give access"}
          onClose={() => setPersonForm(null)}
          onSubmit={savePerson}
        >
          <AdminDialogField label="Name">
            <input
              className={adminInputClassName}
              value={personForm.name}
              onChange={(changeEvent) => setPersonForm({ ...personForm, name: changeEvent.target.value })}
              autoFocus
            />
          </AdminDialogField>
          <AdminDialogField label="Mobile number">
            <input
              className={adminInputClassName}
              inputMode="numeric"
              placeholder="10 digits"
              disabled={team.some((member) => member.mobileNumber === personForm.mobileNumber)}
              value={personForm.mobileNumber}
              onChange={(changeEvent) => setPersonForm({ ...personForm, mobileNumber: changeEvent.target.value.replace(/\D/g, "").slice(0, 10) })}
            />
          </AdminDialogField>
          <AdminDialogField label="Role">
            <select className={adminInputClassName} value={personForm.roleId} onChange={(changeEvent) => setPersonForm({ ...personForm, roleId: changeEvent.target.value })}>
              {panelRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </AdminDialogField>
          <AdminDialogField label="Title (optional)">
            <input
              className={adminInputClassName}
              placeholder="e.g. Hub manager"
              value={personForm.title}
              onChange={(changeEvent) => setPersonForm({ ...personForm, title: changeEvent.target.value })}
            />
          </AdminDialogField>
          <p className={styles["admin-roles-dialog-note"]}>
            They log in on the website with this number as usual and find &ldquo;Chiranvi Panel&rdquo; in their account.
          </p>
        </AdminDialog>
      )}

      {ownerForm && (
        <AdminDialog title="Your name and number" submitLabel="Save" onClose={() => setOwnerForm(null)} onSubmit={saveOwner}>
          <AdminDialogField label="Name">
            <input className={adminInputClassName} value={ownerForm.name} onChange={(changeEvent) => setOwnerForm({ ...ownerForm, name: changeEvent.target.value })} autoFocus />
          </AdminDialogField>
          <AdminDialogField label="Mobile number">
            <input
              className={adminInputClassName}
              inputMode="numeric"
              value={ownerForm.mobileNumber}
              onChange={(changeEvent) => setOwnerForm({ ...ownerForm, mobileNumber: changeEvent.target.value.replace(/\D/g, "").slice(0, 10) })}
            />
          </AdminDialogField>
          <p className={styles["admin-roles-dialog-note"]}>A new number becomes your login straight away; you stay logged in.</p>
        </AdminDialog>
      )}

      {memberToRemove && (
        <AdminDialog
          title={`Remove ${memberToRemove.name}'s access?`}
          submitLabel="Remove access"
          isDanger
          onClose={() => setMemberToRemove(null)}
          onSubmit={() => {
            removeStaffMember(memberToRemove.mobileNumber);
            showToast(`${memberToRemove.name} can no longer open the panel`);
            setMemberToRemove(null);
          }}
        >
          <p className={styles["admin-roles-dialog-note"]}>
            {formatIndianMobileNumber(memberToRemove.mobileNumber)} will no longer open the Chiranvi Panel. They stay on the Staff
            page if they work at the farm.
          </p>
        </AdminDialog>
      )}

      {toast}
    </div>
  );
}
