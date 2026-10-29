import { useEffect, useSyncExternalStore } from "react";
import { useLoggedInMobileNumber } from "@/components/login/login-status";
import { createClient } from "@/lib/supabase/client";
import { PANEL_FEATURES, type PanelFeature } from "./panel-features";
// The panel's other data (orders, products …) is still shared through this until it moves to the database
import "./shared-data-sync";

/*
  Who can open the Chiranvi Panel (/admin) and what they can do there. Managed on the Roles & permissions
  page, saved in the Supabase database (tables panel_roles and staff_members, see
  supabase/migrations/0002_people_and_login.sql), so the same team and roles apply on every laptop and
  phone, on localhost and on the live site.
  - Roles: Owner (can do everything and is the only one who can change roles and people), Admin, Manager,
    Delivery agent (delivery app only, no panel), and any role the owner adds. Each role has, for every
    panel page (module): View, Create, Edit, Delete, Export. View decides whether the page opens at all.
  - People: a mobile number with a role. They log in with their OTP and find "Chiranvi Panel" in their
    account.
  The team is read after login (and again when the window comes back into focus). The database's rules
  decide what each person may read and change: anyone sees their own staff row; the owner sees and changes
  everyone and every role. So a customer, or an Admin trying to change the team, is refused by the
  database itself, whatever the browser does.
*/

// Before the team has loaded (and on the server): nobody is the owner
const NO_OWNER: OwnerDetails = { name: "", mobileNumber: "" };

export type OwnerDetails = { name: string; mobileNumber: string };

// Panel pages that sit in the sales / operations / business groups: store/panel-features.ts
export { PANEL_FEATURES, type PanelFeature };

// Every page of the panel a role can be given (rows of the permission grid)
export type PanelModule = "dashboard" | PanelFeature | "staff" | "roles";
export const PANEL_MODULES: { key: PanelModule; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  ...PANEL_FEATURES.map((feature) => ({ key: feature.key as PanelModule, label: feature.label as string })),
  { key: "staff", label: "Staff" },
  { key: "roles", label: "Roles & permissions" },
];

export type PermissionAction = "view" | "create" | "edit" | "delete" | "export";
export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: "view", label: "View" },
  { key: "create", label: "Create" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" },
  { key: "export", label: "Export" },
];

export type ActionSet = Record<PermissionAction, boolean>;
export type RolePermissions = Record<PanelModule, ActionSet>;

export type PanelRole = {
  id: string; // "owner", "admin", "manager", "delivery-agent", or made by the owner
  name: string;
  isBuiltIn: boolean;
  // false: no panel at all (delivery agents use the delivery app)
  hasPanelAccess: boolean;
  permissions: RolePermissions;
};

export type StaffMember = {
  mobileNumber: string; // 10 digits
  name: string;
  roleId: string;
  title?: string; // "Hub manager"
};

export type StaffAccess = {
  roleId: string;
  roleName: string;
  name: string;
  isOwner: boolean;
  // Whether an action is allowed on a page (the owner: always)
  can: (module: PanelModule, action: PermissionAction) => boolean;
  // What the person can open in the panel (View)
  canOpenFeature: (feature: PanelFeature) => boolean;
  // Roles and people can only be changed by the owner
  canManageTeam: boolean;
};

// ---------- Permissions ----------

const NONE: ActionSet = { view: false, create: false, edit: false, delete: false, export: false };
const ALL: ActionSet = { view: true, create: true, edit: true, delete: true, export: true };

// "VCEDX" letters: View, Create, Edit, Delete, eXport
function actions(letters: string): ActionSet {
  return {
    view: letters.includes("V"),
    create: letters.includes("C"),
    edit: letters.includes("E"),
    delete: letters.includes("D"),
    export: letters.includes("X"),
  };
}

function permissionsFor(letters: Partial<Record<PanelModule, string>>): RolePermissions {
  return Object.fromEntries(PANEL_MODULES.map((module) => [module.key, actions(letters[module.key] ?? "")])) as RolePermissions;
}

const ALL_PERMISSIONS = Object.fromEntries(PANEL_MODULES.map((module) => [module.key, ALL])) as RolePermissions;

export const OWNER_ROLE: PanelRole = { id: "owner", name: "Owner", isBuiltIn: true, hasPanelAccess: true, permissions: ALL_PERMISSIONS };

// A permission grid with every module filled in (roles saved before a module existed get it unticked)
function completePermissions(permissions: Partial<RolePermissions> | undefined): RolePermissions {
  return Object.fromEntries(
    PANEL_MODULES.map((module) => [module.key, { ...NONE, ...(permissions?.[module.key] ?? {}) }]),
  ) as RolePermissions;
}

// ---------- The team, roles and owner, from the database ----------

