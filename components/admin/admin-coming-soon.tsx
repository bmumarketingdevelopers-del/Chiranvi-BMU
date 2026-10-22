"use client";

import { PANEL_FEATURES, type PanelFeature } from "@/store/staff-access-store";
import { AdminFeatureGate, AdminPageHeading } from "./admin-panel-layout";
import styles from "./admin-panel.module.css";

/*
  Panel pages whose design has not arrived yet (Products, Orders, Delivery slots). Already protected:
  only people given the feature can open them.
*/

export default function AdminComingSoon({ feature }: { feature: PanelFeature }) {
  const panelFeature = PANEL_FEATURES.find((existing) => existing.key === feature);
  return (
    <AdminFeatureGate feature={feature}>
      <AdminPageHeading title={panelFeature?.label ?? ""} description={panelFeature?.description ?? ""} />
      <div className={styles["admin-card"]}>
        <p className={styles["admin-note"]}>This page will be built from its design.</p>
      </div>
    </AdminFeatureGate>
  );
}
