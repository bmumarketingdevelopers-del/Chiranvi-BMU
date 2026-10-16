import type { Metadata } from "next";
import { Poppins, Ubuntu } from "next/font/google";
import PrivacyPolicyPage from "@/components/privacy-policy/privacy-policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Chiranvi Farm",
};

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });

// Privacy Policy page: opened from "Privacy policy" in the site footer.
export default function PrivacyPolicyRoute() {
  return (
    <main className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      <PrivacyPolicyPage />
    </main>
  );
}
