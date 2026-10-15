import type { Metadata } from "next";
import AddressPage from "@/components/account/address/address-page";

export const metadata: Metadata = {
  title: "My Addresses | Chiranvi Farms",
};

export default function AccountAddressPage() {
  return <AddressPage />;
}
