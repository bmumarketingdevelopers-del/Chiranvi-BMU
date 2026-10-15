import type { Metadata } from "next";
import { Poppins, Ubuntu } from "next/font/google";
import CartView from "@/components/cart/cart-view";
import LandingZoomAndLayoutRunner from "@/components/landing/landing-zoom-and-layout-runner";

export const metadata: Metadata = {
  title: "My Cart | Chiranvi Farms",
};

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
// Ubuntu: headings, labels and buttons of the checkout steps (same type style as the account dashboard).
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });

export default function CartPage() {
  return (
    <div className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      {/* Same layout script as the home page, so the navigation bar gets its phone layout here too */}
      <LandingZoomAndLayoutRunner />
      <CartView />
    </div>
  );
}
