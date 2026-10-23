"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { rememberPageAfterLogin, useLoggedInMobileNumber } from "@/components/login/login-status";
import { askToBeNotified, isAvailableToOrder, useShopProducts, type ShopProduct } from "@/store/products-store";
import styles from "./best-sellers-section.module.css";

/*
  Landing page section below Shop By Category: "Best Sellers" heading and six product cards
  (picture, name, star rating, pack size, price with the old price crossed out, View Product).
  Products, prices and pack sizes come from the Chiranvi Panel (store/products-store.ts); ratings are
  placeholders from the design until real product data exists.
  "View Product" opens the product's own page (/products/<productId>), where the customer reads the
  details and adds it to the cart; customers buy after seeing the details, not from this card.
  Only the milk page exists so far (/products/a2-desi-milk); the others open "not found" until their
  pages are made.
  Sold out (switched off or out of stock in the panel): the card stays, with a "Sold out" tag on the
  picture, "We'll let you know when it's available" and a "Notify me" button instead of View Product.
  Scroll reveal: when the section scrolls into view, the heading and all the cards fade and
  slide up together.
*/

// Products marked for Best Sellers in the Chiranvi Panel (Products & pricing), with their current
// price and pack; ones that cannot be ordered show as Sold out. Ratings are placeholders from the design.
type BestSellingProduct = ShopProduct & { imageSource: string; rating: number; ratingCount: string };

function useBestSellingProducts(): BestSellingProduct[] {
  return useShopProducts()
    .filter((product) => product.showOnBestSellers && product.imageSource)
    .sort((first, second) => (first.bestSellerOrder ?? 99) - (second.bestSellerOrder ?? 99))
    .map((product) => ({ ...product, imageSource: product.imageSource as string, rating: 4.5, ratingCount: "7,105" }));
}

const starOutline = "M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2-4.6-4.4 6.3-.9z";

// Five stars; for a .5 rating the last star is half filled.
function StarRating({ rating }: { rating: number }) {
  return (
    <span className={styles["best-seller-star-row"]} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((starNumber) => {
        const isFull = rating >= starNumber;
        const isHalf = !isFull && rating >= starNumber - 0.5;
        return (
          <svg key={starNumber} viewBox="0 0 24 24" className={styles["best-seller-star"]}>
            <path d={starOutline} className={styles["best-seller-star-empty"]} />
            {(isFull || isHalf) && (
              <path
                d={starOutline}
                className={styles["best-seller-star-filled"]}
                style={isHalf ? { clipPath: "inset(0 50% 0 0)" } : undefined}
              />
            )}
          </svg>
        );
      })}
    </span>
  );
}

// The card's button: opens the product page (same look as the old Add to cart button).
function ViewProductLink({ product }: { product: BestSellingProduct }) {
  return (
    <Link
      href={`/products/${product.productId}`}
      aria-label={`View ${product.name}`}
      className={styles["best-seller-add-to-cart-button"]}
    >
      View Product
    </Link>
  );
}

/*
  Sold out: "Notify me" saves the customer's mobile number with the product; the panel tells them when
  it is marked restocked. Not logged in: the button goes to the login first, then back here.
*/
function NotifyMeControl({ product }: { product: BestSellingProduct }) {
  const mobileNumber = useLoggedInMobileNumber();
  const isWaiting = mobileNumber !== null && Boolean(product.waitingCustomers?.includes(mobileNumber));

  return (
    <div className={styles["best-seller-notify-area"]}>
      <p className={styles["best-seller-notify-text"]}>We&rsquo;ll let you know when it&rsquo;s available</p>
      {isWaiting ? (
        <p className={styles["best-seller-notify-done"]} role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          We&rsquo;ll notify you
        </p>
      ) : mobileNumber ? (
        <button
          type="button"
          className={styles["best-seller-notify-button"]}
          onClick={() => askToBeNotified(product.productId, mobileNumber)}
        >
          Notify me
        </button>
      ) : (
        <Link
          href="/login"
          className={styles["best-seller-notify-button"]}
          onPointerDown={() => rememberPageAfterLogin(window.location.pathname)}
        >
          Notify me
        </Link>
      )}
    </div>
  );
}

