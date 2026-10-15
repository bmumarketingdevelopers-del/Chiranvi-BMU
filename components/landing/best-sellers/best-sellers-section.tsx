"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useIsLoggedIn } from "@/components/login/login-status";
import {
  addProductToCart,
  changeCartItemQuantity,
  rememberPendingCartProduct,
  useCartItems,
  type CartProduct,
} from "@/store/cart-store";
import styles from "./best-sellers-section.module.css";

/*
  Landing page section below Shop By Category: "Best Sellers" heading and six product cards
  (picture, name, star rating, pack size, price with the old price crossed out, Add to cart).
  Prices, ratings and pack sizes are placeholders from the design until real product data exists.
  "Add to cart" never leaves the landing page:
  - logged in: adds the product to the cart (the cart badge in the navigation bar goes up);
  - not logged in: remembers the product and asks for the login first; logging in adds it and
    comes back here.
  Once a product is in the cart, its button becomes two: "- quantity +" and "View Cart" (opens the
  cart page); at 0 it is "Add to cart" again.
  Only the navigation bar's cart icon opens the cart page.
  Scroll reveal: when the section scrolls into view, the heading and all six cards fade and
  slide up together.
*/

const bestSellingProducts = [
  {
    name: "A2 Desi Milk",
    imageSource: "/images/products/a2-cow-milk-1-litre-bottle.webp",
    imageWidth: 232,
    imageHeight: 500,
  },
  {
    name: "A2 Desi Ghee",
    imageSource: "/images/products/desi-ghee-jar.webp",
    imageWidth: 1524,
    imageHeight: 2204,
  },
  {
    name: "Fresh Cow Paneer",
    imageSource: "/images/products/fresh-paneer-200g-box.webp",
    imageWidth: 604,
    imageHeight: 444,
  },
  {
    name: "Moringa Powder",
    imageSource: "/images/products/moringa-leaves-powder-pouch.webp",
    imageWidth: 336,
    imageHeight: 516,
  },
  {
    name: "Turmeric Powder",
    imageSource: "/images/products/turmeric-powder-pouch.webp",
    imageWidth: 360,
    imageHeight: 548,
  },
  {
    name: "Red Chilli Powder",
    imageSource: "/images/products/red-chilli-powder-pouch.webp",
    imageWidth: 360,
    imageHeight: 548,
  },
].map((product) => ({
  ...product,
  // Used as the product id in the cart, e.g. "a2-desi-milk".
  productId: product.name.toLowerCase().replace(/ /g, "-"),
  // Placeholder values from the design, the same for every product for now.
  rating: 4.5,
  ratingCount: "7,105",
  packSize: "500ml x 1",
  price: 249,
  originalPrice: 389,
}));

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

// The product details the cart page needs (without the rating).
function toCartProduct(product: (typeof bestSellingProducts)[number]): CartProduct {
  const { productId, name, imageSource, imageWidth, imageHeight, packSize, price, originalPrice } = product;
  return {
    productId,
    name,
    imageSource,
    imageWidth,
    imageHeight,
    packSize,
    price,
    originalPrice,
  };
}

/*
  The card's cart button:
  - in the cart: "- quantity +" and "View Cart" side by side (stacked on phones); - at 1 takes it out
    of the cart, and the button is "Add to cart" again;
  - logged in: "Add to cart" adds one pack and stays on the page;
  - not logged in: "Add to cart" links to the login. The product is remembered just before the click
    (pointer down / Enter key), because on phones the login sheet takes over the click itself.
*/
function AddToCartControl({
  product,
  isLoggedIn,
  quantityInCart,
}: {
  product: (typeof bestSellingProducts)[number];
  isLoggedIn: boolean;
  quantityInCart: number;
}) {
  if (quantityInCart > 0) {
    return (
      <div className={styles["best-seller-in-cart-actions"]}>
        <div className={styles["best-seller-quantity-control"]} role="group" aria-label={`${product.name} quantity`}>
          <button
            type="button"
            aria-label={`Remove one ${product.name}`}
            className={styles["best-seller-quantity-button"]}
            onClick={() => changeCartItemQuantity(product.productId, -1)}
          >
            −
          </button>
          <span className={styles["best-seller-quantity"]} aria-live="polite">
            {quantityInCart}
          </span>
          <button
            type="button"
            aria-label={`Add one more ${product.name}`}
            className={styles["best-seller-quantity-button"]}
            onClick={() => changeCartItemQuantity(product.productId, 1)}
          >
            +
          </button>
        </div>
        <Link href="/cart" className={styles["best-seller-view-cart-button"]}>
          View Cart
        </Link>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <button
        type="button"
        className={styles["best-seller-add-to-cart-button"]}
        onClick={() => addProductToCart(toCartProduct(product))}
      >
        Add to cart
      </button>
    );
  }

  return (
    <Link
      href="/login"
      className={styles["best-seller-add-to-cart-button"]}
      onPointerDown={() => rememberPendingCartProduct(toCartProduct(product))}
      onKeyDown={(event) => {
        if (event.key === "Enter") rememberPendingCartProduct(toCartProduct(product));
      }}
    >
      Add to cart
    </Link>
  );
}

/*
  placement "landing-page"   - the landing page section (centred heading with lines, six cards in a row,
                               scroll reveal).
  placement "account-orders" - under "My Orders" on the account dashboard (design): heading on the left
                               with "View all Products" on the right (the way to see more) and one row of
                               five cards (four on phones, two per row). No scroll reveal there.
*/
export default function BestSellersSection({
  placement = "landing-page",
}: {
  placement?: "landing-page" | "account-orders";
}) {
  const isLoggedIn = useIsLoggedIn();
  const cartItems = useCartItems();
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
        {bestSellingProducts.map((product) => (
          <li key={product.name} className={styles["best-seller-card"]}>
            <div className={styles["best-seller-image-area"]}>
              <Image
                src={product.imageSource}
                alt={product.name}
                width={product.imageWidth}
                height={product.imageHeight}
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
              <s className={styles["best-seller-original-price"]}>
                <span className={styles["best-seller-visually-hidden"]}>Was </span>₹{product.originalPrice}
              </s>
            </p>

            <AddToCartControl
              product={product}
              isLoggedIn={isLoggedIn}
              quantityInCart={cartItems.find((cartItem) => cartItem.productId === product.productId)?.quantity ?? 0}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
