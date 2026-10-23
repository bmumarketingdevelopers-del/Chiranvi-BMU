"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AddressFormDialog from "@/components/account/address/address-form-dialog";
import { CART_ICON_CLICKED_ON_CART_PAGE_EVENT } from "@/components/navigation/site-navigation-bar";
import SiteNavigationPlacement from "@/components/navigation/site-navigation-placement";
import BestSellersSection from "@/components/landing/best-sellers/best-sellers-section";
import { rememberPageAfterLogin, useIsLoggedIn } from "@/components/login/login-status";
import {
  addAddress,
  formatAddressLine,
  removeAddress,
  setDefaultAddress,
  updateAddress,
  useAddressBook,
  type AddressDetails,
  type SavedAddress,
} from "@/store/address-store";
import {
  changeCartItemQuantity,
  emptyTheCart,
  setAppliedCouponCode,
  setCartSubscription,
  startSwitchToSubscription,
  useAppliedCouponCode,
  useCartItems,
  useCartSubscription,
  type CartSubscription,
} from "@/store/cart-store";
import { checkCouponForCart, checkCouponForSubscription, recordCouponUse, useCoupons } from "@/store/coupons-store";
import { findRunningPlans, formatPlanDate, placeOrder, useOrders, type Order, type RunningPlan } from "@/store/orders-store";
import { useShopProducts } from "@/store/products-store";
import styles from "./cart-view.module.css";

/*
  The cart page (/cart):
    Empty cart   the original "My Cart" design: the site navigation bar, back button + "My Cart (0)", the
                 empty-cart message and the landing page's Best Sellers below it (clicking the navigation
                 bar's cart icon here shakes the trolley).
    With products, everything on one page (top bar: logo and the steps Cart — Select address — Payment,
    each ticked when done):
      left   Your items ("- quantity +", the "packed fresh" note), then Delivery address (the default
             address until one is confirmed);
      right  Order summary: coupon code (from the Chiranvi Panel's Coupons & offers), item total at MRP,
             discount on MRP, coupon, delivery fee (₹30, free from ₹499 after discounts), To pay, the
             saving, and "Select address".
    "Select address" (or the address card) opens the address pop-up (same cards as My Addresses: pick,
    Set as Default, Edit, Remove, Add new address). Picking one ticks Address and the button becomes
    "Pay now · ₹…". Razorpay is not connected yet, so Pay now places the order straight away (nothing is
    charged), ticks Payment and shows "Your order has been placed" with Track your order.
  Milk subscription ("Start subscription" on the milk page): the same page, but the cart shows only the
  plan ("Your subscription"; only the one-time cart offers a switch, to a subscription) and the
  summary shows the plan at the one-time price, the subscription saving, any coupon (All products, Milk or
  Milk plans codes) and free delivery.
  The one-time items wait in the cart until then. The paid plan shows on My Subscription.
  A coupon used here counts as a use in the panel. Not logged in: Pay goes to the login first, then back.
  Phones: one column, with the total and the step's button kept at the bottom of the screen.
*/

const DELIVERY_FEE = 30;
// The only product sold as a subscription (its page has the plans)
const MILK_PRODUCT_ID = "a2-desi-milk";
const FREE_DELIVERY_FROM = 499;

const rupees = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

// The cart is saved in the browser, so it is only known after the page has loaded there.
function subscribeToNothing() {
  return () => {};
}

type Step = "cart" | "address" | "payment";


