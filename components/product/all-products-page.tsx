"use client";

import { useMemo, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useIsLoggedIn } from "@/components/login/login-status";
import SiteNavigationPlacement from "@/components/navigation/site-navigation-placement";
import { addProductToCart, changeCartItemQuantity, rememberPendingCartProduct, useCartItems, type CartProduct } from "@/store/cart-store";
import { useProductPages } from "@/store/product-pages-store";
import { toggleWishlistItem, useWishlist, type WishlistItem } from "@/store/wishlist-store";
import { SHOP_CATEGORIES, type ProductPage, type ShopCategory } from "./product-page-data";
import styles from "./all-products-page.module.css";

/*
  All products (/products), from the design: breadcrumb, title, category filters with a small picture and
  a count, then one card per published product page (the six starting products and the ones added in
  the Chiranvi Panel), and the daily milk subscription banner at the bottom.
  - Clicking anywhere on a card opens that product's page; ADD, − + and the heart only do their own job.
  - ADD puts that pack in the cart (then "− 1 +"); not logged in, it goes to the login first.
  - The heart saves the pack to the Wishlist (account → Wishlist).
  "View all products" and "Start Shopping" across the site lead here.
*/

type ProductCard = {
  cardId: string; // the cart and wishlist id: same as the product page uses
  page: ProductPage;
  category: ShopCategory;
  packLabel: string;
  price: number;
  originalPrice?: number;
  tag?: string; // on the picture: "Subscribe & save", "Best value", "Most popular"
};

// Small picture on each filter button (pictures the site already has)
const FILTER_PICTURES: Record<ShopCategory, { imageSource: string; imageWidth: number; imageHeight: number }> = {
  Milk: { imageSource: "/images/products/desi-cow-milk-bottle-chiranvi-farm.webp", imageWidth: 1188, imageHeight: 2312 },
  Paneer: { imageSource: "/images/products/fresh-paneer-box-chiranvi-farm.webp", imageWidth: 3712, imageHeight: 2728 },
  Ghee: { imageSource: "/images/products/desi-ghee-jar-chiranvi-farm.webp", imageWidth: 1524, imageHeight: 2204 },
  Butter: { imageSource: "/images/categories/butter-category.webp", imageWidth: 412, imageHeight: 272 },
  Flours: { imageSource: "/images/products/whole-wheat-atta-pack.webp", imageWidth: 1984, imageHeight: 1806 },
  Batter: { imageSource: "/images/products/idli-batter-powder-pack.webp", imageWidth: 1808, imageHeight: 2744 },
  Others: { imageSource: "/images/categories/flours-category-chiranvi-farm.webp", imageWidth: 412, imageHeight: 276 },
};

function formatRupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/*
  One card per product: a one-time product shows its main pack (the one its page opens on, e.g. ghee
  1 litre), a subscription product its one-time price per unit. The other sizes are chosen on the page.
*/
function toCards(pages: ProductPage[]): ProductCard[] {
  return pages
    .filter((page) => page.status === "published")
    .flatMap((page): ProductCard[] => {
      const category = page.shopCategory ?? "Others";
      if (page.kind === "subscription") {
        // "1 litre" (the card note adds "· glass bottle")
        return [{ cardId: page.slug, page, category, packLabel: `1 ${page.unitName}`, price: page.price, originalPrice: page.originalPrice, tag: "Subscribe & save" }];
      }
      const pack = page.packs.find((onePack) => onePack.packId === page.defaultPackId) ?? page.packs[0];
      if (!pack) return [];
      return [
        {
          cardId: `${page.slug}-${pack.packId}`,
          page,
          category,
          packLabel: pack.label,
          price: pack.price,
          originalPrice: pack.originalPrice,
          tag: pack.tag,
        },
      ];
    });
}

function toCartProduct(card: ProductCard): CartProduct {
  const picture = card.page.pictures[0];
  return {
    productId: card.cardId,
    name: card.page.name,
    imageSource: picture?.imageSource ?? "",
    imageWidth: picture?.imageWidth ?? 400,
    imageHeight: picture?.imageHeight ?? 400,
    packSize: card.page.kind === "one-time" ? `${card.packLabel} ${card.page.cartPackWord}` : card.page.packSize,
    price: card.price,
    originalPrice: card.originalPrice ?? card.price,
  };
}

