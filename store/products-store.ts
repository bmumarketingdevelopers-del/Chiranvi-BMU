import { useSyncExternalStore } from "react";

/*
  The product list shared by the Chiranvi Panel and the website, until real product data comes from
  the database (Supabase).
  - The panel (Products & pricing) changes prices, discounts, photos and stock.
  - The website reads the same list: the landing page's Best Sellers shows the products marked
    showOnBestSellers, with their current price and pack. A product that is switched off or out of stock
    still shows, marked "Sold out", with a "Notify me" button instead of Add to cart.
  - Out of stock is reported by the manager (outOfStockReport). When the panel marks it restocked, the
    manager gets a restock notice and the customers waiting on "Notify me" are told it is back.
  Saved in this browser, so changes stay after a refresh (and show only in this browser for now).
  Milk has a subscription price as well; every other product is one-time only.
*/

export type ProductCategory = "Milk" | "Paneer" | "Ghee & butter" | "Others";
export type StockLevel = "in" | "low" | "out";

export type ShopProduct = {
  productId: string;
  name: string;
  category: ProductCategory;
  packSize: string; // "1 L pouch", "500ml x 1"
  price: number;
  originalPrice?: number; // the old price shown crossed out on the website
  subscriptionPrice?: number; // milk only
  stock: StockLevel;
  isVisible: boolean; // false: switched off in the panel, the website shows it as Sold out
  showOnBestSellers?: boolean;
  bestSellerOrder?: number; // place in the landing page's Best Sellers (new ones go last)
  unitsPerDay: number; // how many sell a day (sample)
  imageSource?: string;
  imageWidth?: number;
  imageHeight?: number;
  // Who marked it out of stock, and when (shown in red at the top of its pop-up in the panel)
  outOfStockReport?: { reportedBy: string; reportedAt: string };
  // Mobile numbers of customers who tapped "Notify me" while it was sold out
  waitingCustomers?: string[];
  updatedAt?: string; // ISO date and time of the last change in the panel
};

// Sent to the manager when the panel marks a product restocked
export type RestockNotice = {
  productId: string;
  productName: string;
  restockedBy: string;
  sentTo: string[];
  customersNotified: number;
  at: string;
};

export const PRODUCT_CATEGORIES: ProductCategory[] = ["Milk", "Paneer", "Ghee & butter", "Others"];

const STORAGE_KEY = "chiranvi-products";
const NOTICES_STORAGE_KEY = "chiranvi-restock-notices";

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

