import type { Metadata } from "next";
import OffersPage from "@/components/account/offers/offers-page";

export const metadata: Metadata = {
  title: "My Offers | Chiranvi Farms",
};

export default function AccountOffersPage() {
  return <OffersPage />;
}