function toWishlistItem(card: ProductCard): WishlistItem {
  const picture = card.page.pictures[0];
  return {
    itemId: card.cardId,
    slug: card.page.slug,
    name: card.page.name,
    packLabel: card.packLabel,
    price: card.price,
    originalPrice: card.originalPrice,
    imageSource: picture?.imageSource ?? "",
    imageWidth: picture?.imageWidth ?? 400,
    imageHeight: picture?.imageHeight ?? 400,
  };
}

// A click on the card opens the product page, unless it was on a button or link inside it
function openProductOnCardClick(event: MouseEvent<HTMLElement>, openPage: () => void) {
  if ((event.target as HTMLElement).closest("a, button")) return;
  openPage();
}

function HeartIcon({ isFilled }: { isFilled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={isFilled ? styles["all-products-heart-filled"] : ""}>
      <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles["all-products-star"]}>
      <path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2-4.6-4.4 6.3-.9z" />
    </svg>
  );
}

// ADD, or "− n +" once that pack is in the cart
function CardCartControl({ card, quantityInCart, isLoggedIn }: { card: ProductCard; quantityInCart: number; isLoggedIn: boolean }) {
  const cartProduct = toCartProduct(card);
  if (quantityInCart > 0) {
    return (
      <div className={styles["all-products-quantity-control"]} role="group" aria-label={`${card.page.name} ${card.packLabel} quantity`}>
        <button type="button" aria-label="One fewer" onClick={() => changeCartItemQuantity(card.cardId, -1)}>
          −
        </button>
        <span aria-live="polite">{quantityInCart}</span>
        <button type="button" aria-label="One more" onClick={() => changeCartItemQuantity(card.cardId, 1)}>
          +
        </button>
      </div>
    );
  }
  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className={styles["all-products-add-button"]}
        onPointerDown={() => rememberPendingCartProduct(cartProduct)}
        onKeyDown={(event) => {
          if (event.key === "Enter") rememberPendingCartProduct(cartProduct);
        }}
      >
        ADD
      </Link>
    );
  }
  return (
    <button type="button" className={styles["all-products-add-button"]} onClick={() => addProductToCart(cartProduct)}>
      ADD
    </button>
  );
}