/*
  placement "landing-page"   - the landing page section (centred heading with lines, six cards in a row,
                               scroll reveal).
  placement "account-orders" - under "My Orders" on the account dashboard (design): heading on the left
                               with "View all Products" on the right (the way to see more) and one row of
                               five cards (four on phones, two per row). No scroll reveal there.
  placement "cart"           - under the empty cart: same cards as the landing page, but the heading is
                               "Fast Selling Products" on the left (lined up with the first card).
*/
export default function BestSellersSection({
  placement = "landing-page",
}: {
  placement?: "landing-page" | "account-orders" | "cart";
}) {
  const bestSellingProducts = useBestSellingProducts();
  const isOnAccountOrdersPage = placement === "account-orders";
  const sectionRef = useRef<HTMLElement>(null);
  // "visible": shown normally (also the server-rendered state, so nothing is hidden without JavaScript).
  // "waiting": hidden, ready to animate. "revealed": animated into view.
  const [revealState, setRevealState] = useState<"visible" | "waiting" | "revealed">("visible");

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || isOnAccountOrdersPage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already clearly on screen when the page opens (not just peeking in at the bottom): just show it.
    if (section.getBoundingClientRect().top < window.innerHeight - 100) return;

    setRevealState("waiting");
    const revealObserver = new IntersectionObserver(
      ([sectionVisibility]) => {
        if (sectionVisibility.isIntersecting) {
          setRevealState("revealed");
          revealObserver.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    revealObserver.observe(section);
    return () => revealObserver.disconnect();
  }, [isOnAccountOrdersPage]);

  return (
    <section
      ref={sectionRef}
      className={`${styles["best-sellers-section"]} ${
        isOnAccountOrdersPage ? styles["best-sellers-section-on-account-orders"] : ""
      } ${revealState === "visible" ? "" : styles[`best-sellers-section-${revealState}`]}`}
      aria-labelledby="best-sellers-heading"
    >
      {isOnAccountOrdersPage ? (
        <div className={styles["best-sellers-account-heading-row"]}>
          <h2 id="best-sellers-heading" className={styles["best-sellers-account-heading"]}>
            Best Sellers
          </h2>
          <Link href="/products" className={styles["best-sellers-view-all-link"]}>
            View all Products
          </Link>
        </div>
      ) : placement === "cart" ? (
        <h2 id="best-sellers-heading" className={styles["best-sellers-cart-heading"]}>
          Fast Selling Products
        </h2>
      ) : (
        <h2 id="best-sellers-heading" className={styles["best-sellers-heading"]}>
          {/* Decorative line and dash on both sides of the heading */}
          <span className={styles["best-sellers-heading-decoration"]} aria-hidden="true" />
          Best Sellers
          <span
            className={`${styles["best-sellers-heading-decoration"]} ${styles["best-sellers-heading-decoration-right"]}`}
            aria-hidden="true"
          />
        </h2>
      )}

      <ul className={styles["best-sellers-product-list"]}>
        {bestSellingProducts.map((product) => {
          const isSoldOut = !isAvailableToOrder(product);
          return (
          <li
            key={product.productId}
            className={`${styles["best-seller-card"]} ${isSoldOut ? styles["best-seller-card-sold-out"] : ""}`}
          >
            <div className={styles["best-seller-image-area"]}>
              {isSoldOut && <span className={styles["best-seller-sold-out-tag"]}>Sold out</span>}
              <Image
                src={product.imageSource}
                alt={product.name}
                width={product.imageWidth ?? 400}
                height={product.imageHeight ?? 400}
                sizes="200px"
                className={styles["best-seller-image"]}
              />
            </div>

            <h3 className={styles["best-seller-name"]}>{product.name}</h3>

            <p className={styles["best-seller-rating"]}>
              <StarRating rating={product.rating} />
              <span className={styles["best-seller-rating-count"]}>({product.ratingCount})</span>
              <span className={styles["best-seller-visually-hidden"]}>
                Rated {product.rating} out of 5 from {product.ratingCount} reviews
              </span>
            </p>

            <p className={styles["best-seller-pack-size"]}>{product.packSize}</p>

            <p className={styles["best-seller-price-row"]}>
              <span className={styles["best-seller-price"]}>₹{product.price}</span>
              {product.originalPrice && (
                <s className={styles["best-seller-original-price"]}>
                  <span className={styles["best-seller-visually-hidden"]}>Was </span>₹{product.originalPrice}
                </s>
              )}
            </p>

            {isSoldOut ? (
              <NotifyMeControl product={product} />
            ) : (
              <ViewProductLink product={product} />
            )}
          </li>
          );
        })}
      </ul>
    </section>
  );
}