// The rows as the database keeps them
type RoleRow = { id: string; name: string; is_built_in: boolean; has_panel_access: boolean; permissions: Partial<RolePermissions> };
type StaffRow = { mobile_number: string; name: string; role_id: string; title: string | null; is_active: boolean };

const NO_ROLES: PanelRole[] = [];
const NO_TEAM: StaffMember[] = [];

let roles: PanelRole[] = NO_ROLES; // every role except Owner (the owner is shown on its own)
let staffMembers: StaffMember[] = NO_TEAM; // everyone except the owner
let ownerDetails: OwnerDetails = NO_OWNER;
// Whose team this is (the logged-in number it was read for), and whether a read is under way
let loadedForMobile: string | null | undefined = undefined;
let loadingForMobile: string | null | undefined = undefined;
const staffListeners = new Set<() => void>();

function announceTeamChange() {
  staffListeners.forEach((onChange) => onChange());
}

/*
  Reads the roles and the team the logged-in person may see (the database's rules decide: their own row,
  or everyone for the owner and people with Staff → View). Logged out: no team.
*/
async function loadTeam(mobileNumber: string | null) {
  loadingForMobile = mobileNumber;
  if (!mobileNumber) {
    roles = NO_ROLES;
    staffMembers = NO_TEAM;
    ownerDetails = NO_OWNER;
  } else {
    const supabase = createClient();
    const [roleAnswer, staffAnswer] = await Promise.all([
      supabase.from("panel_roles").select("id, name, is_built_in, has_panel_access, permissions").order("created_at"),
      supabase.from("staff_members").select("mobile_number, name, role_id, title, is_active").order("created_at"),
    ]);
    // A newer login started meanwhile: its own read wins
    if (loadingForMobile !== mobileNumber) return;
    if (roleAnswer.error || staffAnswer.error) console.error("Could not read the team", roleAnswer.error ?? staffAnswer.error);
    const roleRows = (roleAnswer.data ?? []) as RoleRow[];
    const staffRows = ((staffAnswer.data ?? []) as StaffRow[]).filter((row) => row.is_active);
    roles = roleRows
      .filter((row) => row.id !== "owner")
      .map((row) => ({ id: row.id, name: row.name, isBuiltIn: row.is_built_in, hasPanelAccess: row.has_panel_access, permissions: completePermissions(row.permissions) }));
    const ownerRow = staffRows.find((row) => row.role_id === "owner");
    ownerDetails = ownerRow ? { name: ownerRow.name, mobileNumber: ownerRow.mobile_number } : NO_OWNER;
    staffMembers = staffRows
      .filter((row) => row.role_id !== "owner")
      .map((row) => ({ mobileNumber: row.mobile_number, name: row.name, roleId: row.role_id, title: row.title ?? undefined }));
  }
  loadedForMobile = mobileNumber;
  announceTeamChange();
}

// Reads the team for this login once (again after a change, or when asked to refresh)
function ensureTeamFor(mobileNumber: string | null, refresh = false) {
  if (!refresh && (loadedForMobile === mobileNumber || loadingForMobile === mobileNumber)) return;
  void loadTeam(mobileNumber);
}

// After a change: show it at once, save it, and read the team again if the database refused it
async function saveThenCheck(change: () => void, write: () => PromiseLike<{ error: unknown }>) {
  change();
  announceTeamChange();
  const { error } = await write();
  if (error) {
    console.error("The database did not accept the change", error);
    ensureTeamFor(loadedForMobile ?? null, true);
  }
}

// Adds a person, or replaces them if the number is already on the team (owner only).
export function saveStaffMember(member: StaffMember) {
  void saveThenCheck(
    () => {
      staffMembers = [...staffMembers.filter((existing) => existing.mobileNumber !== member.mobileNumber), member];
    },
    () =>
      createClient()
        .from("staff_members")
        .upsert(
          { mobile_number: member.mobileNumber, name: member.name, role_id: member.roleId, title: member.title ?? null, is_active: true },
          { onConflict: "mobile_number" },
        ),
  );
}

export function removeStaffMember(mobileNumber: string) {
  void saveThenCheck(
    () => {
      staffMembers = staffMembers.filter((member) => member.mobileNumber !== mobileNumber);
    },
    () => createClient().from("staff_members").delete().eq("mobile_number", mobileNumber),
  );
}

export function saveRolePermissions(roleId: string, permissions: RolePermissions) {
  void saveThenCheck(
    () => {
      roles = roles.map((role) => (role.id === roleId ? { ...role, permissions } : role));
    },
    () => createClient().from("panel_roles").update({ permissions }).eq("id", roleId),
  );
}

