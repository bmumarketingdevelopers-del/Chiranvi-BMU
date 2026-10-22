import { useSyncExternalStore } from "react";
import { rememberLogin, useLoggedInMobileNumber } from "@/components/login/login-status";
import { PANEL_FEATURES, type PanelFeature } from "./panel-features";

/*
  Who can open the Chiranvi Panel (/admin) and what they can do there, until real accounts exist
  (Supabase). Managed on the Roles & permissions page.
  - Roles: Owner (Hariprasath, 8754852810 to start with; can do everything and is the only one who can
    change roles and people), Admin, Manager, Delivery agent (delivery app only, no panel), and any
    role the owner adds. Each role has, for every panel page (module): View, Create, Edit, Delete,
    Export. View decides whether the page opens at all.
  - People: a mobile number with a role. They log in as usual and find "Chiranvi Panel" in their account.
  Saved in this browser (localStorage), so it stays after a refresh. Like the login, this is not real
  security yet, and it only applies in this browser.
  Before roles, people were saved as admin or manager with ticked pages: they keep their access (admins
  get the Admin role, managers the Manager role).
*/

// The owner to start with (until the owner changes their name or number)
const DEFAULT_OWNER: OwnerDetails = { name: "Hariprasath", mobileNumber: "8754852810" };

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

const STAFF_STORAGE_KEY = "chiranvi-staff-members";
const ROLES_STORAGE_KEY = "chiranvi-panel-roles";
const OWNER_STORAGE_KEY = "chiranvi-owner";

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

// The Manager role as in the design
const MANAGER_PERMISSIONS = permissionsFor({
  dashboard: "VX",
  orders: "VCEX",
  subscriptions: "VCEX",
  "pause-requests": "VE",
  customers: "VCEX",
  leads: "VCEX",
  payments: "VX",
  refunds: "VCE",
  products: "VE",
  deliveries: "VCEDX",
  routes: "VCEDX",
  reports: "VX",
  staff: "V",
  coupons: "VCE",
});

export const OWNER_ROLE: PanelRole = { id: "owner", name: "Owner", isBuiltIn: true, hasPanelAccess: true, permissions: ALL_PERMISSIONS };

const STARTING_ROLES: PanelRole[] = [
  {
    id: "admin",
    name: "Admin",
    isBuiltIn: true,
    hasPanelAccess: true,
    permissions: { ...ALL_PERMISSIONS, staff: NONE, roles: NONE },
  },
  { id: "manager", name: "Manager", isBuiltIn: true, hasPanelAccess: true, permissions: MANAGER_PERMISSIONS },
  { id: "delivery-agent", name: "Delivery agent", isBuiltIn: true, hasPanelAccess: false, permissions: permissionsFor({}) },
];

// The three managers in the design (their numbers are the ones on the Staff page)
const STARTING_TEAM: StaffMember[] = [
  { mobileNumber: "9741239569", name: "Karthik N", roleId: "manager", title: "Hub manager" },
  { mobileNumber: "9741263753", name: "Anil Kumar", roleId: "manager", title: "Operations" },
  { mobileNumber: "9741245615", name: "Divya Rao", roleId: "manager", title: "Customer care" },
];

// A permission grid with every module filled in (roles saved before a module existed get it unticked)
function completePermissions(permissions: Partial<RolePermissions> | undefined): RolePermissions {
  return Object.fromEntries(
    PANEL_MODULES.map((module) => [module.key, { ...NONE, ...(permissions?.[module.key] ?? {}) }]),
  ) as RolePermissions;
}

// ---------- Saved roles and people ----------

let roles: PanelRole[] = STARTING_ROLES;
let staffMembers: StaffMember[] = STARTING_TEAM;
let hasReadSaved = false;
const staffListeners = new Set<() => void>();

type OldStaffMember = { mobileNumber: string; name: string; role?: "admin" | "manager"; roleId?: string; title?: string };

function readSaved() {
  if (hasReadSaved || typeof window === "undefined") return;
  hasReadSaved = true;
  try {
    const savedRoles = JSON.parse(window.localStorage.getItem(ROLES_STORAGE_KEY) ?? "null");
    roles = Array.isArray(savedRoles)
      ? savedRoles.map((role: PanelRole) => ({ ...role, permissions: completePermissions(role.permissions) }))
      : STARTING_ROLES;
  } catch {
    roles = STARTING_ROLES;
  }
  try {
    const savedTeam = JSON.parse(window.localStorage.getItem(STAFF_STORAGE_KEY) ?? "null");
    staffMembers = Array.isArray(savedTeam)
      ? savedTeam.map((member: OldStaffMember) => ({
          mobileNumber: member.mobileNumber,
          name: member.name,
          title: member.title,
          // Saved before roles: admin -> Admin, manager -> Manager
          roleId: member.roleId ?? (member.role === "admin" ? "admin" : "manager"),
        }))
      : STARTING_TEAM;
  } catch {
    staffMembers = STARTING_TEAM;
  }
}

