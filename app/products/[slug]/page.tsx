import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Poppins, Ubuntu } from "next/font/google";
import LandingZoomAndLayoutRunner from "@/components/landing/landing-zoom-and-layout-runner";
import MilkProductPage from "@/components/product/milk-product-page";

export const metadata: Metadata = {
  title: "A2 Desi Cow Milk | Chiranvi Farm",
};

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
// Ubuntu: headings, big numbers and buttons (same type style as the landing page).
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });

// Only the milk page exists for now (/products/a2-desi-milk); other products get their pages later.
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "a2-desi-milk") notFound();

  return (
    <div className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      {/* Same layout script as the home page, so the navigation bar gets its phone layout here too */}
      <LandingZoomAndLayoutRunner />
      <MilkProductPage />
    </div>
  );
}
