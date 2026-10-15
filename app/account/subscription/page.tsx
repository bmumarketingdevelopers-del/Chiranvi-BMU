import type { Metadata } from "next";
import SubscriptionPage from "@/components/account/subscription/subscription-page";

export const metadata: Metadata = {
  title: "My Subscription | Chiranvi Farms",
};

export default function AccountSubscriptionPage() {
  return <SubscriptionPage />;
}
