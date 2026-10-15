"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { CART_ICON_CLICKED_ON_CART_PAGE_EVENT } from "@/components/navigation/site-navigation-bar";
import SiteNavigationPlacement from "@/components/navigation/site-navigation-placement";
import { changeCartItemQuantity, countCartPacks, useCartItems } from "@/store/cart-store";
import CartCheckout from "./cart-checkout";
import styles from "./cart-view.module.css";

/*
  "My Cart" page content: the site navigation bar, a back button with the title and item count, then
  - the products in the cart, each with a "- quantity +" control and its total, and a checkout bar
    at the bottom (total amount + Pay now; it opens the checkout: address, confirm details, payment,
    then "Your order has been placed" on this same page - see cart-checkout.tsx), or
  - the empty-cart message (designs: desktop card, phone without the card border).
  Clicking the navigation bar's cart icon on this page shakes the empty-cart trolley instead of reloading the page.
*/

// The cart is kept in the browser, so it is only known after the page has loaded there.
function subscribeToNothing() {
  return () => {};
}

export default function CartView() {
  const cartItems = useCartItems();
  // "Pay now" opens the checkout steps in place of the cart list.
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const cartItemCount = countCartPacks(cartItems);
  const cartTotal = cartItems.reduce((total, cartItem) => total + cartItem.price * cartItem.quantity, 0);
  const isCartLoaded = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  // Counts cart icon clicks on this page; each new value restarts the trolley shake (used as its key).
  const [trolleyShakeCount, setTrolleyShakeCount] = useState(0);

  // Clicking the navigation bar's cart icon while on this page shakes the trolley left and right.
  useEffect(() => {
    function shakeTrolley() {
      setTrolleyShakeCount((shakeCount) => shakeCount + 1);
    }
    window.addEventListener(CART_ICON_CLICKED_ON_CART_PAGE_EVENT, shakeTrolley);
    return () => window.removeEventListener(CART_ICON_CLICKED_ON_CART_PAGE_EVENT, shakeTrolley);
  }, []);

  return (
    <div className={styles["cart-page"]}>
      {/* Navigation bar, placed exactly like on the landing page */}
      <SiteNavigationPlacement />

      <main className={styles["cart-page-content"]}>
        {isCheckoutOpen ? (
          <CartCheckout cartItems={cartItems} onBackToCart={() => setIsCheckoutOpen(false)} />
        ) : (
          <>
            <div className={styles["cart-page-title-row"]}>
              <Link href="/" aria-label="Back to the home page" className={styles["cart-page-back-button"]}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
              </Link>
              <h1 className={styles["cart-page-title"]}>
                My Cart <span className={styles["cart-page-item-count"]}>({cartItemCount})</span>
              </h1>
            </div>

            {!isCartLoaded ? null : cartItems.length > 0 ? (
              <section className={styles["cart-items-card"]} aria-label="Products in your cart">
                <ul className={styles["cart-items-list"]}>
                  {cartItems.map((cartItem) => (
                    <li key={cartItem.productId} className={styles["cart-item-row"]}>
                      <span className={styles["cart-item-image-area"]}>
                        <Image
                          src={cartItem.imageSource}
                          alt={cartItem.name}
                          width={cartItem.imageWidth}
                          height={cartItem.imageHeight}
                          sizes="96px"
                          className={styles["cart-item-image"]}
                        />
                      </span>

                      <div className={styles["cart-item-details"]}>
                        <h2 className={styles["cart-item-name"]}>{cartItem.name}</h2>
                        <p className={styles["cart-item-pack-size"]}>{cartItem.packSize}</p>
                        <p className={styles["cart-item-price-row"]}>
                          <span className={styles["cart-item-price"]}>₹{cartItem.price}</span>
                          <s className={styles["cart-item-original-price"]}>₹{cartItem.originalPrice}</s>
                        </p>
                      </div>

                      {/* "- quantity +": at 0 the product leaves the cart */}
                      <div
                        className={styles["cart-item-quantity-control"]}
                        role="group"
                        aria-label={`${cartItem.name} quantity`}
                      >
                        <button
                          type="button"
                          aria-label={`Remove one ${cartItem.name}`}
                          className={styles["cart-item-quantity-button"]}
                          onClick={() => changeCartItemQuantity(cartItem.productId, -1)}
                        >
                          −
                        </button>
                        <span className={styles["cart-item-quantity"]} aria-live="polite">
                          {cartItem.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Add one more ${cartItem.name}`}
                          className={styles["cart-item-quantity-button"]}
                          onClick={() => changeCartItemQuantity(cartItem.productId, 1)}
                        >
                          +
                        </button>
                      </div>

                      <p className={styles["cart-item-total"]}>₹{cartItem.price * cartItem.quantity}</p>
                    </li>
                  ))}
                </ul>

                {/*
              Checkout bar (like the reference app): total amount on the left of the button, Pay now on the right.
              Desktop: stays at the bottom of the screen while the list scrolls. Phone: fixed to the bottom of the screen.
              Pay now opens the checkout steps (address, confirm details, payment).
            */}
                <div className={styles["cart-checkout-bar"]}>
                  <button
                    type="button"
                    className={styles["cart-pay-now-button"]}
                    onClick={() => setIsCheckoutOpen(true)}
                  >
                    <span className={styles["cart-pay-now-total"]}>
                      <span className={styles["cart-pay-now-total-amount"]}>₹{cartTotal}</span>
                      <span className={styles["cart-pay-now-total-label"]}>
                        Total · {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
                      </span>
                    </span>
                    <span className={styles["cart-pay-now-label"]}>
                      Pay now
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </button>
                </div>
              </section>
            ) : (
              <section className={styles["empty-cart-card"]} aria-labelledby="empty-cart-heading">
                <span className={styles["empty-cart-icon-circle"]} aria-hidden="true">
                  <svg
                    key={trolleyShakeCount}
                    viewBox="0 0 24 24"
                    className={`${styles["empty-cart-icon"]} ${trolleyShakeCount > 0 ? styles["empty-cart-icon-shaking"] : ""}`}
                  >
                    <path d="M2.5 3.5h2.4l2.3 11h11l2-8H6.2" />
                    <circle cx="9" cy="19" r="1.6" />
                    <circle cx="16.5" cy="19" r="1.6" />
                  </svg>
                </span>
                <h2 id="empty-cart-heading" className={styles["empty-cart-heading"]}>
                  Your cart is empty
                </h2>
                <p className={styles["empty-cart-description"]}>Your farm-fresh favourites are waiting for you!</p>
                <Link href="/" className={styles["empty-cart-start-shopping-button"]}>
                  Start Shopping
                </Link>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
