import AdminDashboard from "@/components/admin/admin-dashboard";
import { AdminFeatureGate } from "@/components/admin/admin-panel-layout";

// Chiranvi Panel home: opened from "Chiranvi Panel" in the account sidebar (needs View on Dashboard).
export default function AdminHomeRoute() {
  return (
    <AdminFeatureGate feature="dashboard">
      <AdminDashboard />
    </AdminFeatureGate>
  );
}
