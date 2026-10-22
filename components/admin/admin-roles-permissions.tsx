"use client";

import { PANEL_FEATURES, useOwnerDetails, useStaffMembers } from "@/store/staff-access-store";
import { AdminFeatureGate } from "./admin-panel-layout";
import styles from "./admin-panel.module.css";

/*
  Roles & permissions (/admin/roles), owner only, below the access form (admin-team-access.tsx): a grid
  of every panel page against every person on the team, so the owner can see at a glance who can open
  what. Access is changed in the form above it.
*/

export default function AdminRolesPermissions() {
  return (
    <AdminFeatureGate feature="owner-only">
      <RolesPermissionsPage />
    </AdminFeatureGate>
  );
}

function RolesPermissionsPage() {
  const owner = useOwnerDetails();
  const staffMembers = useStaffMembers();
  const people = [
    { key: owner.mobileNumber, name: owner.name, roleLabel: "Owner", canOpen: () => true, canManageTeam: true },
    ...staffMembers.map((member) => ({
      key: member.mobileNumber,
      name: member.name,
      roleLabel: member.role === "admin" ? "Admin" : "Manager",
      canOpen: (featureKey: string) =>
        member.role === "admin" || (member.features as readonly string[]).includes(featureKey),
      canManageTeam: false,
    })),
  ];
  const rows = [
    { key: "dashboard", label: "Dashboard", isOwnerOnly: false },
    ...PANEL_FEATURES.map((feature) => ({ key: feature.key as string, label: feature.label, isOwnerOnly: false })),
    { key: "staff", label: "Staff", isOwnerOnly: true },
    { key: "roles", label: "Roles & permissions", isOwnerOnly: true },
  ];

  return (
    <>
      <h2 className={`${styles["admin-card-title"]} ${styles["admin-roles-grid-heading"]}`}>Who can open what</h2>

      <div className={`${styles["admin-card"]} ${styles["admin-table-card"]}`}>
        <table className={styles["admin-permissions-table"]}>
          <thead>
            <tr>
              <th scope="col">Page</th>
              {people.map((person) => (
                <th key={person.key} scope="col">
                  <span className={styles["admin-permissions-person"]}>{person.name}</span>
                  <span className={styles["admin-permissions-role"]}>{person.roleLabel}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {people.map((person) => {
                  const canOpen =
                    row.key === "dashboard" ? true : row.isOwnerOnly ? person.canManageTeam : person.canOpen(row.key);
                  return (
                    <td key={person.key}>
                      <span
                        className={canOpen ? styles["admin-permission-yes"] : styles["admin-permission-no"]}
                        aria-label={canOpen ? "Can open" : "Cannot open"}
                      >
                        {canOpen ? "✓" : "–"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
