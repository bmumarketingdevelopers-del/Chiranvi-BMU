import { useSyncExternalStore } from "react";

/*
  Shopping cart, until a real cart service exists.
  Kept only in the open page's memory, like the login (components/login/login-status.ts): it stays
  while moving between pages of the site, and is emptied when the page is refreshed or the tab is
  closed, so every refresh starts as a new visitor with an empty cart.
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

const emptyCart: CartItem[] = [];
let cartItems: CartItem[] = emptyCart;
let pendingCartProduct: CartProduct | null = null;
const cartListeners = new Set<() => void>();

function saveCartItems(newCartItems: CartItem[]) {
  cartItems = newCartItems;
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
    () => cartItems,
    () => emptyCart,
  );
}

// Total number of packs in the cart (shown on the navigation bar's cart badge).
export function countCartPacks(items: CartItem[]) {
  return items.reduce((packCount, cartItem) => packCount + cartItem.quantity, 0);
}

// Adds one pack of the product (or one more, if it is already in the cart).
export function addProductToCart(product: CartProduct) {
  const isAlreadyInCart = cartItems.some((cartItem) => cartItem.productId === product.productId);
  saveCartItems(
    isAlreadyInCart
      ? cartItems.map((cartItem) =>
          cartItem.productId === product.productId ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
        )
      : [...cartItems, { ...product, quantity: 1 }],
  );
}

// + adds one pack, - removes one; at 0 the product leaves the cart.
export function changeCartItemQuantity(productId: string, quantityChange: 1 | -1) {
  saveCartItems(
    cartItems
      .map((cartItem) =>
        cartItem.productId === productId ? { ...cartItem, quantity: cartItem.quantity + quantityChange } : cartItem,
      )
      .filter((cartItem) => cartItem.quantity > 0),
  );
}

// Logging out: the next visitor starts with an empty cart.
export function emptyTheCart() {
  pendingCartProduct = null;
  saveCartItems(emptyCart);
}

// "Add to cart" before logging in: remember the product until the login finishes.
export function rememberPendingCartProduct(product: CartProduct) {
  pendingCartProduct = product;
}

// After logging in: add the remembered product (if any) to the cart. True when a product was added.
export function addPendingProductToCart() {
  const productToAdd = pendingCartProduct;
  pendingCartProduct = null;
  if (productToAdd) addProductToCart(productToAdd);
  return productToAdd !== null;
}
