import type { Metadata } from "next";
import HelpPage from "@/components/account/help/help-page";

export const metadata: Metadata = {
  title: "Help | Chiranvi Farm",
};

export default function AccountHelpPage() {
  return <HelpPage />;
}
