import type { Metadata } from "next";
import HelpPage from "@/components/account/help/help-page";

export const metadata: Metadata = {
  title: "Help | Chiranvi Farms",
};

export default function AccountHelpPage() {
  return <HelpPage />;
}
