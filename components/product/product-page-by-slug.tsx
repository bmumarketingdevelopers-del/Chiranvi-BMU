"use client";

import { useSyncExternalStore } from "react";
import { notFound } from "next/navigation";
import { useProductPages } from "@/store/product-pages-store";
import OneTimeProductPage from "./one-time-product-page";
import SubscriptionProductPage from "./subscription-product-page";

/*
  /products/<slug>: finds the product page with this address and draws it with the template for its kind
  (subscription or one-time). The starting pages are known on the server too; pages added in the Chiranvi
  Panel are only known once the browser has read its saved list, so until then nothing is drawn, and after
  that an unknown address shows "not found". Drafts show only in the panel's preview (?preview=1).
*/

function subscribeToNothing() {
  return () => {};
}

export default function ProductPageBySlug({ slug, isPreview }: { slug: string; isPreview: boolean }) {
  const productPages = useProductPages();
  const hasReadSavedPages = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const page = productPages.find((productPage) => productPage.slug === slug && (productPage.status === "published" || isPreview));

  if (!page) {
    if (hasReadSavedPages) notFound();
    return null;
  }
  return page.kind === "subscription" ? <SubscriptionProductPage page={page} /> : <OneTimeProductPage page={page} />;
}
