import type { Metadata } from "next";
import { Poppins, Ubuntu } from "next/font/google";
import LandingZoomAndLayoutRunner from "@/components/landing/landing-zoom-and-layout-runner";
import { startingProductPages } from "@/components/product/product-page-data";
import ProductPageBySlug from "@/components/product/product-page-by-slug";

/*
  Product pages: /products/<slug>. Every product is data (components/product/product-page-data.ts, plus the
  pages added in the Chiranvi Panel); ProductPageBySlug finds it and draws it with the subscription or the
  one-time template. ?preview=1 (from the panel) also shows drafts.
*/

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  // Browser tab title from the starting pages (the server cannot see pages saved in a browser)
  const startingPage = startingProductPages.find((page) => page.slug === slug);
  return { title: startingPage ? `${startingPage.name} | Chiranvi Farm` : "Chiranvi Farm" };
}

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
// Ubuntu: headings, big numbers and buttons (same type style as the landing page).
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;

  return (
    <div className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      {/* Same layout script as the home page, so the navigation bar gets its phone layout here too */}
      <LandingZoomAndLayoutRunner />
      <ProductPageBySlug slug={slug} isPreview={preview === "1"} />
    </div>
  );
}
