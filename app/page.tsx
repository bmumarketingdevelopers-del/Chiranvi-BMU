import type { Metadata } from "next";
import { Poppins, Ubuntu } from "next/font/google";
import LandingZoomAndLayoutRunner from "@/components/landing/landing-zoom-and-layout-runner";
import HeroSection from "@/components/landing/hero/hero-section";
import PurityPromisesSection from "@/components/landing/purity-promises/purity-promises-section";
import ShopByCategorySection from "@/components/landing/shop-by-category/shop-by-category-section";
import FreeDeliveryOfferSection from "@/components/landing/free-delivery-offer/free-delivery-offer-section";
import BestSellersSection from "@/components/landing/best-sellers/best-sellers-section";
import CustomerReviewsSection from "@/components/landing/customer-reviews/customer-reviews-section";
import DeliveryAndOffersSection from "@/components/landing/delivery-and-offers/delivery-and-offers-section";
import LocationRequestSection from "@/components/landing/location-request/location-request-section";
import SiteFooter from "@/components/footer/site-footer";
import LoginBottomSheet from "@/components/login/login-bottom-sheet";
import styles from "./page.module.css";

// Browser tab title for the home page (the tab icon is app/favicon.ico, the Chiranvi Farm cow emblem).
export const metadata: Metadata = {
  title: "Chiranvi Farm",
};

const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });
const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });

/*
  Landing page sections, in order. Each section has its own folder in components/landing/
  (for example hero/hero-section.tsx and hero/hero-section.module.css).
*/
export default function HomePage() {
  return (
    <main className={`${ubuntuFont.variable} ${poppinsFont.variable} ${styles["landing-page"]}`}>
      <LandingZoomAndLayoutRunner />
      <HeroSection />
      <PurityPromisesSection />
      <ShopByCategorySection />
      <FreeDeliveryOfferSection />
      <BestSellersSection />
      <CustomerReviewsSection />
      <DeliveryAndOffersSection />
      <LocationRequestSection />
      {/* Shared site footer with the Refer a Friend banner (inside <main> so it gets the page fonts) */}
      <SiteFooter />
      {/* Phones: login opens as a bottom sheet over this page instead of the /login page */}
      <LoginBottomSheet />
    </main>
  );
}