export default function AllProductsPage() {
  const router = useRouter();
  const productPages = useProductPages();
  const cartItems = useCartItems();
  const wishlist = useWishlist();
  const isLoggedIn = useIsLoggedIn();
  const [chosenCategory, setChosenCategory] = useState<ShopCategory | "All">("All");

  const cards = useMemo(() => toCards(productPages), [productPages]);
  const categoriesWithCards = SHOP_CATEGORIES.filter((category) => cards.some((card) => card.category === category));
  const shownCards = chosenCategory === "All" ? cards : cards.filter((card) => card.category === chosenCategory);
  const milkPage = productPages.find((page) => page.kind === "subscription" && page.status === "published");
  const milkSavingPercent = milkPage?.kind === "subscription" ? Math.max(0, ...milkPage.plans.map((plan) => plan.percentOff)) : 0;

  return (
    <div className={styles["all-products-page"]}>
      <SiteNavigationPlacement />

      <main className={styles["all-products-page-content"]}>
        <nav aria-label="Breadcrumb" className={styles["all-products-breadcrumb"]}>
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">All products</span>
        </nav>
        <h1 className={styles["all-products-title"]}>All products</h1>
        <p className={styles["all-products-description"]}>
          Fresh from our farm: milk, ghee, paneer, butter, flours and batter. Delivered by 7 AM.
        </p>

        {/* Category filters */}
        <div className={styles["all-products-filters"]} role="group" aria-label="Show category">
          <button
            type="button"
            aria-pressed={chosenCategory === "All"}
            className={`${styles["all-products-filter"]} ${chosenCategory === "All" ? styles["all-products-filter-chosen"] : ""}`}
            onClick={() => setChosenCategory("All")}
          >
            All <span className={styles["all-products-filter-count"]}>{cards.length}</span>
          </button>
          {categoriesWithCards.map((category) => {
            const picture = FILTER_PICTURES[category];
            return (
              <button
                key={category}
                type="button"
                aria-pressed={chosenCategory === category}
                className={`${styles["all-products-filter"]} ${chosenCategory === category ? styles["all-products-filter-chosen"] : ""}`}
                onClick={() => setChosenCategory(category)}
              >
                <span className={styles["all-products-filter-picture"]} aria-hidden="true">
                  <Image src={picture.imageSource} alt="" width={picture.imageWidth} height={picture.imageHeight} sizes="32px" />
                </span>
                {category}
                <span className={styles["all-products-filter-count"]}>{cards.filter((card) => card.category === category).length}</span>
              </button>
            );
          })}
        </div>

        <p className={styles["all-products-showing"]}>
          Showing <strong>{shownCards.length}</strong> of {cards.length} products
        </p>

        <ul className={styles["all-products-grid"]}>
          {shownCards.map((card) => {
            const picture = card.page.pictures[0];
            const quantityInCart = cartItems.find((cartItem) => cartItem.productId === card.cardId)?.quantity ?? 0;
            const isHearted = wishlist.some((item) => item.itemId === card.cardId);
            const openPage = () => router.push(`/products/${card.page.slug}`);
            return (
              <li
                key={card.cardId}
                className={`${styles["all-products-card"]} ${quantityInCart > 0 ? styles["all-products-card-in-cart"] : ""}`}
                onClick={(event) => openProductOnCardClick(event, openPage)}
              >
                <div className={styles["all-products-picture-area"]}>
                  {card.tag && (
                    <span className={`${styles["all-products-tag"]} ${card.tag === "Subscribe & save" ? styles["all-products-tag-green"] : ""}`}>
                      {card.tag}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-pressed={isHearted}
                    aria-label={isHearted ? `Remove ${card.page.name} ${card.packLabel} from wishlist` : `Add ${card.page.name} ${card.packLabel} to wishlist`}
                    className={styles["all-products-heart-button"]}
                    onClick={() => toggleWishlistItem(toWishlistItem(card))}
                  >
                    <HeartIcon isFilled={isHearted} />
                  </button>
                  {picture && (
                    <Image
                      src={picture.imageSource}
                      alt={picture.alt}
                      width={picture.imageWidth}
                      height={picture.imageHeight}
                      sizes="(max-width: 800px) 45vw, 220px"
                      className={styles["all-products-picture"]}
                    />
                  )}
                </div>

                {/* The name is a real link, so the card can be opened from the keyboard too */}
                <h2 className={styles["all-products-name"]}>
                  <Link href={`/products/${card.page.slug}`}>{card.page.name}</Link>
                </h2>
                <p className={styles["all-products-pack"]}>
                  {card.packLabel}
                  {card.page.cardNote ? ` · ${card.page.cardNote}` : ""}
                </p>
                <p className={styles["all-products-rating"]}>
                  <StarIcon />
                  <strong>{card.page.rating.score}</strong> {card.page.rating.count}
                </p>
                <div className={styles["all-products-price-row"]}>
                  <p className={styles["all-products-price"]}>
                    {formatRupees(card.price)}
                    {card.originalPrice && card.originalPrice > card.price && (
                      <s>
                        <span className={styles["all-products-visually-hidden"]}>Was </span>
                        {formatRupees(card.originalPrice)}
                      </s>
                    )}
                  </p>
                  <CardCartControl card={card} quantityInCart={quantityInCart} isLoggedIn={isLoggedIn} />
                </div>
              </li>
            );
          })}
        </ul>

        {/* Daily milk subscription banner */}
        {milkPage && (
          <section className={styles["all-products-subscription-banner"]} aria-labelledby="all-products-subscription-heading">
            <div className={styles["all-products-subscription-text"]}>
              <p className={styles["all-products-subscription-kicker"]}>Daily milk subscription</p>
              <h2 id="all-products-subscription-heading">Fresh A2 milk at your door every morning</h2>
              <p>Save up to {milkSavingPercent}% · Free delivery · Pause or skip any day</p>
            </div>
            <Image
              src="/images/products/desi-cow-milk-bottle-chiranvi-farm.webp"
              alt=""
              width={1188}
              height={2312}
              sizes="80px"
              className={styles["all-products-subscription-bottle"]}
            />
            <Link href={`/products/${milkPage.slug}`} className={styles["all-products-subscription-button"]}>
              Start subscription
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
