"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rememberPageAfterLogin, useIsLoggedIn, useIsLoginStatusKnown } from "@/components/login/login-status";
import SiteFooter from "@/components/footer/site-footer";
import SiteNavigationPlacement from "@/components/navigation/site-navigation-placement";
import { addProductToCart, changeCartItemQuantity, rememberPendingCartProduct, useCartItems, type CartProduct } from "@/store/cart-store";
import { useProductPages } from "@/store/product-pages-store";
import { isAvailableToOrder, useShopProducts, type ShopProduct } from "@/store/products-store";
import { toggleWishlistItem, useWishlist, type WishlistItem } from "@/store/wishlist-store";
import { SHOP_CATEGORIES, type ProductPage, type ShopCategory } from "./product-page-data";
import styles from "./all-products-page.module.css";

/*
  All products (/products), from the design: title, category filters with a small picture and a count,
  then one card per product. Only for logged-in visitors: anyone else is sent to the login, which then comes
  back to this page.
  - Products with a page (the six starting products and the ones added in the Chiranvi Panel): one card
    each, clicking anywhere on it opens the page.
  - The powders (Moringa, Turmeric, Red Chilli) have their own pages now. If one of those pages is deleted
    in the panel, its card from the product list (store/products-store.ts) shows under "Powders" instead:
    that card does not open anything; ADD and the heart work.
  - ADD puts that pack in the cart (then "− 1 +"); not logged in, it goes to the login first.
  - The heart saves the pack to the Wishlist (account → Wishlist); Notify me asks for a stock alert. Not
    logged in, both go to the login first (nothing is added without an account) and come back here.
  "View all products" and "Start Shopping" across the site lead here.
*/

export type ProductCard = {
  cardId: string; // the cart and wishlist id: same as the product page uses
  slug: string; // product page address: /products/<slug>
  hasPage: boolean;
  name: string;
  category: ShopCategory;
  packLabel: string;
  cartPackSize: string; // what the cart shows: "1 litre glass jar"
  cardNote?: string; // "· Bilona method"
  rating: { score: string; count: string };
  picture?: { imageSource: string; imageWidth: number; imageHeight: number; alt: string };
  price: number;
  originalPrice?: number;
  tag?: string; // on the picture: "Subscribe & save", "Best value", "Most popular"
  isSoldOut?: boolean;
  isSubscription?: boolean; // milk: View product (subscription or one-time is chosen on its page)
};

// The powders shown before their own pages exist (ids in store/products-store.ts; the panel shows these too)
export const POWDER_PRODUCT_IDS = ["moringa-powder", "turmeric-powder", "red-chilli-powder"];

// Small picture on each filter button (pictures the site already has)
const FILTER_PICTURES: Record<ShopCategory, { imageSource: string; imageWidth: number; imageHeight: number }> = {
  Milk: { imageSource: "/images/products/desi-cow-milk-bottle-chiranvi-farm.webp", imageWidth: 1188, imageHeight: 2312 },
  Paneer: { imageSource: "/images/products/fresh-paneer-box-chiranvi-farm.webp", imageWidth: 3712, imageHeight: 2728 },
  Ghee: { imageSource: "/images/products/desi-ghee-jar-chiranvi-farm.webp", imageWidth: 1524, imageHeight: 2204 },
  Butter: { imageSource: "/images/categories/butter-category.webp", imageWidth: 412, imageHeight: 272 },
  Flours: { imageSource: "/images/products/whole-wheat-atta-pack.webp", imageWidth: 1984, imageHeight: 1806 },
  Batter: { imageSource: "/images/products/idli-batter-powder-pack.webp", imageWidth: 1808, imageHeight: 2744 },
  Powders: { imageSource: "/images/products/turmeric-powder-pouch.webp", imageWidth: 360, imageHeight: 548 },
  Others: { imageSource: "/images/categories/flours-category-chiranvi-farm.webp", imageWidth: 412, imageHeight: 276 },
};

function formatRupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/*
  One card per product page: a one-time product shows its main pack (the one its page opens on, e.g.
  ghee 1 litre), a subscription product its one-time price per unit. The other sizes are chosen on the page.
*/
function toPageCards(pages: ProductPage[], shopProducts: ShopProduct[]): ProductCard[] {
  return pages
    .filter((page) => page.status === "published")
    .flatMap((page): ProductCard[] => {
      // Its card on the panel's Products & pricing: switched off or out of stock there shows Sold out here
      const panelCard = shopProducts.find((product) => product.productId === page.slug || page.panelCardIds?.includes(product.productId));
      const shared = {
        isSoldOut: panelCard ? !isAvailableToOrder(panelCard) : undefined,
        slug: page.slug,
        hasPage: true,
        name: page.name,
        category: page.shopCategory ?? "Others",
        cardNote: page.cardNote,
        rating: page.rating,
        picture: page.pictures[0],
      };
      if (page.kind === "subscription") {
        // "1 litre" (the card note adds "· glass bottle")
        return [{ ...shared, cardId: page.slug, packLabel: `1 ${page.unitName}`, cartPackSize: page.packSize, price: page.price, originalPrice: page.originalPrice, tag: page.cardTag ?? "Subscribe & save", isSubscription: true }];
      }
      const pack = page.packs.find((onePack) => onePack.packId === page.defaultPackId) ?? page.packs[0];
      if (!pack) return [];
      return [
        {
          ...shared,
          cardId: `${page.slug}-${pack.packId}`,
          packLabel: pack.label,
          cartPackSize: `${pack.label} ${page.cartPackWord}`,
          price: pack.price,
          originalPrice: pack.originalPrice,
          tag: pack.tag,
        },
      ];
    });
}

// The powders, from the product list (their prices and stock change with the Chiranvi Panel)
function toPowderCards(shopProducts: ShopProduct[], pageSlugs: Set<string>): ProductCard[] {
  return POWDER_PRODUCT_IDS.flatMap((productId): ProductCard[] => {
    const product = shopProducts.find((shopProduct) => shopProduct.productId === productId);
    if (!product || pageSlugs.has(productId)) return []; // gone from the list, or it has its own page now
    return [
      {
        cardId: product.productId,
        slug: product.productId,
        hasPage: false,
        name: product.name,
        category: "Powders",
        packLabel: product.packSize,
        cartPackSize: product.packSize,
        // Placeholder rating, the same as the landing page's Best Sellers
        rating: { score: "4.5", count: "(7,105)" },
        picture: product.imageSource
          ? { imageSource: product.imageSource, imageWidth: product.imageWidth ?? 400, imageHeight: product.imageHeight ?? 400, alt: product.name }
          : undefined,
        price: product.price,
        originalPrice: product.originalPrice,
        isSoldOut: !isAvailableToOrder(product),
      },
    ];
  });
}

/*
  Ragi and Jowar flour have their own pages now (product-page-data.ts). These cards show only if one of
  those pages is deleted in the panel: both use the site's Ragi + Jowar flours picture; Jowar is out of
  stock (Notify me).
*/
const FLOURS_PICTURE = { imageSource: "/images/categories/flours-category-chiranvi-farm.webp", imageWidth: 412, imageHeight: 276 };
const UPCOMING_FLOUR_CARDS: ProductCard[] = [
  {
    cardId: "ragi-flour-1-kg",
    slug: "ragi-flour",
    hasPage: false,
    name: "Ragi Flour",
    category: "Flours",
    packLabel: "1 kg",
    cartPackSize: "1 kg pouch",
    cardNote: "stone-ground",
    rating: { score: "4.6", count: "(402)" },
    picture: { ...FLOURS_PICTURE, alt: "Chiranvi Farm Ragi Flour" },
    price: 119,
    originalPrice: 140,
    tag: "New",
  },
  {
    cardId: "jowar-flour-1-kg",
    slug: "jowar-flour",
    hasPage: false,
    name: "Jowar Flour",
    category: "Flours",
    packLabel: "1 kg",
    cartPackSize: "1 kg pouch",
    cardNote: "stone-ground",
    rating: { score: "4.5", count: "(196)" },
    picture: { ...FLOURS_PICTURE, alt: "Chiranvi Farm Jowar Flour" },
    price: 99,
    originalPrice: 115,
    isSoldOut: true,
  },
];

