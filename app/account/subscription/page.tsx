import type { Metadata } from "next";
import SubscriptionPage from "@/components/account/subscription/subscription-page";

export const metadata: Metadata = {
  title: "My Subscription | Chiranvi Farm",
};

export default function AccountSubscriptionPage() {
  return <SubscriptionPage />;
}