function saveAll(newRoles: PanelRole[], newTeam: StaffMember[]) {
  roles = newRoles;
  staffMembers = newTeam;
  hasReadSaved = true;
  try {
    window.localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(newRoles));
    window.localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(newTeam));
  } catch {
    // Storage blocked: the change lasts until the page is refreshed.
  }
  staffListeners.forEach((onChange) => onChange());
}

function getRoles() {
  readSaved();
  return roles;
}

function getTeam() {
  readSaved();
  return staffMembers;
}

// Adds a person, or replaces them if the number is already on the team.
export function saveStaffMember(member: StaffMember) {
  const others = getTeam().filter((existing) => existing.mobileNumber !== member.mobileNumber);
  saveAll(getRoles(), [...others, member]);
}

export function removeStaffMember(mobileNumber: string) {
  saveAll(getRoles(), getTeam().filter((member) => member.mobileNumber !== mobileNumber));
}

export function saveRolePermissions(roleId: string, permissions: RolePermissions) {
  saveAll(
    getRoles().map((role) => (role.id === roleId ? { ...role, permissions } : role)),
    getTeam(),
  );
}

// A new role starts with nothing ticked except the dashboard
export function addRole(name: string) {
  const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "role";
  let id = baseId;
  for (let copy = 2; [OWNER_ROLE, ...getRoles()].some((role) => role.id === id); copy++) id = `${baseId}-${copy}`;
  const newRole: PanelRole = { id, name, isBuiltIn: false, hasPanelAccess: true, permissions: permissionsFor({ dashboard: "V" }) };
  saveAll([...getRoles(), newRole], getTeam());
  return newRole;
}

export function renameRole(roleId: string, name: string) {
  saveAll(
    getRoles().map((role) => (role.id === roleId ? { ...role, name } : role)),
    getTeam(),
  );
}

// Only roles nobody has can be deleted
export function deleteRole(roleId: string) {
  saveAll(
    getRoles().filter((role) => role.id !== roleId || role.isBuiltIn),
    getTeam(),
  );
}

// ---------- Owner ----------

let ownerDetails: OwnerDetails = DEFAULT_OWNER;
let hasReadSavedOwner = false;

function readSavedOwner() {
  if (hasReadSavedOwner || typeof window === "undefined") return;
  hasReadSavedOwner = true;
  try {
    const savedOwner = JSON.parse(window.localStorage.getItem(OWNER_STORAGE_KEY) ?? "null");
    ownerDetails =
      typeof savedOwner?.name === "string" && typeof savedOwner?.mobileNumber === "string" ? savedOwner : DEFAULT_OWNER;
  } catch {
    ownerDetails = DEFAULT_OWNER;
  }
}

/*
  The owner changes their name or number. A new number becomes the owner's login straight away (the
  owner stays logged in), and from then on the owner logs in with the new number.
*/
export function saveOwnerDetails(newDetails: OwnerDetails) {
  const loggedInAsOwner = getLoggedInNumberForOwnerChange() === getOwner().mobileNumber;
  ownerDetails = newDetails;
  hasReadSavedOwner = true;
  try {
    window.localStorage.setItem(OWNER_STORAGE_KEY, JSON.stringify(newDetails));
  } catch {
    // Storage blocked: the change lasts until the page is refreshed.
  }
  staffListeners.forEach((onChange) => onChange());
  if (loggedInAsOwner) rememberLogin(newDetails.mobileNumber);
}

function getLoggedInNumberForOwnerChange() {
  try {
    return JSON.parse(window.localStorage.getItem("chiranvi-login") ?? "null")?.mobileNumber ?? null;
  } catch {
    return null;
  }
}

function getOwner() {
  readSavedOwner();
  return ownerDetails;
}

// ---------- Hooks ----------

function subscribeToTeam(onChange: () => void) {
  staffListeners.add(onChange);
  function followOtherTabs(event: StorageEvent) {
    if (event.key !== STAFF_STORAGE_KEY && event.key !== OWNER_STORAGE_KEY && event.key !== ROLES_STORAGE_KEY) return;
    hasReadSaved = false;
    hasReadSavedOwner = false;
    readSaved();
    readSavedOwner();
    onChange();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    staffListeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

export function useOwnerDetails() {
  return useSyncExternalStore(subscribeToTeam, getOwner, () => DEFAULT_OWNER);
}

export function useStaffMembers() {
  return useSyncExternalStore(subscribeToTeam, getTeam, () => STARTING_TEAM);
}

export function usePanelRoles() {
  return useSyncExternalStore(subscribeToTeam, getRoles, () => STARTING_ROLES);
}

// What a mobile number can do in the panel, or null (customers, and people whose role has no panel).
export function getStaffAccess(
  mobileNumber: string | null,
  team: StaffMember[],
  owner: OwnerDetails,
  allRoles: PanelRole[] = getRoles(),
): StaffAccess | null {
  if (!mobileNumber) return null;
  if (mobileNumber === owner.mobileNumber) {
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