// The upcoming flours, until a page with the same address exists (then that page's card shows instead)
function toUpcomingFlourCards(pageSlugs: Set<string>) {
  return UPCOMING_FLOUR_CARDS.filter((card) => !pageSlugs.has(card.slug));
}

// "Notify me" on an out-of-stock card: remembered in this browser until stock alerts are kept in Supabase
const NOTIFY_STORAGE_KEY = "chiranvi-notify-me";

function readNotifyRequests(): string[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(NOTIFY_STORAGE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

/*
  Logged out: the heart and Notify me go to the login first (nothing is saved without an account), and the
  login comes back to this page.
*/
function goToLoginAndBack(router: ReturnType<typeof useRouter>) {
  rememberPageAfterLogin(window.location.pathname + window.location.search);
  router.push("/login");
}

function NotifyMeButton({ cardId, isLoggedIn }: { cardId: string; isLoggedIn: boolean }) {
  const router = useRouter();
  const [isRequested, setIsRequested] = useState(false);
  useEffect(() => {
    // Read once in the browser (localStorage is not there while the page is drawn on the server)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsRequested(readNotifyRequests().includes(cardId));
  }, [cardId]);

  if (isRequested) {
    return (
      <span className={styles["all-products-notify-done"]} role="status">
        ✓ We&rsquo;ll notify you
      </span>
    );
  }
  return (
    <button
      type="button"
      className={styles["all-products-notify-button"]}
      onClick={() => {
        if (!isLoggedIn) {
          goToLoginAndBack(router);
          return;
        }
        try {
          window.localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify([...readNotifyRequests(), cardId]));
        } catch {
          // Storage blocked: shown as requested until the page is refreshed.
        }
        setIsRequested(true);
      }}
    >
      Notify me
    </button>
  );
}

function toCartProduct(card: ProductCard): CartProduct {
  return {
    productId: card.cardId,
    name: card.name,
    imageSource: card.picture?.imageSource ?? "",
    imageWidth: card.picture?.imageWidth ?? 400,
    imageHeight: card.picture?.imageHeight ?? 400,
    packSize: card.cartPackSize,
    price: card.price,
    originalPrice: card.originalPrice ?? card.price,
  };
}

function toWishlistItem(card: ProductCard): WishlistItem {
  return {
    itemId: card.cardId,
    slug: card.slug,
    name: card.name,
    packLabel: card.packLabel,
    price: card.price,
    originalPrice: card.originalPrice,
    imageSource: card.picture?.imageSource ?? "",
    imageWidth: card.picture?.imageWidth ?? 400,
    imageHeight: card.picture?.imageHeight ?? 400,
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
      <div className={styles["all-products-quantity-control"]} role="group" aria-label={`${card.name} ${card.packLabel} quantity`}>
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

// Every product card, in the All products page's order (also used by the product pages' Fast selling row)
export function useProductCards() {
  const productPages = useProductPages();
  const shopProducts = useShopProducts();
  return useMemo(() => {
    const pageSlugs = new Set(productPages.map((page) => page.slug));
    const pageCards = toPageCards(productPages, shopProducts);
    // The upcoming flours sit right after the other flours (atta)
    const lastFlourIndex = pageCards.map((card) => card.category).lastIndexOf("Flours");
    const flourCards = toUpcomingFlourCards(pageSlugs);
    const withFlours =
      lastFlourIndex === -1 ? [...pageCards, ...flourCards] : [...pageCards.slice(0, lastFlourIndex + 1), ...flourCards, ...pageCards.slice(lastFlourIndex + 1)];
    return [...withFlours, ...toPowderCards(shopProducts, pageSlugs)];
  }, [productPages, shopProducts]);
}

/*
  One product card (All products page and the product pages' Fast selling row): picture with tag and heart,
  name, pack, rating, price, and the button:
  - milk (bought by subscription or one-time): "View product", to choose on its page;
  - others: ADD → "− n +"; out of stock: Notify me.
  Clicking anywhere else on the card opens the product page (when it has one).
*/
export function ProductCardTile({ card }: { card: ProductCard }) {
  const router = useRouter();
  const cartItems = useCartItems();
  const wishlist = useWishlist();
  const isLoggedIn = useIsLoggedIn();
  const picture = card.picture;
  const quantityInCart = cartItems.find((cartItem) => cartItem.productId === card.cardId)?.quantity ?? 0;
  const isHearted = wishlist.some((item) => item.itemId === card.cardId);
  // No page yet (the powders, Ragi and Jowar flour): the card does not open anything
  const openPage = () => {
    if (card.hasPage) router.push(`/products/${card.slug}`);
  };

  return (
    <li
      className={`${styles["all-products-card"]} ${quantityInCart > 0 && !card.isSubscription ? styles["all-products-card-in-cart"] : ""} ${
        card.hasPage ? "" : styles["all-products-card-without-page"]
      }`}
      onClick={(event) => openProductOnCardClick(event, openPage)}
    >
      <div className={styles["all-products-picture-area"]}>
        {card.tag && (
          <span
            className={`${styles["all-products-tag"]} ${card.tag === "Subscribe & save" ? styles["all-products-tag-green"] : ""} ${
              card.tag === "New" ? styles["all-products-tag-new"] : ""
            }`}
          >
            {card.tag}
          </span>
        )}
        {card.isSoldOut && <span className={styles["all-products-out-of-stock"]}>Out of stock</span>}
        <button
          type="button"
          aria-pressed={isHearted}
          aria-label={isHearted ? `Remove ${card.name} ${card.packLabel} from wishlist` : `Add ${card.name} ${card.packLabel} to wishlist`}
          className={styles["all-products-heart-button"]}
          onClick={() => (isLoggedIn ? toggleWishlistItem(toWishlistItem(card)) : goToLoginAndBack(router))}
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
      <h3 className={styles["all-products-name"]}>
        {card.hasPage ? <Link href={`/products/${card.slug}`}>{card.name}</Link> : card.name}
      </h3>
      <p className={styles["all-products-pack"]}>
        {card.packLabel}
        {card.cardNote ? ` · ${card.cardNote}` : ""}
      </p>
      <p className={styles["all-products-rating"]}>
        <StarIcon />
        <strong>{card.rating.score}</strong> {card.rating.count}
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
        {card.isSubscription ? (
          <Link href={`/products/${card.slug}`} className={styles["all-products-add-button"]}>
            View product
          </Link>
        ) : card.isSoldOut ? (
          <NotifyMeButton cardId={card.cardId} isLoggedIn={isLoggedIn} />
        ) : (
          <CardCartControl card={card} quantityInCart={quantityInCart} isLoggedIn={isLoggedIn} />
        )}
      </div>
    </li>
  );
}

// startingCategory: from /products?category=Milk (Shop by Category on the home page); missing: All
export default function AllProductsPage({ startingCategory }: { startingCategory?: ShopCategory }) {
  const [chosenCategory, setChosenCategory] = useState<ShopCategory | "All">(startingCategory ?? "All");
  const cards = useProductCards();
  const categoriesWithCards = SHOP_CATEGORIES.filter((category) => cards.some((card) => card.category === category));
  const shownCards = chosenCategory === "All" ? cards : cards.filter((card) => card.category === chosenCategory);
  const isLoggedIn = useIsLoggedIn();
  const isLoginStatusKnown = useIsLoginStatusKnown();
  const router = useRouter();

  // Not logged in: log in first, then come back to this page. Waits until the saved login has been read.
  useEffect(() => {
    if (!isLoginStatusKnown || isLoggedIn) return;
    rememberPageAfterLogin(window.location.pathname + window.location.search);
    router.replace("/login");
  }, [isLoginStatusKnown, isLoggedIn, router]);

  // Nothing is shown until the visitor is known to be logged in
  if (!isLoggedIn) return null;

  return (
    <div className={styles["all-products-page"]}>
      <SiteNavigationPlacement />

      <main className={styles["all-products-page-content"]}>
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
                  <Image src={picture.imageSource} alt="" width={picture.imageWidth} height={picture.imageHeight} sizes="40px" />
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
          {shownCards.map((card) => (
            <ProductCardTile key={card.cardId} card={card} />
          ))}
        </ul>
      </main>

      {/* Shared site footer with the Refer a Friend banner (same as the landing page) */}
      <SiteFooter />
    </div>
  );
}
