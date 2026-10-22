import { notFound } from "next/navigation";
import AdminComingSoon from "@/components/admin/admin-coming-soon";
import { PANEL_FEATURES, type PanelFeature } from "@/store/panel-features";

// The other Chiranvi Panel pages (Subscriptions, Customers, Deliveries, ...), waiting for their designs.
export default async function AdminSectionRoute({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const feature = PANEL_FEATURES.find((panelFeature) => panelFeature.key === section);
  if (!feature) notFound();
  return <AdminComingSoon feature={feature.key as PanelFeature} />;
}
