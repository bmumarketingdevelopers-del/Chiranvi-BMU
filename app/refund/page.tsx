import type { Metadata } from "next";
import { Poppins, Ubuntu } from "next/font/google";
import RefundPage from "@/components/refund/refund-page";

export const metadata: Metadata = {
  title: "Refund Policy | Chiranvi Farms",
};

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });

// Refund page: opened from "Refund" in the site footer.
export default function RefundPolicyPage() {
  return (
    <main className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      <RefundPage />
    </main>
  );
}
