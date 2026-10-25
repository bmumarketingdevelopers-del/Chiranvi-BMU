import { useSyncExternalStore } from "react";

/*
  Shopping cart, until a real cart service exists.
  Saved in this browser (localStorage), so it stays after a refresh, like the login
  (components/login/login-status.ts). Logging out empties it.
  Each item keeps the product details it needs for the cart page, plus its quantity.

  "Add to cart" before logging in: the product is remembered as pending; logging in then adds it
  to the cart and returns to the landing page.
*/

export type CartProduct = {
  productId: string;
  name: string;
  imageSource: string;
  imageWidth: number;
  imageHeight: number;
  packSize: string;
  price: number;
  originalPrice: number;
};

export type CartItem = CartProduct & { quantity: number };

const CART_STORAGE_KEY = "chiranvi-cart";
const emptyCart: CartItem[] = [];
let cartItems: CartItem[] = emptyCart;
let hasReadSavedCart = false;
let pendingCartProduct: CartProduct | null = null;
const cartListeners = new Set<() => void>();

function getCartItems() {
  if (!hasReadSavedCart && typeof window !== "undefined") {
    hasReadSavedCart = true;
    try {
      const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "null");
      if (Array.isArray(saved)) cartItems = saved;
    } catch {
      // Nothing saved, or storage blocked: start with an empty cart.
    }
  }
  return cartItems;
}

function saveCartItems(newCartItems: CartItem[]) {
  cartItems = newCartItems;
  hasReadSavedCart = true;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCartItems));
  } catch {
    // Storage blocked: the cart lasts until the page is refreshed.
  }
  cartListeners.forEach((onChange) => onChange());
}

function subscribeToCart(onChange: () => void) {
  cartListeners.add(onChange);
  return () => {
    cartListeners.delete(onChange);
  };
}

// Items in the cart. On the server the cart is empty.
export function useCartItems() {
  return useSyncExternalStore(
    subscribeToCart,
    getCartItems,
    () => emptyCart,
  );
}

// Total number of packs in the cart (shown on the navigation bar's cart badge).
export function countCartPacks(items: CartItem[]) {
  return items.reduce((packCount, cartItem) => packCount + cartItem.quantity, 0);
}

/*
  Adds one pack of the product (or one more, if it is already in the cart).
  A plan left waiting from "Start subscription" goes: the customer is now buying one-time, and while a
  plan waits the cart page shows only that plan (Add to cart / Buy now would seem to do nothing).
*/
export function addProductToCart(product: CartProduct) {
  if (getCartSubscription()) setCartSubscription(null);
  const cartItems = getCartItems();
  const isAlreadyInCart = cartItems.some((cartItem) => cartItem.productId === product.productId);
  saveCartItems(
    isAlreadyInCart
      ? cartItems.map((cartItem) =>
          cartItem.productId === product.productId ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
        )
      : [...cartItems, { ...product, quantity: 1 }],
  );
}

// Takes the product out of the cart (all its packs), e.g. the milk once its plan is paid.
export function removeCartItem(productId: string) {
  saveCartItems(getCartItems().filter((cartItem) => cartItem.productId !== productId));
}

// + adds one pack, - removes one; at 0 the product leaves the cart.
export function changeCartItemQuantity(productId: string, quantityChange: 1 | -1) {
  saveCartItems(
    getCartItems()
      .map((cartItem) =>
        cartItem.productId === productId ? { ...cartItem, quantity: cartItem.quantity + quantityChange } : cartItem,
      )
      .filter((cartItem) => cartItem.quantity > 0),
  );
}

// The coupon applied at checkout, kept with the cart so a refresh does not drop it
const COUPON_STORAGE_KEY = "chiranvi-cart-coupon";
let appliedCouponCode: string | null = null;
let hasReadSavedCoupon = false;

function getAppliedCouponCode() {
  if (!hasReadSavedCoupon && typeof window !== "undefined") {
    hasReadSavedCoupon = true;
    try {
      appliedCouponCode = window.localStorage.getItem(COUPON_STORAGE_KEY);
    } catch {
      appliedCouponCode = null;
    }
  }
  return appliedCouponCode;
}

export function setAppliedCouponCode(code: string | null) {
  appliedCouponCode = code;
  hasReadSavedCoupon = true;
  try {
    if (code) window.localStorage.setItem(COUPON_STORAGE_KEY, code);
    else window.localStorage.removeItem(COUPON_STORAGE_KEY);
  } catch {
    // Storage blocked: the coupon lasts until the page is refreshed.
  }
  cartListeners.forEach((onChange) => onChange());
}

export function useAppliedCouponCode() {
  return useSyncExternalStore(subscribeToCart, getAppliedCouponCode, () => null);
}

/*
  A milk subscription waiting to be paid ("Start subscription" on the milk page). While there is one,
  the cart page checks out only the subscription; the one-time items stay in the cart for later.
*/
export type CartSubscription = {
  product: CartProduct;
  planId: string;
  planName: string; // "6 Months"
  months: number;
  days: number;
  bottlesPerDay: number;
  pricePerLitre: number;
  bottleCount: number;
  planTotal: number; // what the customer pays
  oneTimeTotal: number; // the same bottles at the one-time price
  bottleLabel?: string; // "½ L" (missing: "1 L")
  unitName?: string; // what the price is per: "½ litre" (missing: "litre")
  extendsOrderId?: string; // "Extend Plan" on My Subscription: adds these days to that running plan
};

const SUBSCRIPTION_STORAGE_KEY = "chiranvi-cart-subscription";
let cartSubscription: CartSubscription | null = null;
let hasReadSavedSubscription = false;

function getCartSubscription() {
  if (!hasReadSavedSubscription && typeof window !== "undefined") {
    hasReadSavedSubscription = true;
    try {
      cartSubscription = JSON.parse(window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY) ?? "null");
    } catch {
      cartSubscription = null;
    }
  }
  return cartSubscription;
}

/*
  Start subscription puts the plan here; null takes it out (paid, switched or removed).
  The milk's quantity (Add Quantity) stays in the cart while the plan waits, so going back to the milk
  page keeps it; once the plan is paid, the cart page takes that milk out (removeCartItem).
*/
export function setCartSubscription(subscription: CartSubscription | null) {
  cartSubscription = subscription;
  hasReadSavedSubscription = true;
  try {
    if (subscription) window.localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(subscription));
    else window.localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
  } catch {
    // Storage blocked: the subscription lasts until the page is refreshed.
  }
  cartListeners.forEach((onChange) => onChange());
}

export function useCartSubscription() {
  return useSyncExternalStore(subscribeToCart, getCartSubscription, () => null);
}

// Logging out, or an order placed: the cart (its coupon and any subscription) starts empty.
export function emptyTheCart() {
  pendingCartProduct = null;
  setAppliedCouponCode(null);
  setCartSubscription(null);
  saveCartItems(emptyCart);
}

// "Add to cart" before logging in: remember the product until the login finishes.
export function rememberPendingCartProduct(product: CartProduct) {
  pendingCartProduct = product;
}

// The login was closed without logging in: forget the remembered product, so a later login doesn't add it.
export function forgetPendingCartProduct() {
  pendingCartProduct = null;
}

// After logging in: add the remembered product (if any) to the cart. True when a product was added.
export function addPendingProductToCart() {
  const productToAdd = pendingCartProduct;
  pendingCartProduct = null;
  if (productToAdd) addProductToCart(productToAdd);
  return productToAdd !== null;
}