// The six Best Sellers keep the names, pictures and prices the website already shows.
const startingProducts: ShopProduct[] = [
  { productId: "cow-milk-1-l", name: "Cow Milk", category: "Milk", packSize: "1 L pouch", price: 68, subscriptionPrice: 64, stock: "in", isVisible: true, unitsPerDay: 612, imageSource: "/images/products/desi-cow-milk-bottle-chiranvi-farm.webp", imageWidth: 1188, imageHeight: 2312 },
  { productId: "cow-milk-500-ml", name: "Cow Milk", category: "Milk", packSize: "500 ml pouch", price: 36, subscriptionPrice: 34, stock: "in", isVisible: true, unitsPerDay: 388, imageSource: "/images/products/desi-cow-milk-bottle-chiranvi-farm.webp", imageWidth: 1188, imageHeight: 2312 },
  {
    productId: "a2-desi-milk",
    name: "A2 Desi Milk",
    category: "Milk",
    packSize: "500ml x 1",
    price: 249,
    originalPrice: 389,
    subscriptionPrice: 229,
    stock: "in",
    isVisible: true,
    showOnBestSellers: true,
    bestSellerOrder: 1,
    unitsPerDay: 240,
    imageSource: "/images/products/a2-cow-milk-1-litre-bottle.webp",
    imageWidth: 232,
    imageHeight: 500,
  },
  { productId: "buffalo-milk-1-l", name: "Buffalo Milk", category: "Milk", packSize: "1 L pouch", price: 78, subscriptionPrice: 74, stock: "low", isVisible: true, unitsPerDay: 96, imageSource: "/images/products/desi-cow-milk-bottle-chiranvi-farm.webp", imageWidth: 1188, imageHeight: 2312 },
  { productId: "a2-milk-500-ml", name: "A2 Milk", category: "Milk", packSize: "500 ml glass bottle", price: 52, subscriptionPrice: 48, stock: "in", isVisible: true, unitsPerDay: 120, imageSource: "/images/products/desi-cow-milk-bottle-chiranvi-farm.webp", imageWidth: 1188, imageHeight: 2312 },
  {
    productId: "fresh-cow-paneer",
    name: "Fresh Cow Paneer",
    category: "Paneer",
    packSize: "500ml x 1",
    price: 249,
    originalPrice: 389,
    stock: "in",
    isVisible: true,
    showOnBestSellers: true,
    bestSellerOrder: 3,
    unitsPerDay: 84,
    imageSource: "/images/products/fresh-paneer-200g-box.webp",
    imageWidth: 604,
    imageHeight: 444,
  },
  { productId: "malai-paneer-500-g", name: "Malai Paneer", category: "Paneer", packSize: "500 g pack", price: 220, stock: "in", isVisible: true, unitsPerDay: 40, imageSource: "/images/products/fresh-paneer-200g-box.webp", imageWidth: 604, imageHeight: 444 },
  { productId: "malai-paneer-200-g", name: "Malai Paneer", category: "Paneer", packSize: "200 g pack", price: 95, stock: "low", isVisible: true, unitsPerDay: 72, imageSource: "/images/products/fresh-paneer-200g-box.webp", imageWidth: 604, imageHeight: 444 },
  {
    productId: "a2-desi-ghee",
    name: "A2 Desi Ghee",
    category: "Ghee & butter",
    packSize: "500ml x 1",
    price: 249,
    originalPrice: 389,
    stock: "in",
    isVisible: true,
    showOnBestSellers: true,
    bestSellerOrder: 2,
    unitsPerDay: 38,
    imageSource: "/images/products/desi-ghee-jar-chiranvi-farm.webp",
    imageWidth: 1524,
    imageHeight: 2204,
  },
  { productId: "desi-ghee-1-l", name: "Desi Ghee", category: "Ghee & butter", packSize: "1 L jar", price: 790, stock: "out", isVisible: false, unitsPerDay: 12, outOfStockReport: { reportedBy: "Store manager", reportedAt: hoursAgo(5) }, waitingCustomers: ["9845012345", "9900123456", "9741234567"], imageSource: "/images/products/desi-ghee-jar-chiranvi-farm.webp", imageWidth: 1524, imageHeight: 2204 },
  { productId: "white-butter-100-g", name: "White Butter", category: "Ghee & butter", packSize: "100 g", price: 58, stock: "in", isVisible: true, unitsPerDay: 50 },
  { productId: "buttermilk-500-ml", name: "Buttermilk", category: "Others", packSize: "500 ml", price: 25, stock: "in", isVisible: true, unitsPerDay: 140 },
  { productId: "khoa-250-g", name: "Khoa", category: "Others", packSize: "250 g", price: 120, stock: "out", isVisible: false, unitsPerDay: 8, outOfStockReport: { reportedBy: "Store manager", reportedAt: hoursAgo(26) }, waitingCustomers: ["9886543210", "9538765432"] },
  {
    productId: "moringa-powder",
    name: "Moringa Powder",
    category: "Others",
    packSize: "500ml x 1",
    price: 249,
    originalPrice: 389,
    stock: "in",
    isVisible: true,
    showOnBestSellers: true,
    bestSellerOrder: 4,
    unitsPerDay: 20,
    imageSource: "/images/products/moringa-leaves-powder-pouch.webp",
    imageWidth: 336,
    imageHeight: 516,
  },
  {
    productId: "turmeric-powder",
    name: "Turmeric Powder",
    category: "Others",
    packSize: "500ml x 1",
    price: 249,
    originalPrice: 389,
    stock: "low",
    isVisible: true,
    showOnBestSellers: true,
    bestSellerOrder: 5,
    unitsPerDay: 26,
    imageSource: "/images/products/turmeric-powder-pouch.webp",
    imageWidth: 360,
    imageHeight: 548,
  },
  {
    productId: "red-chilli-powder",
    name: "Red Chilli Powder",
    category: "Others",
    packSize: "500ml x 1",
    price: 249,
    originalPrice: 389,
    stock: "low",
    isVisible: true,
    showOnBestSellers: true,
    bestSellerOrder: 6,
    unitsPerDay: 22,
    imageSource: "/images/products/red-chilli-powder-pouch.webp",
    imageWidth: 360,
    imageHeight: 548,
  },
];

