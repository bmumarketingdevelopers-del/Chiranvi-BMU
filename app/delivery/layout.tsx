import type { Metadata } from "next";
import { Poppins, Ubuntu } from "next/font/google";
import DeliveryPanelLayout from "@/components/delivery/delivery-panel-layout";

export const metadata: Metadata = {
  title: "Delivery Panel | Chiranvi Farm",
};

// The site's own fonts: Ubuntu for headings and big numbers, Poppins for everything else
const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });

// Delivery Panel (delivery agents): every /delivery page shares this frame, which also checks who may open it.
export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      <DeliveryPanelLayout>{children}</DeliveryPanelLayout>
    </div>
  );
}
