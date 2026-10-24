"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addProductToCart, useCartItems } from "@/store/cart-store";
import { removeWishlistItem, useWishlist } from "@/store/wishlist-store";
import { AccountPageHeading } from "../account-dashboard-layout";
import styles from "./wishlist-page.module.css";

/*
  "My Wishlist" dashboard page: the products hearted on the All products page (store/wishlist-store.ts),
  each with its picture, pack and price, Add to cart and Remove. Clicking a card opens the product page.
  Empty: a short message and "Start Shopping" (All products).
*/

function formatRupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function WishlistPage() {
  const router = useRouter();
  const wishlist = useWishlist();
  const cartItems = useCartItems();

  return (
    <>
      <AccountPageHeading title="My Wishlist" description="Products you hearted, saved for later." />

      {wishlist.length === 0 ? (
        <div className={styles["wishlist-empty"]}>
          <p className={styles["wishlist-empty-title"]}>Your wishlist is empty</p>
          <p className={styles["wishlist-empty-text"]}>Tap the heart on any product to save it here.</p>
          <Link href="/products" className={styles["wishlist-start-shopping-button"]}>
            Start Shopping
          </Link>
        </div>
      ) : (
        <ul className={styles["wishlist-grid"]}>
          {wishlist.map((item) => {
            const isInCart = cartItems.some((cartItem) => cartItem.productId === item.itemId);
            return (
              <li
                key={item.itemId}
                className={styles["wishlist-card"]}
                onClick={(event) => {
                  if (!(event.target as HTMLElement).closest("a, button")) router.push(`/products/${item.slug}`);
                }}
              >
                <div className={styles["wishlist-picture-area"]}>
                  <Image src={item.imageSource} alt={item.name} width={item.imageWidth} height={item.imageHeight} sizes="180px" className={styles["wishlist-picture"]} />
                </div>
                <h2 className={styles["wishlist-name"]}>
                  <Link href={`/products/${item.slug}`}>{item.name}</Link>
                </h2>
                <p className={styles["wishlist-pack"]}>{item.packLabel}</p>
                <p className={styles["wishlist-price"]}>
                  {formatRupees(item.price)}
                  {item.originalPrice && item.originalPrice > item.price && <s>{formatRupees(item.originalPrice)}</s>}
                </p>
                <div className={styles["wishlist-buttons"]}>
                  <button
                    type="button"
                    className={styles["wishlist-add-button"]}
                    onClick={() =>
                      addProductToCart({
                        productId: item.itemId,
                        name: item.name,
                        imageSource: item.imageSource,
                        imageWidth: item.imageWidth,
                        imageHeight: item.imageHeight,
                        packSize: item.packLabel,
                        price: item.price,
                        originalPrice: item.originalPrice ?? item.price,
                      })
                    }
                  >
                    {isInCart ? "Add one more" : "Add to cart"}
                  </button>
                  <button type="button" className={styles["wishlist-remove-button"]} onClick={() => removeWishlistItem(item.itemId)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
