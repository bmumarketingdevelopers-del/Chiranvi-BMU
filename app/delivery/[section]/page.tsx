"use client";

import { notFound, useParams } from "next/navigation";
import { DELIVERY_PANEL_PAGES, DeliveryComingNext } from "@/components/delivery/delivery-panel-layout";

// Profile, Manager reports, Leaves & attendance and Contact farm: built in the next round
export default function DeliverySectionRoute() {
  const { section } = useParams<{ section: string }>();
  const page = DELIVERY_PANEL_PAGES.find((panelPage) => panelPage.href === `/delivery/${section}`);
  if (!page) notFound();
  return <DeliveryComingNext label={page.label} />;
}