let products: ShopProduct[] | null = null;
const listeners = new Set<() => void>();

function getProducts() {
  if (products) return products;
  if (typeof window === "undefined") return startingProducts;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    products = Array.isArray(saved) ? saved : startingProducts;
  } catch {
    products = startingProducts;
  }
  return products as ShopProduct[];
}

function save(newProducts: ShopProduct[]) {
  products = newProducts;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newProducts));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

/*
  Changes from the panel's pop-up. Marking it out of stock switches it off (Sold out on the website) and
  notes who reported it; restocking is done with markRestocked, which also tells the manager.
*/
export function updateProduct(productId: string, changes: Partial<Omit<ShopProduct, "productId">>, changedBy = "Chiranvi Panel") {
  save(
    getProducts().map((product) => {
      if (product.productId !== productId) return product;
      const updated: ShopProduct = { ...product, ...changes, updatedAt: new Date().toISOString() };
      if (changes.stock === "out" && product.stock !== "out") {
        updated.isVisible = false;
        updated.outOfStockReport = { reportedBy: changedBy, reportedAt: new Date().toISOString() };
      }
      if (changes.stock && changes.stock !== "out") updated.outOfStockReport = undefined;
      return updated;
    }),
  );
}

// Back in stock: shown as available again, the manager gets a notice, waiting customers are told
export function markRestocked(productId: string, restockedBy: string, managers: string[]) {
  const product = getProducts().find((existing) => existing.productId === productId);
  if (!product) return null;
  const notice: RestockNotice = {
    productId,
    productName: `${product.name} · ${product.packSize}`,
    restockedBy,
    sentTo: managers.length ? managers : ["Store manager"],
    customersNotified: product.waitingCustomers?.length ?? 0,
    at: new Date().toISOString(),
  };
  updateProduct(productId, { stock: "in", isVisible: true, outOfStockReport: undefined, waitingCustomers: [] });
  try {
    const saved = JSON.parse(window.localStorage.getItem(NOTICES_STORAGE_KEY) ?? "[]");
    window.localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify([notice, ...(Array.isArray(saved) ? saved : [])].slice(0, 50)));
  } catch {
    // Storage blocked: the notice is only shown in the panel's message.
  }
  return notice;
}

// "Notify me" on the website (once per mobile number)
export function askToBeNotified(productId: string, mobileNumber: string) {
  save(
    getProducts().map((product) =>
      product.productId === productId && !product.waitingCustomers?.includes(mobileNumber)
        ? { ...product, waitingCustomers: [...(product.waitingCustomers ?? []), mobileNumber] }
        : product,
    ),
  );
}

// The photo the product started with (to undo a changed photo)
export function getStartingPhoto(productId: string) {
  const product = startingProducts.find((existing) => existing.productId === productId);
  return product?.imageSource ? { imageSource: product.imageSource, imageWidth: product.imageWidth, imageHeight: product.imageHeight } : null;
}

export function addProduct(product: Omit<ShopProduct, "productId" | "unitsPerDay">) {
  const baseId = `${product.name}-${product.packSize}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  let productId = baseId;
  for (let copy = 2; getProducts().some((existing) => existing.productId === productId); copy++) productId = `${baseId}-${copy}`;
  const newProduct: ShopProduct = { ...product, productId, unitsPerDay: 0 };
  save([...getProducts(), newProduct]);
  return newProduct;
}

// Deleted in the panel: gone from the panel and the website
export function removeProduct(productId: string) {
  save(getProducts().filter((product) => product.productId !== productId));
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // A change made in another tab (the panel open next to the website)
  function followOtherTabs(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    products = null;
    onChange();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

export function useShopProducts() {
  return useSyncExternalStore(subscribe, getProducts, () => startingProducts);
}

// Can be ordered on the website: switched on and in stock (otherwise it shows as Sold out)
export function isAvailableToOrder(product: ShopProduct) {
  return product.isVisible && product.stock !== "out";
}

// Percent off the old (crossed-out) price, e.g. 36
export function getDiscountPercent(product: Pick<ShopProduct, "price" | "originalPrice">) {
  return product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
}
