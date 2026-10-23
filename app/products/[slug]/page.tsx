import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Poppins, Ubuntu } from "next/font/google";
import LandingZoomAndLayoutRunner from "@/components/landing/landing-zoom-and-layout-runner";
import AttaProductPage from "@/components/product/atta-product-page";
import BatterProductPage from "@/components/product/batter-product-page";
import ButterProductPage from "@/components/product/butter-product-page";
import GheeProductPage from "@/components/product/ghee-product-page";
import MilkProductPage from "@/components/product/milk-product-page";
import PaneerProductPage from "@/components/product/paneer-product-page";

// Product pages made so far: /products/<slug> → page and browser tab title. Others open "not found".
const productPages = {
  "a2-desi-milk": { title: "A2 Desi Cow Milk | Chiranvi Farm", Page: MilkProductPage },
  "a2-desi-ghee": { title: "A2 Desi Cow Ghee | Chiranvi Farm", Page: GheeProductPage },
  "fresh-cow-paneer": { title: "A2 Desi Paneer | Chiranvi Farm", Page: PaneerProductPage },
  "desi-white-butter": { title: "A2 Desi Butter | Chiranvi Farm", Page: ButterProductPage },
  "whole-wheat-atta": { title: "Whole Wheat Atta | Chiranvi Farm", Page: AttaProductPage },
  "batter-powder": { title: "Idli & Dosa Batter | Chiranvi Farm", Page: BatterProductPage },
};

function findProductPage(slug: string) {
  return Object.hasOwn(productPages, slug) ? productPages[slug as keyof typeof productPages] : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: findProductPage(slug)?.title ?? "Chiranvi Farm" };
}

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
// Ubuntu: headings, big numbers and buttons (same type style as the landing page).
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const productPage = findProductPage(slug);
  if (!productPage) notFound();
  const { Page } = productPage;

  return (
    <div className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      {/* Same layout script as the home page, so the navigation bar gets its phone layout here too */}
      <LandingZoomAndLayoutRunner />
      <Page />
    </div>
  );
}