// Cart ✓ — Details — Payment (after placing the order, all three are done)
function CheckoutStepBar({ current }: { current: Step | "done" }) {
  const steps: { key: Step; label: string }[] = [
    { key: "cart", label: "Cart" },
    { key: "address", label: "Select address" },
    { key: "payment", label: "Payment" },
  ];
  const currentIndex = current === "done" ? steps.length : steps.findIndex((step) => step.key === current);
  return (
    <ol className={styles["checkout-steps"]} aria-label="Checkout steps">
      {steps.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "next";
        return (
          <li key={step.key} className={`${styles["checkout-step"]} ${styles[`checkout-step-${state}`]}`} aria-current={state === "current" ? "step" : undefined}>
            {index > 0 && <span className={styles["checkout-step-line"]} aria-hidden="true" />}
            <span className={styles["checkout-step-circle"]} aria-hidden="true">
              {state === "done" ? (
                <svg viewBox="0 0 24 24">
                  <path d="M6 12.5l4 4 8-9" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <span className={styles["checkout-step-label"]}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/*
  Pop-up frame (the address pop-up): dimmed page behind, a close (x) button at the top right; Escape or
  the dimmed page closes it, and the page behind does not scroll while it is open.
*/
function CheckoutPopupFrame({
  labelledBy,
  isWide,
  onClose,
  children,
}: {
  labelledBy: string;
  isWide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Latest onClose, so the Escape listener below is set up only once.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", closeOnEscape);
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <div className={styles["plan-popup-overlay"]}>
      <button type="button" aria-label="Close" tabIndex={-1} className={styles["plan-popup-dimmed-page"]} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`${styles["plan-popup"]} ${isWide ? styles["checkout-popup-wide"] : ""}`}
      >
        <button type="button" aria-label="Close" className={`${styles["plan-popup-icon-button"]} ${styles["checkout-popup-close-button"]}`} onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </section>
    </div>
  );
}

/*
  Pop-up when the address picked for a new plan already gets a running plan: extend that plan instead,
  or choose another address. Escape or the dimmed page closes it; the page behind does not scroll.
*/
function SameAddressPlanDialog({
  plan,
  newPlan,
  amountToPay,
  isLoggedIn,
  onExtend,
  onClose,
}: {
  plan: RunningPlan;
  newPlan: CartSubscription;
  amountToPay: number; // the plan's total after any coupon
  isLoggedIn: boolean;
  onExtend: (plan: RunningPlan) => void;
  onClose: () => void;
}) {
  const extendButtonRef = useRef<HTMLButtonElement>(null);
  // Latest onClose, so the Escape listener below is set up only once.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    extendButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", closeOnEscape);
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  // The running plan's last day once the new plan's days are added to it
  const newLastDay = new Date(plan.endsOn.getTime() + newPlan.days * 24 * 60 * 60 * 1000);

  return (
    <div className={styles["plan-popup-overlay"]}>
      <button type="button" aria-label="Close" tabIndex={-1} className={styles["plan-popup-dimmed-page"]} onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="plan-popup-heading" className={styles["plan-popup"]}>
        <div className={styles["plan-popup-heading-row"]}>
          <span className={styles["plan-popup-warning-icon"]} aria-hidden="true">
            !
          </span>
          <h2 id="plan-popup-heading" className={styles["plan-popup-heading"]}>
            This address already has a running plan
          </h2>
          <button type="button" aria-label="Close" className={styles["plan-popup-icon-button"]} onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p className={styles["plan-popup-text"]}>
          You chose the address where your <strong>{plan.planName}</strong> plan is already being delivered. Extend that
          plan instead (it will then run until <strong>{formatPlanDate(newLastDay)}</strong>), or choose a different address
          for the new plan.
        </p>

        {/* The running plan: name, bottles a day, last day and address */}
        <div className={styles["plan-popup-plan-box"]}>
          <p className={styles["plan-popup-plan-name"]}>
            A2 Desi Milk · {plan.planName}
            <span className={styles["plan-popup-plan-badge"]}>Running</span>
          </p>
          <p className={styles["plan-popup-plan-line"]}>
            {plan.bottlesPerDay} L every morning · Ends on {formatPlanDate(plan.endsOn)}
          </p>
          <p className={styles["plan-popup-plan-line"]}>{plan.deliverTo}</p>
        </div>

        <div className={styles["plan-popup-buttons"]}>
          {isLoggedIn ? (
            <button ref={extendButtonRef} type="button" className={styles["plan-popup-primary-button"]} onClick={() => onExtend(plan)}>
              Extend that plan · {rupees(amountToPay)}
            </button>
          ) : (
            <Link href="/login" className={styles["plan-popup-primary-button"]} onClick={() => rememberPageAfterLogin("/cart")}>
              Log in to extend
            </Link>
          )}
          <button type="button" className={styles["plan-popup-secondary-button"]} onClick={onClose}>
            Choose another address
          </button>
        </div>
      </section>
    </div>
  );
}

export default function CartView() {
  const cartItems = useCartItems();
  // A milk plan from "Start subscription" (checked out on its own, before the one-time items)
  const cartSubscription = useCartSubscription();
  const products = useShopProducts();
  const coupons = useCoupons();
  const isLoggedIn = useIsLoggedIn();
  const { addresses, defaultAddressId } = useAddressBook();
  const isCartLoaded = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const router = useRouter();

  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  // The address open in the form for Edit (null = adding a new one)
  const [addressBeingEdited, setAddressBeingEdited] = useState<SavedAddress | null>(null);
  const [couponInput, setCouponInput] = useState("");
  // Kept with the cart, so a refresh keeps the coupon
  const appliedCode = useAppliedCouponCode();
  const setAppliedCode = setAppliedCouponCode;
  const [couponError, setCouponError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  // The address pop-up, and whether an address was confirmed there (ticks Address; the button becomes Pay now)
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
  const [hasPickedAddress, setHasPickedAddress] = useState(false);
  /*
    Buying a plan while one is still running:
      a plan from "Extend Plan" (My Subscription) extends the plan it names, at that plan's address;
      picking the address of a running plan opens "this address already has a running plan".
  */
  const runningPlans = findRunningPlans(useOrders());
  const planBeingExtended = cartSubscription?.extendsOrderId
    ? (runningPlans.find((plan) => plan.orderId === cartSubscription.extendsOrderId) ?? null)
    : null;
  const [planAtPickedAddress, setPlanAtPickedAddress] = useState<RunningPlan | null>(null);
  // The pop-up keeps the latest close function itself, so this needs no useCallback
  const closeSameAddressDialog = () => setPlanAtPickedAddress(null);
  // Escape or the dimmed page close the address pop-up, but not while the address form or a plan pop-up is on top of it
  const closeAddressPicker = () => {
    if (!isAddressFormOpen && !planAtPickedAddress) setIsAddressPickerOpen(false);
  };
  const closeAddressForm = useCallback(() => {
    setIsAddressFormOpen(false);
    setAddressBeingEdited(null);
  }, []);
  // Empty cart: counts cart icon clicks on this page; each new value restarts the trolley shake (its key)
  const [trolleyShakeCount, setTrolleyShakeCount] = useState(0);

  // Clicking the navigation bar's cart icon while on this page shakes the trolley left and right.
  useEffect(() => {
    function shakeTrolley() {
      setTrolleyShakeCount((shakeCount) => shakeCount + 1);
    }
    window.addEventListener(CART_ICON_CLICKED_ON_CART_PAGE_EVENT, shakeTrolley);
    return () => window.removeEventListener(CART_ICON_CLICKED_ON_CART_PAGE_EVENT, shakeTrolley);
  }, []);

  const chosenAddress =
    addresses.find((address) => address.id === (chosenAddressId ?? defaultAddressId)) ?? addresses[0] ?? null;
  // The milk bought one-time (the cart then offers "Switch to subscription")
  const milkInCart = cartItems.some((item) => item.productId === MILK_PRODUCT_ID);
  // Products in the cart (as in the design: "4 items" and the count next to "Your items")
  const itemCount = cartItems.length;

  // Money: MRP, the products' own discount, the coupon, delivery
  const itemTotalAtMrp = cartItems.reduce((sum, item) => sum + Math.max(item.originalPrice, item.price) * item.quantity, 0);
  const itemTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountOnMrp = itemTotalAtMrp - itemTotal;
  const cartLines = cartItems.map((item) => ({
    amount: item.price * item.quantity,
    category: products.find((product) => product.productId === item.productId)?.category ?? "Others",
  }));
  // A code is checked against the plan (subscription) or the items; again whenever the cart changes
  function checkCoupon(code: string) {
    return cartSubscription ? checkCouponForSubscription(code, coupons, cartSubscription) : checkCouponForCart(code, coupons, cartLines);
  }
  const couponCheck = appliedCode ? checkCoupon(appliedCode) : null;
  const appliedCoupon = couponCheck && "coupon" in couponCheck ? couponCheck : null;
  const couponDiscount = appliedCoupon ? Math.min(appliedCoupon.discount, cartSubscription ? cartSubscription.planTotal : itemTotal) : 0;
  const afterDiscounts = itemTotal - couponDiscount;
  const isDeliveryFree = afterDiscounts >= FREE_DELIVERY_FROM;
  const deliveryFee = isDeliveryFree ? 0 : DELIVERY_FEE;
  const toPay = afterDiscounts + deliveryFee;
  const youSave = discountOnMrp + couponDiscount + (isDeliveryFree ? DELIVERY_FEE : 0);

  function applyCoupon() {
    if (!couponInput.trim()) {
      setCouponError("Enter a coupon code");
      return;
    }
    const result = checkCoupon(couponInput);
    if ("error" in result) {
      setCouponError(result.error);
      return;
    }
    setAppliedCode(result.coupon.code);
    setCouponInput("");
    setCouponError("");
  }

  /*
    Picking a delivery address. For a new subscription, an address that already gets a running plan is
    not picked: the "same address" pop-up offers to extend that plan or to choose another address.
  */
  function pickAddress(addressId: string, addressDetails: AddressDetails) {
    const planAtThisAddress = cartSubscription
      ? runningPlans.find((plan) => plan.deliverTo.endsWith(` · ${formatAddressLine(addressDetails)}`))
      : undefined;
    if (planAtThisAddress) {
      setHasPickedAddress(false);
      setPlanAtPickedAddress(planAtThisAddress);
      return;
    }
    setChosenAddressId(addressId);
    setHasPickedAddress(true);
    setIsAddressPickerOpen(false);
  }

  // Add new address or Edit (same pop-up as My Addresses); the saved address becomes the picked one
  function saveAddress(addressDetails: AddressDetails, shouldBeDefault: boolean) {
    let savedAddressId: string;
    if (addressBeingEdited) {
      updateAddress(addressBeingEdited.id, addressDetails, shouldBeDefault);
      savedAddressId = addressBeingEdited.id;
    } else {
      savedAddressId = addAddress(addressDetails, shouldBeDefault);
    }
    setIsAddressFormOpen(false);
    setAddressBeingEdited(null);
    pickAddress(savedAddressId, addressDetails);
  }

  /*
    Back arrow: to the page the customer came from (e.g. the product page with "Checkout to Cart" or
    "Start subscription"); the home page when the cart was opened directly (nothing to go back to).
  */
  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  // "Select address" (or the address card) opens the address pop-up
  function openAddressPicker() {
    setIsAddressPickerOpen(true);
  }

  function openAddressForm(address: SavedAddress | null) {
    setAddressBeingEdited(address);
    setIsAddressFormOpen(true);
  }

  // Removing the picked address means the customer has to pick again
  function removeSavedAddress(addressId: string) {
    if (hasPickedAddress && addressId === chosenAddress?.id) {
      setHasPickedAddress(false);
      setChosenAddressId(null);
    }
    removeAddress(addressId);
  }

  /*
    The plan in the cart as one order: every bottle at the plan's price per litre, free delivery.
    With a running plan given, it extends that plan (same address) instead of starting a new one.
  */
  function placeSubscriptionOrder(deliverTo: string, planToExtend?: RunningPlan) {
    if (!cartSubscription) return;
    const subscriptionOrder = placeOrder(
      [
        {
          ...cartSubscription.product,
          price: cartSubscription.pricePerLitre,
          originalPrice: cartSubscription.product.price,
          quantity: cartSubscription.bottleCount,
        },
      ],
      {
        total: cartSubscription.planTotal - couponDiscount,
        couponCode: appliedCoupon?.coupon.code,
        couponDiscount: couponDiscount || undefined,
        deliveryFee: 0,
        deliverTo: planToExtend ? planToExtend.deliverTo : deliverTo,
        subscription: {
          planName: cartSubscription.planName,
          months: cartSubscription.months,
          days: cartSubscription.days,
          bottlesPerDay: cartSubscription.bottlesPerDay,
          pricePerLitre: cartSubscription.pricePerLitre,
          bottleCount: cartSubscription.bottleCount,
          extendsOrderId: planToExtend?.orderId,
        },
      },
    );
    if (appliedCoupon) {
      const deliverToName = (planToExtend ? planToExtend.deliverTo : deliverTo).split(" · ")[0];
      recordCouponUse(appliedCoupon.coupon.code, {
        customerName: deliverToName,
        area: chosenAddress?.area ?? "",
        orderNumber: `#${subscriptionOrder.orderId}`,
        discount: couponDiscount,
        orderValue: cartSubscription.planTotal,
      });
      setAppliedCode(null);
    }
    setCartSubscription(null);
    setPlanAtPickedAddress(null);
    setIsAddressPickerOpen(false);
    setHasPickedAddress(false);
    setPlacedOrder(subscriptionOrder);
    window.scrollTo({ top: 0 });
  }

  function placeTheOrder() {
    if (cartSubscription) {
      if (planBeingExtended) placeSubscriptionOrder(planBeingExtended.deliverTo, planBeingExtended);
      else if (chosenAddress) placeSubscriptionOrder(`${chosenAddress.name} · ${formatAddressLine(chosenAddress)}`);
      return;
    }
    if (!chosenAddress) return;
    const order = placeOrder(cartItems, {
      total: toPay,
      couponCode: appliedCoupon?.coupon.code,
      couponDiscount: couponDiscount || undefined,
      deliveryFee,
      deliverTo: `${chosenAddress.name} · ${formatAddressLine(chosenAddress)}`,
    });
    if (appliedCoupon) {
      recordCouponUse(appliedCoupon.coupon.code, {
        customerName: chosenAddress.name,
        area: chosenAddress.area,
        orderNumber: `#${order.orderId}`,
        discount: couponDiscount,
        orderValue: itemTotal,
      });
    }
    emptyTheCart();
    setHasPickedAddress(false);
    setPlacedOrder(order);
    window.scrollTo({ top: 0 });
  }

  // Tomorrow before 7 AM
  const deliveryLine = "Delivery tomorrow by 7 AM";

  /*
    Delivery address card (under the items): the default address until one is confirmed in the pop-up
    ("Select address" there); clicking it opens the pop-up. Extending a plan keeps that plan's address.
  */
  const deliveryAddressCard = (
    <section className={styles["checkout-card"]} aria-labelledby="delivery-address-heading">
      <div className={styles["checkout-card-heading-row"]}>
        <h2 id="delivery-address-heading" className={styles["checkout-card-heading"]}>
          Delivery address
        </h2>
        {planBeingExtended ? (
          <span className={styles["checkout-muted-note"]}>Same address as your plan</span>
        ) : hasPickedAddress ? (
          <span className={styles["delivery-address-status-confirmed"]}>Confirmed</span>
        ) : (
          <span className={styles["delivery-address-status-pending"]}>Not confirmed yet</span>
        )}
      </div>
      {planBeingExtended ? (
        <p className={styles["delivery-address-plan-line"]}>{planBeingExtended.deliverTo}</p>
      ) : chosenAddress ? (
        <div className={styles["delivery-address-row"]}>
          <button
            type="button"
            className={`${styles["delivery-address-box"]} ${hasPickedAddress ? styles["delivery-address-box-confirmed"] : ""}`}
            onClick={openAddressPicker}
          >
            <span className={styles["delivery-address-top-row"]}>
              <span className={styles["delivery-address-label"]}>{chosenAddress.label}</span>
              {chosenAddress.id === defaultAddressId && <span className={styles["address-pick-default-badge"]}>Default</span>}
              {hasPickedAddress && <span className={styles["delivery-address-change"]}>Change</span>}
            </span>
            <span className={styles["delivery-address-name"]}>{chosenAddress.name}</span>
            <span className={styles["delivery-address-line"]}>{formatAddressLine(chosenAddress)}</span>
            <span className={styles["delivery-address-line"]}>{chosenAddress.mobileNumber}</span>
          </button>
          {/* Add new address: straight to the address form; the saved address becomes the delivery address */}
          <button type="button" className={styles["checkout-address-add"]} onClick={() => openAddressForm(null)}>
            <span className={styles["checkout-address-add-circle"]} aria-hidden="true">
              +
            </span>
            Add new address
          </button>
        </div>
      ) : (
        <button type="button" className={styles["delivery-address-box"]} onClick={openAddressPicker}>
          <span className={styles["delivery-address-name"]}>+ Add a delivery address</span>
          <span className={styles["delivery-address-line"]}>We currently deliver only to selected locations in Bengaluru.</span>
        </button>
      )}
    </section>
  );

  // Empty cart (or not loaded yet): the original "My Cart" page
  // The plan the placed subscription order started or extended (its new last day, after an extension)
  const placedPlan = placedOrder?.subscription
    ? (runningPlans.find((plan) => plan.orderId === (placedOrder.subscription?.extendsOrderId ?? placedOrder.orderId)) ?? null)
    : null;

  // What Pay now charges: the plan's total for a subscription, otherwise the cart's
  const amountToPay = cartSubscription ? cartSubscription.planTotal - couponDiscount : toPay;

  if (!placedOrder && (!isCartLoaded || (cartItems.length === 0 && !cartSubscription))) {
    return (
      <div className={styles["cart-page"]}>
        {/* Navigation bar, placed exactly like on the landing page */}
        <SiteNavigationPlacement />

        <main className={styles["cart-page-content"]}>
          <div className={styles["cart-page-title-row"]}>
            <Link href="/" aria-label="Back to the home page" className={styles["cart-page-back-button"]}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
            </Link>
            <h1 className={styles["cart-page-title"]}>
              My Cart <span className={styles["cart-page-item-count"]}>(0)</span>
            </h1>
          </div>

          {isCartLoaded && (
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
        </main>

        {/* Below the empty cart: the landing page's Best Sellers, so shopping can start right here */}
        {isCartLoaded && <BestSellersSection />}
      </div>
    );
  }

  return (
    <div className={styles["checkout-page"]}>
      <header className={styles["checkout-top-bar"]}>
        <Link href="/" className={styles["checkout-logo"]} aria-label="Chiranvi Farm home">
          <Image src="/images/brand/chiranvi-farm-logo.webp" alt="Chiranvi Farm" width={516} height={240} priority />
        </Link>
        <CheckoutStepBar
          current={placedOrder ? "done" : planBeingExtended || hasPickedAddress ? "payment" : "address"}
        />
      </header>

      <main className={styles["checkout-content"]}>
        {placedOrder ? (
          /* ---------- Order placed ---------- */
          <section className={styles["order-placed-card"]} aria-labelledby="order-placed-heading">
            <span className={styles["order-placed-icon"]} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6 12.5l4 4 8-9" />
              </svg>
            </span>
            <h1 id="order-placed-heading" className={styles["order-placed-heading"]}>
              {placedOrder.subscription?.extendsOrderId
                ? "Your plan has been extended"
                : placedOrder.subscription
                  ? "Your subscription has started"
                  : "Your order has been placed"}
            </h1>
            <p className={styles["order-placed-text"]}>
              {placedOrder.subscription?.extendsOrderId
                ? `${placedOrder.subscription.planName} added (${placedOrder.subscription.bottleCount.toLocaleString("en-IN")} bottles)${
                    placedPlan ? ` · Your plan now runs until ${formatPlanDate(placedPlan.endsOn)}` : ""
                  }`
                : placedOrder.subscription
                  ? `${placedOrder.subscription.planName} · ${placedOrder.subscription.bottlesPerDay} × 1 L every morning · ${placedOrder.subscription.bottleCount.toLocaleString("en-IN")} bottles`
                  : "Thank you for shopping with Chiranvi Farm"}
            </p>
            <dl className={styles["order-placed-details"]}>
              <div>
                <dt>Order</dt>
                <dd>{placedOrder.orderId}</dd>
              </div>
              <div>
                <dt>Paid</dt>
                <dd>{rupees(placedOrder.total)}</dd>
              </div>
              <div>
                <dt>{placedOrder.subscription?.extendsOrderId ? "Plan runs until" : placedOrder.subscription ? "First delivery" : "Delivery"}</dt>
                <dd>{placedOrder.subscription?.extendsOrderId && placedPlan ? formatPlanDate(placedPlan.endsOn) : "Tomorrow by 7 AM"}</dd>
              </div>
            </dl>
            {placedOrder.deliverTo && <p className={styles["order-placed-address"]}>Delivering to {placedOrder.deliverTo}</p>}
            <div className={styles["order-placed-buttons"]}>
              {placedOrder.subscription ? (
                <Link href="/account/subscription" className={styles["checkout-primary-button"]}>
                  View my subscription
                </Link>
              ) : (
                <Link href="/account/orders" className={styles["checkout-primary-button"]}>
                  Track your order
                </Link>
              )}
              <Link href="/" className={styles["checkout-secondary-button"]}>
                Continue shopping
              </Link>
            </div>
          </section>
        ) : (
          /* ---------- Checkout ---------- */
          <>
            <div className={styles["checkout-title-row"]}>
              <button type="button" className={styles["checkout-back-button"]} aria-label="Go back" onClick={goBack}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
              </button>
              <h1 className={styles["checkout-title"]}>Cart</h1>
            </div>
            <p className={styles["checkout-subtitle"]}>
              {planBeingExtended
                ? `Extending your ${planBeingExtended.planName} plan (currently ends on ${formatPlanDate(planBeingExtended.endsOn)})`
                : cartSubscription
                ? `${cartSubscription.planName} subscription · First delivery tomorrow by 7 AM`
                : `${itemCount} ${itemCount === 1 ? "item" : "items"} · ${deliveryLine}`}
            </p>

            <div className={styles["checkout-columns"]}>
              {cartSubscription ? (
                /* Step 1 for a subscription: the plan */
                <div className={styles["checkout-left-column"]}>
                  <section className={styles["checkout-card"]} aria-labelledby="checkout-subscription-heading">
                    <div className={styles["checkout-card-heading-row"]}>
                      <h2 id="checkout-subscription-heading" className={styles["checkout-card-heading"]}>
                        {planBeingExtended ? "Extend your plan" : "Your subscription"}
                      </h2>
                      <button type="button" className={`${styles["checkout-text-button"]} ${styles["subscription-cart-remove-button"]}`} onClick={() => setCartSubscription(null)}>
                        Remove
                      </button>
                    </div>

                    <div className={styles["subscription-cart-item"]}>
                      <span className={styles["checkout-item-image-area"]}>
                        <Image
                          src={cartSubscription.product.imageSource}
                          alt={cartSubscription.product.name}
                          width={cartSubscription.product.imageWidth}
                          height={cartSubscription.product.imageHeight}
                          sizes="64px"
                          className={styles["checkout-item-image"]}
                        />
                      </span>
                      <div className={styles["checkout-item-details"]}>
                        <h3 className={styles["checkout-item-name"]}>
                          {cartSubscription.product.name}
                          {/* The plan (3 / 6 / 12 Months) as a green badge */}
                          <span className={styles["subscription-cart-plan-badge"]}>
                            {planBeingExtended ? `+ ${cartSubscription.planName}` : cartSubscription.planName}
                          </span>
                        </h3>
                        <p className={styles["checkout-item-pack"]}>
                          {cartSubscription.bottlesPerDay} × 1 L {cartSubscription.bottlesPerDay === 1 ? "bottle" : "bottles"} every morning ·{" "}
                          {cartSubscription.bottleCount.toLocaleString("en-IN")} bottles
                        </p>
                        <p className={styles["checkout-item-prices"]}>
                          <span className={styles["checkout-item-price"]}>{rupees(cartSubscription.pricePerLitre)} / litre</span>
                          {cartSubscription.product.price > cartSubscription.pricePerLitre && (
                            <s className={styles["checkout-item-old-price"]}>{rupees(cartSubscription.product.price)}</s>
                          )}
                        </p>
                      </div>
                      <p className={styles["subscription-cart-item-total"]}>
                        <span className={styles["checkout-item-total"]}>{rupees(cartSubscription.planTotal)}</span>
                        {cartSubscription.oneTimeTotal > cartSubscription.planTotal && (
                          <s className={styles["checkout-item-old-price"]}>{rupees(cartSubscription.oneTimeTotal)}</s>
                        )}
                      </p>
                    </div>

                    <p className={styles["checkout-fresh-note"]}>
                      <span className={styles["checkout-fresh-dot"]} aria-hidden="true" />
                      {planBeingExtended
                        ? `Same delivery address: ${planBeingExtended.deliverTo}`
                        : "Delivered every morning by 7 AM · Pause anytime · Free delivery"}
                    </p>

                  </section>
                  {deliveryAddressCard}
                </div>
              ) : (
                /* Step 1: the cart */
                <div className={styles["checkout-left-column"]}>
                  <section className={styles["checkout-card"]} aria-labelledby="checkout-items-heading">
                    <div className={styles["checkout-card-heading-row"]}>
                      <h2 id="checkout-items-heading" className={styles["checkout-card-heading"]}>
                        Your items <span className={styles["checkout-count-pill"]}>{cartItems.length}</span>
                      </h2>
                      <span className={styles["checkout-muted-note"]}>Prices include all taxes</span>
                    </div>

                    <ul className={styles["checkout-item-list"]}>
                      {cartItems.map((item) => (
                        <li key={item.productId} className={styles["checkout-item"]}>
                          <span className={styles["checkout-item-image-area"]}>
                            <Image src={item.imageSource} alt={item.name} width={item.imageWidth} height={item.imageHeight} sizes="64px" className={styles["checkout-item-image"]} />
                          </span>
                          <div className={styles["checkout-item-details"]}>
                            <h3 className={styles["checkout-item-name"]}>{item.name}</h3>
                            <p className={styles["checkout-item-pack"]}>{item.packSize}</p>
                            <p className={styles["checkout-item-prices"]}>
                              <span className={styles["checkout-item-price"]}>{rupees(item.price)}</span>
                              {item.originalPrice > item.price && <s className={styles["checkout-item-old-price"]}>{rupees(item.originalPrice)}</s>}
                            </p>
                          </div>
                          <div className={styles["checkout-quantity"]} role="group" aria-label={`${item.name} quantity`}>
                            <button type="button" aria-label={`Remove one ${item.name}`} className={styles["checkout-quantity-minus"]} onClick={() => changeCartItemQuantity(item.productId, -1)}>
                              −
                            </button>
                            <span className={styles["checkout-quantity-number"]} aria-live="polite">
                              {item.quantity}
                            </span>
                            <button type="button" aria-label={`Add one more ${item.name}`} className={styles["checkout-quantity-plus"]} onClick={() => changeCartItemQuantity(item.productId, 1)}>
                              +
                            </button>
                          </div>
                          <p className={styles["checkout-item-total"]}>{rupees(item.price * item.quantity)}</p>
                        </li>
                      ))}
                    </ul>

                    <p className={styles["checkout-fresh-note"]}>
                      <span className={styles["checkout-fresh-dot"]} aria-hidden="true" />
                      Milk and paneer are packed fresh on the morning of delivery.
                    </p>

                    {/* Milk bought one-time by mistake: switch to a plan on the milk page (Subscribe tab) */}
                    {milkInCart && (
                      <div className={styles["subscription-cart-switch-row"]}>
                        <p className={styles["subscription-cart-switch-text"]}>
                          <strong>Want this milk every morning?</strong> Switch to a subscription to save on every bottle, with free
                          delivery.
                        </p>
                        <Link
                          href={`/products/${MILK_PRODUCT_ID}`}
                          className={styles["subscription-cart-switch-button"]}
                          onClick={() => startSwitchToSubscription(MILK_PRODUCT_ID)}
                        >
                          Switch to subscription
                        </Link>
                      </div>
                    )}
                  </section>
                  {deliveryAddressCard}
                </div>
              )}

                            {/* Order summary */}
              <aside className={`${styles["checkout-card"]} ${styles["checkout-summary"]}`} aria-labelledby="checkout-summary-heading">
                <h2 id="checkout-summary-heading" className={styles["checkout-card-heading"]}>
                  Order summary
                </h2>

                {/* Coupon code (from the Chiranvi Panel's Coupons & offers): for both one-time orders and plans */}
                <form
                  className={styles["checkout-coupon-form"]}
                  onSubmit={(submitEvent) => {
                    submitEvent.preventDefault();
                    applyCoupon();
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 12V4h8l10 10-8 8L3 12Z" />
                    <path d="M7.5 7.5h.01" />
                  </svg>
                  <input
                    value={couponInput}
                    placeholder="Enter coupon code"
                    aria-label="Coupon code"
                    onChange={(changeEvent) => {
                      setCouponInput(changeEvent.target.value.toUpperCase());
                      setCouponError("");
                    }}
                  />
                  <button type="submit">Apply</button>
                </form>
                {appliedCoupon && (
                    <p className={styles["checkout-coupon-applied"]}>
                      <span className={styles["checkout-coupon-badge"]} aria-hidden="true">
                        %
                      </span>
                      <span className={styles["checkout-coupon-applied-text"]}>
                        <strong>{appliedCoupon.coupon.code}</strong> applied · {appliedCoupon.coupon.description}
                      </span>
                      <button type="button" className={styles["checkout-coupon-remove"]} onClick={() => setAppliedCode(null)}>
                        Remove
                      </button>
                    </p>
                )}
                {couponError && <p className={styles["checkout-coupon-error"]}>{couponError}</p>}
                {appliedCode && !appliedCoupon && couponCheck && "error" in couponCheck && (
                  <p className={styles["checkout-coupon-error"]}>{couponCheck.error}</p>
                )}

                {cartSubscription ? (
                  /* Subscription: the plan at the one-time price, the saving, the coupon, free delivery */
                  <dl className={styles["checkout-bill"]}>
                    <div>
                      <dt>
                        {cartSubscription.bottleCount.toLocaleString("en-IN")} bottles at {rupees(cartSubscription.product.price)}
                      </dt>
                      <dd>{rupees(cartSubscription.oneTimeTotal)}</dd>
                    </div>
                    {cartSubscription.oneTimeTotal > cartSubscription.planTotal && (
                      <div>
                        <dt>Subscription saving</dt>
                        <dd className={styles["checkout-bill-saving"]}>−{rupees(cartSubscription.oneTimeTotal - cartSubscription.planTotal)}</dd>
                      </div>
                    )}
                    {appliedCoupon && (
                      <div>
                        <dt>Coupon {appliedCoupon.coupon.code}</dt>
                        <dd className={styles["checkout-bill-saving"]}>−{rupees(couponDiscount)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Delivery fee</dt>
                      <dd>
                        <s className={styles["checkout-bill-struck"]}>{rupees(DELIVERY_FEE)}</s>{" "}
                        <span className={styles["checkout-bill-saving"]}>FREE</span>
                      </dd>
                    </div>
                  </dl>
                ) : (
                <>
                <dl className={styles["checkout-bill"]}>
                  <div>
                    <dt>Item total (MRP)</dt>
                    <dd>{rupees(itemTotalAtMrp)}</dd>
                  </div>
                  {discountOnMrp > 0 && (
                    <div>
                      <dt>Discount on MRP</dt>
                      <dd className={styles["checkout-bill-saving"]}>−{rupees(discountOnMrp)}</dd>
                    </div>
                  )}
                  {appliedCoupon && (
                    <div>
                      <dt>Coupon {appliedCoupon.coupon.code}</dt>
                      <dd className={styles["checkout-bill-saving"]}>−{rupees(couponDiscount)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Delivery fee</dt>
                    <dd>
                      {isDeliveryFree ? (
                        <>
                          <s className={styles["checkout-bill-struck"]}>{rupees(DELIVERY_FEE)}</s>{" "}
                          <span className={styles["checkout-bill-saving"]}>FREE</span>
                        </>
                      ) : (
                        rupees(DELIVERY_FEE)
                      )}
                    </dd>
                  </div>
                </dl>
                {!isDeliveryFree && (
                  <p className={styles["checkout-free-delivery-hint"]}>
                    Add {rupees(FREE_DELIVERY_FROM - afterDiscounts)} more for free delivery
                  </p>
                )}
                </>
                )}

                <p className={styles["checkout-to-pay"]}>
                  <span>To pay</span>
                  <span className={styles["checkout-to-pay-amount"]}>{rupees(amountToPay)}</span>
                </p>
                {cartSubscription
                  ? cartSubscription.oneTimeTotal - amountToPay > 0 && (
                      <p className={styles["checkout-you-save"]}>
                        You save {rupees(cartSubscription.oneTimeTotal - amountToPay)} on this plan
                      </p>
                    )
                  : youSave > 0 && <p className={styles["checkout-you-save"]}>You save {rupees(youSave)} on this order</p>}

                <div className={styles["checkout-place-row"]}>
                  <span className={styles["checkout-place-row-total"]}>
                    <span className={styles["checkout-place-row-amount"]}>{rupees(amountToPay)}</span>
                    <span className={styles["checkout-place-row-label"]}>To pay</span>
                  </span>
                  {planBeingExtended ? (
                    /* Extending a plan: same address, so straight to paying */
                    isLoggedIn ? (
                      <button type="button" className={styles["checkout-place-button"]} onClick={placeTheOrder}>
                        Pay now · {rupees(amountToPay)}
                      </button>
                    ) : (
                      <Link href="/login" className={styles["checkout-place-button"]} onClick={() => rememberPageAfterLogin("/cart")}>
                        Log in to pay
                      </Link>
                    )
                  ) : !hasPickedAddress || !chosenAddress ? (
                    <button type="button" className={styles["checkout-place-button"]} onClick={openAddressPicker}>
                      Select address
                    </button>
                  ) : isLoggedIn ? (
                    <button type="button" className={styles["checkout-place-button"]} onClick={placeTheOrder}>
                      Pay now · {rupees(amountToPay)}
                    </button>
                  ) : (
                    <Link href="/login" className={styles["checkout-place-button"]} onClick={() => rememberPageAfterLogin("/cart")}>
                      Log in to pay
                    </Link>
                  )}
                </div>
                <p className={styles["checkout-terms"]}>
                  {!hasPickedAddress && !planBeingExtended ? "Next: select the delivery address. " : ""}By placing this order you agree to our <Link href="/privacy-policy">Privacy policy</Link> and{" "}
                  <Link href="/refund">Refund policy</Link>
                </p>

                <ul className={styles["checkout-promises"]}>
                  <li>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path className={styles["checkout-promise-icon-filled"]} d="M6 11h12v9.5H6z" />
                      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
                    </svg>
                    Secure payment
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
                      <path d="M20 4v4h-4" />
                    </svg>
                    Easy refunds
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path className={styles["checkout-promise-icon-filled"]} d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" />
                      <path className={styles["checkout-promise-icon-vein"]} d="M5 19l7-7" />
                    </svg>
                    Freshness promise
                  </li>
                </ul>
              </aside>
            </div>
          </>
        )}
      </main>

      {/* Address pop-up: the My Addresses cards; picking one confirms it (closes, ticks Select address) */}
      {isAddressPickerOpen && (
        <CheckoutPopupFrame labelledBy="checkout-address-heading" isWide onClose={closeAddressPicker}>
          <div>
            <div className={styles["address-pick-heading-row"]}>
              <div>
                <h2 id="checkout-address-heading" className={styles["address-pick-heading"]}>
                  Select delivery address
                </h2>
                <p className={styles["address-pick-description"]}>We currently deliver only to selected locations in Bengaluru.</p>
              </div>
              <button type="button" className={styles["address-pick-add-button"]} onClick={() => openAddressForm(null)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add new address
              </button>
            </div>

            {addresses.length === 0 ? (
              <p className={styles["address-pick-empty-message"]}>No saved addresses yet. Add one to get deliveries.</p>
            ) : (
              <ul className={styles["address-pick-list"]} role="radiogroup" aria-label="Delivery address">
                {addresses.map((address) => {
                  const isPicked = hasPickedAddress && address.id === chosenAddress?.id;
                  const isDefault = address.id === defaultAddressId;
                  function pickThisAddress() {
                    pickAddress(address.id, address);
                  }
                  return (
                    <li
                      key={address.id}
                      role="radio"
                      aria-checked={isPicked}
                      aria-label={`Deliver to ${address.label}: ${address.name}, ${formatAddressLine(address)}`}
                      tabIndex={0}
                      className={`${styles["address-pick-card"]} ${isPicked ? styles["address-pick-card-picked"] : ""}`}
                      onClick={pickThisAddress}
                      onKeyDown={(event) => {
                        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          pickThisAddress();
                        }
                      }}
                    >
                      <div className={styles["address-pick-card-heading-row"]}>
                        <h3 className={styles["address-pick-label"]}>{address.label}</h3>
                        {isDefault ? (
                          <span className={styles["address-pick-default-badge"]}>Default</span>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Make ${address.label} the default address`}
                            className={styles["address-pick-switch-button"]}
                            onClick={(event) => {
                              event.stopPropagation();
                              setDefaultAddress(address.id);
                            }}
                          >
                            Set as Default
                          </button>
                        )}
                      </div>
                      <p className={styles["address-pick-name"]}>{address.name}</p>
                      <p className={styles["address-pick-line"]}>{formatAddressLine(address)}</p>
                      <p className={styles["address-pick-line"]}>{address.mobileNumber}</p>
                      <div className={styles["address-pick-actions"]}>
                        <button
                          type="button"
                          className={styles["address-pick-action-button"]}
                          onClick={(event) => {
                            event.stopPropagation();
                            openAddressForm(address);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${styles["address-pick-action-button"]} ${styles["address-pick-remove-button"]}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            removeSavedAddress(address.id);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CheckoutPopupFrame>
      )}

      {planAtPickedAddress && cartSubscription && (
        <SameAddressPlanDialog
          plan={planAtPickedAddress}
          newPlan={cartSubscription}
          amountToPay={amountToPay}
          isLoggedIn={isLoggedIn}
          onExtend={(plan) => placeSubscriptionOrder(plan.deliverTo, plan)}
          onClose={closeSameAddressDialog}
        />
      )}

      {isAddressFormOpen && (
        <AddressFormDialog
          addressToEdit={addressBeingEdited}
          isDefaultAtStart={addressBeingEdited ? addressBeingEdited.id === defaultAddressId : addresses.length === 0}
          onSave={saveAddress}
          onClose={closeAddressForm}
        />
      )}
    </div>
  );
}
