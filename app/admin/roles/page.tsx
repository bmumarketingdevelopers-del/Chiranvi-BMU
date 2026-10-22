import AdminRolesPermissions from "@/components/admin/admin-roles-permissions";
import AdminTeamAccess from "@/components/admin/admin-team-access";

// Roles & permissions (owner only): who can open the Chiranvi Panel (add admins and managers), then a
// grid of what each person can open. Until its own design is built.
export default function AdminRolesRoute() {
  return (
    <>
      <AdminTeamAccess />
      <AdminRolesPermissions />
    </>
  );
}
