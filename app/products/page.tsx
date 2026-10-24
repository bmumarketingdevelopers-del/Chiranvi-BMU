import type { Metadata } from "next";
import { Poppins, Ubuntu } from "next/font/google";
import LandingZoomAndLayoutRunner from "@/components/landing/landing-zoom-and-layout-runner";
import AllProductsPage from "@/components/product/all-products-page";

// All products (/products): every product card; "View all products" and "Start Shopping" lead here.
export const metadata: Metadata = {
  title: "All products | Chiranvi Farm",
};

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
// Ubuntu: headings, big numbers and buttons (same type style as the landing page).
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });

export default function ProductsPage() {
  return (
    <div className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      {/* Same layout script as the home page, so the navigation bar gets its phone layout here too */}
      <LandingZoomAndLayoutRunner />
      <AllProductsPage />
    </div>
  );
}