// A new role starts with nothing ticked except the dashboard
export function addRole(name: string) {
  const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "role";
  let id = baseId;
  for (let copy = 2; [OWNER_ROLE, ...roles].some((role) => role.id === id); copy++) id = `${baseId}-${copy}`;
  const newRole: PanelRole = { id, name, isBuiltIn: false, hasPanelAccess: true, permissions: permissionsFor({ dashboard: "V" }) };
  void saveThenCheck(
    () => {
      roles = [...roles, newRole];
    },
    () =>
      createClient()
        .from("panel_roles")
        .insert({ id, name, is_built_in: false, has_panel_access: true, permissions: newRole.permissions }),
  );
  return newRole;
}

export function renameRole(roleId: string, name: string) {
  void saveThenCheck(
    () => {
      roles = roles.map((role) => (role.id === roleId ? { ...role, name } : role));
    },
    () => createClient().from("panel_roles").update({ name }).eq("id", roleId),
  );
}

// Only roles nobody has can be deleted (the built-in ones never)
export function deleteRole(roleId: string) {
  void saveThenCheck(
    () => {
      roles = roles.filter((role) => role.id !== roleId || role.isBuiltIn);
    },
    () => createClient().from("panel_roles").delete().eq("id", roleId).eq("is_built_in", false),
  );
}

/*
  The owner changes their name or number. A new number is the owner's login from then on: the owner logs
  in again with it (with its OTP), and the old number no longer opens the panel (this is how the panel is
  handed over to Praveen's own number).
*/
export function saveOwnerDetails(newDetails: OwnerDetails) {
  void saveThenCheck(
    () => {
      ownerDetails = newDetails;
    },
    () => createClient().from("staff_members").update({ name: newDetails.name, mobile_number: newDetails.mobileNumber }).eq("role_id", "owner"),
  );
}

// ---------- Hooks ----------

function subscribeToTeam(onChange: () => void) {
  staffListeners.add(onChange);
  // Back to this window (e.g. after the owner changed the team on another laptop): read the team again
  function refreshOnFocus() {
    if (loadedForMobile) ensureTeamFor(loadedForMobile, true);
  }
  window.addEventListener("focus", refreshOnFocus);
  return () => {
    staffListeners.delete(onChange);
    window.removeEventListener("focus", refreshOnFocus);
  };
}

// Reads the team for whoever is logged in now (and again when someone else logs in)
function useTeamForLogin() {
  const mobileNumber = useLoggedInMobileNumber();
  useEffect(() => {
    ensureTeamFor(mobileNumber);
  }, [mobileNumber]);
  return mobileNumber;
}

export function useOwnerDetails() {
  useTeamForLogin();
  return useSyncExternalStore(subscribeToTeam, () => ownerDetails, () => NO_OWNER);
}

export function useStaffMembers() {
  useTeamForLogin();
  return useSyncExternalStore(subscribeToTeam, () => staffMembers, () => NO_TEAM);
}

export function usePanelRoles() {
  useTeamForLogin();
  return useSyncExternalStore(subscribeToTeam, () => roles, () => NO_ROLES);
}

/*
  True once the team has been read for the person logged in now (or nobody is logged in). The panel waits
  for this before deciding "staff or customer", so nobody is sent away while it is still loading.
*/
export function useIsStaffAccessKnown() {
  const mobileNumber = useTeamForLogin();
  const loadedFor = useSyncExternalStore(subscribeToTeam, () => loadedForMobile, () => undefined);
  return mobileNumber === null || loadedFor === mobileNumber;
}

// What a mobile number can do in the panel, or null (customers, and people whose role has no panel).
export function getStaffAccess(
  mobileNumber: string | null,
  team: StaffMember[],
  owner: OwnerDetails,
  allRoles: PanelRole[] = roles,
): StaffAccess | null {
  if (!mobileNumber) return null;
  if (owner.mobileNumber && mobileNumber === owner.mobileNumber) {
    return {
      roleId: "owner",
      roleName: "Owner",
      name: owner.name,
      isOwner: true,
      can: () => true,
      canOpenFeature: () => true,
      canManageTeam: true,
    };
  }
  const member = team.find((existing) => existing.mobileNumber === mobileNumber);
  const role = member && allRoles.find((existing) => existing.id === member.roleId);
  if (!member || !role || !role.hasPanelAccess) return null;
  const can = (module: PanelModule, action: PermissionAction) => {
    const allowed = role.permissions[module];
    // Any action needs View first
    return Boolean(allowed?.view && allowed[action]);
  };
  return {
    roleId: role.id,
    roleName: role.name,
    name: member.name,
    isOwner: false,
    can,
    canOpenFeature: (feature) => can(feature, "view"),
    canManageTeam: false,
  };
}

// The logged-in person's panel access, or null (customers, logged-out visitors, and on the server).
export function useCurrentStaffAccess() {
  const mobileNumber = useLoggedInMobileNumber();
  const team = useStaffMembers();
  const owner = useOwnerDetails();
  const allRoles = usePanelRoles();
  return getStaffAccess(mobileNumber, team, owner, allRoles);
}
