"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AddressFormDialog from "@/components/account/address/address-form-dialog";
import { addAddress, formatAddressLine, useAddressBook, type AddressDetails } from "@/store/address-store";
import { changeCartItemQuantity, countCartPacks, emptyTheCart, type CartItem } from "@/store/cart-store";
import { placeOrder } from "@/store/orders-store";
import styles from "./cart-checkout.module.css";

/*
  Checkout on the cart page, opened with "Pay now" (reference screenshots: Confirm details, Payments).
  Three steps with a step bar at the top:
    1. Address         - choose a saved address (the default is chosen first) or add a new one
                         (same pop-up as My Addresses); "Deliver here".
    2. Confirm details - "Delivering to" (Change goes back to step 1), the items with "- quantity +",
                         the delivery day and the saving; "Continue".
    3. Payment         - total amount and the ways to pay (Cash on Delivery open first, UPI, Card);
                         each has its own button that places the order.
  Then, on the same page, a card: "Your order has been placed", the thank-you line and "Track your order"
  (opens My Orders). Payments are not connected yet, so every way to pay places the order straight away
  and nothing is charged. The back arrow goes one step back (from step 1, back to the cart).
*/

type CheckoutStep = "address" | "confirm" | "payment" | "placed";
type PaymentMethod = "cash-on-delivery" | "upi" | "card";

const checkoutSteps: { step: Exclude<CheckoutStep, "placed">; label: string; title: string }[] = [
  { step: "address", label: "Address", title: "Choose delivery address" },
  { step: "confirm", label: "Confirm details", title: "Confirm details" },
  { step: "payment", label: "Payment", title: "Payment" },
];

const paymentMethods: { method: PaymentMethod; title: string; description: string; iconPaths: string[] }[] = [
  {
    method: "cash-on-delivery",
    title: "Cash on Delivery",
    description: "Pay in cash or by UPI to our delivery partner when your order arrives.",
    iconPaths: ["M3 7h18v10H3z", "M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0", "M6 10v4M18 10v4"],
  },
  {
    method: "upi",
    title: "UPI",
    description: "Pay by any UPI app.",
    iconPaths: ["M4 6h16v12H4z", "M8 10l2 4 2-4M14 10h2a1.5 1.5 0 0 1 0 3h-2v-3"],
  },
  {
    method: "card",
    title: "Credit / Debit / ATM Card",
    description: "Visa, Mastercard and RuPay cards.",
    iconPaths: ["M3 6h18v12H3z", "M3 10h18", "M7 15h4"],
  },
];

// Tomorrow, e.g. "Wed, 14 Oct" (orders arrive the next morning).
function getDeliveryDay() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function CartCheckout({ cartItems, onBackToCart }: { cartItems: CartItem[]; onBackToCart: () => void }) {
  const { addresses, defaultAddressId } = useAddressBook();
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("address");
  const [chosenAddressId, setChosenAddressId] = useState(defaultAddressId);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [openPaymentMethod, setOpenPaymentMethod] = useState<PaymentMethod>("cash-on-delivery");
  const closeAddressForm = useCallback(() => setIsAddressFormOpen(false), []);

  const chosenAddress = addresses.find((address) => address.id === chosenAddressId) ?? addresses[0];
  const itemCount = countCartPacks(cartItems);
  const total = cartItems.reduce((sum, cartItem) => sum + cartItem.price * cartItem.quantity, 0);
  const totalBeforeDiscount = cartItems.reduce((sum, cartItem) => sum + cartItem.originalPrice * cartItem.quantity, 0);
  const currentStepIndex = checkoutSteps.findIndex((checkoutStepInfo) => checkoutStepInfo.step === checkoutStep);

  function goBack() {
    if (checkoutStep === "address") onBackToCart();
    else if (checkoutStep === "confirm") setCheckoutStep("address");
    else if (checkoutStep === "payment") setCheckoutStep("confirm");
  }

  // Confirm step: "-" on the last pack of the last item empties the cart, so go back to the cart page.
  function changeQuantity(productId: string, quantityChange: 1 | -1) {
    const isLastPackInCart = itemCount === 1 && quantityChange === -1;
    changeCartItemQuantity(productId, quantityChange);
    if (isLastPackInCart) onBackToCart();
  }

  function saveNewAddress(addressDetails: AddressDetails, shouldBeDefault: boolean) {
    setChosenAddressId(addAddress(addressDetails, shouldBeDefault));
    setIsAddressFormOpen(false);
  }

  function placeTheOrder() {
    placeOrder(cartItems);
    emptyTheCart();
    setCheckoutStep("placed");
  }

  // After paying: the order placed card (no step bar, no back arrow).
  if (checkoutStep === "placed") {
    return (
      <section className={styles["order-placed-card"]} aria-labelledby="order-placed-heading">
        <span className={styles["order-placed-icon-circle"]} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M6 12.5l4 4 8-9" />
          </svg>
        </span>
        <h2 id="order-placed-heading" className={styles["order-placed-heading"]}>
          Your order has been placed
        </h2>
        <p className={styles["order-placed-description"]}>Thank you for shopping with Chiranvi Farm</p>
        <Link href="/account/orders" className={styles["order-placed-track-button"]}>
          Track your order
        </Link>
      </section>
    );
  }

  return (
    <>
      {/* Back arrow and the step title */}
      <div className={styles["checkout-title-row"]}>
        <button type="button" aria-label="Back" className={styles["checkout-back-button"]} onClick={goBack}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 className={styles["checkout-title"]}>{checkoutSteps[currentStepIndex].title}</h1>
        {checkoutStep === "payment" && (
          <span className={styles["checkout-secure-badge"]}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 11V8a5 5 0 0 1 10 0v3" />
              <path d="M5 11h14v10H5z" />
            </svg>
            100% Secure
          </span>
        )}
      </div>

      {/* Step bar: Address -> Confirm details -> Payment */}
      <ol className={styles["checkout-step-bar"]}>
        {checkoutSteps.map((checkoutStepInfo, stepIndex) => {
          const stepState = stepIndex < currentStepIndex ? "done" : stepIndex === currentStepIndex ? "current" : "next";
          return (
            <li
              key={checkoutStepInfo.step}
              aria-current={stepState === "current" ? "step" : undefined}
              className={`${styles["checkout-step"]} ${styles[`checkout-step-${stepState}`]}`}
            >
              <span className={styles["checkout-step-circle"]} aria-hidden="true">
                {stepState === "done" ? (
                  <svg viewBox="0 0 24 24">
                    <path d="M6 12.5l4 4 8-9" />
                  </svg>
                ) : (
                  stepIndex + 1
                )}
              </span>
              <span className={styles["checkout-step-label"]}>{checkoutStepInfo.label}</span>
            </li>
          );
        })}
      </ol>

      {/* Step 1: choose the address */}
      {checkoutStep === "address" && (
        <section className={styles["checkout-card"]} aria-labelledby="checkout-address-heading">
          <div className={styles["checkout-card-heading-row"]}>
            <h2 id="checkout-address-heading" className={styles["checkout-card-heading"]}>
              Deliver to
            </h2>
            <button
              type="button"
              className={styles["checkout-add-address-button"]}
              onClick={() => setIsAddressFormOpen(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add new address
            </button>
          </div>

          {addresses.length === 0 ? (
            <p className={styles["checkout-no-address"]}>No saved addresses yet. Add one to continue.</p>
          ) : (
            <ul className={styles["checkout-address-list"]} role="radiogroup" aria-label="Delivery address">
              {addresses.map((address) => {
                const isChosen = address.id === chosenAddress?.id;
                return (
                  <li key={address.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isChosen}
                      className={`${styles["checkout-address-option"]} ${
                        isChosen ? styles["checkout-address-option-chosen"] : ""
                      }`}
                      onClick={() => setChosenAddressId(address.id)}
                    >
                      <span className={styles["checkout-radio"]} aria-hidden="true" />
                      <span className={styles["checkout-address-text"]}>
                        <span className={styles["checkout-address-label-row"]}>
                          <span className={styles["checkout-address-label"]}>{address.label}</span>
                          {address.id === defaultAddressId && (
                            <span className={styles["checkout-default-badge"]}>Default</span>
                          )}
                        </span>
                        <span className={styles["checkout-address-name"]}>{address.name}</span>
                        <span className={styles["checkout-address-line"]}>{formatAddressLine(address)}</span>
                        <span className={styles["checkout-address-line"]}>{address.mobileNumber}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Step 2: confirm the address, items, delivery day and saving */}
      {checkoutStep === "confirm" && chosenAddress && (
        <section className={styles["checkout-card"]} aria-labelledby="checkout-confirm-heading">
          <h2 id="checkout-confirm-heading" className={styles["checkout-card-heading"]}>
            Delivering to
          </h2>
          <div className={styles["checkout-delivering-to"]}>
            <div className={styles["checkout-delivering-to-heading-row"]}>
              <p className={styles["checkout-delivering-to-name"]}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
                  <path d="M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                </svg>
                {chosenAddress.name}
                <span className={styles["checkout-address-label-inline"]}>{chosenAddress.label}</span>
              </p>
              <button
                type="button"
                className={styles["checkout-change-button"]}
                onClick={() => setCheckoutStep("address")}
              >
                Change
              </button>
            </div>
            <p className={styles["checkout-address-line"]}>{formatAddressLine(chosenAddress)}</p>
            <p className={styles["checkout-address-line"]}>{chosenAddress.mobileNumber}</p>
          </div>

          <ul className={styles["checkout-item-list"]}>
            {cartItems.map((cartItem) => (
              <li key={cartItem.productId} className={styles["checkout-item"]}>
                <span className={styles["checkout-item-image-area"]}>
                  <Image
                    src={cartItem.imageSource}
                    alt={cartItem.name}
                    width={cartItem.imageWidth}
                    height={cartItem.imageHeight}
                    sizes="80px"
                    className={styles["checkout-item-image"]}
                  />
                </span>
                <div className={styles["checkout-item-details"]}>
                  <h3 className={styles["checkout-item-name"]}>{cartItem.name}</h3>
                  <p className={styles["checkout-item-pack-size"]}>{cartItem.packSize}</p>
                  <p className={styles["checkout-item-price-row"]}>
                    <s className={styles["checkout-item-original-price"]}>₹{cartItem.originalPrice}</s>
                    <span className={styles["checkout-item-price"]}>₹{cartItem.price}</span>
                  </p>
                </div>
                <div
                  className={styles["checkout-quantity-control"]}
                  role="group"
                  aria-label={`${cartItem.name} quantity`}
                >
                  <button
                    type="button"
                    aria-label={`Remove one ${cartItem.name}`}
                    className={styles["checkout-quantity-button"]}
                    onClick={() => changeQuantity(cartItem.productId, -1)}
                  >
                    −
                  </button>
                  <span className={styles["checkout-quantity"]} aria-live="polite">
                    {cartItem.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Add one more ${cartItem.name}`}
                    className={styles["checkout-quantity-button"]}
                    onClick={() => changeQuantity(cartItem.productId, 1)}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className={styles["checkout-info-row"]}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 7h11v9H3z" />
              <path d="M14 10h4l3 3v3h-7" />
              <path d="M7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01" />
            </svg>
            <span>
              Delivery by <strong>{getDeliveryDay()}</strong>, before 7:00 AM
            </span>
          </p>

          {totalBeforeDiscount > total && (
            <p className={styles["checkout-saving"]}>
              You&apos;ll save <strong>₹{totalBeforeDiscount - total}</strong> on this order
            </p>
          )}
        </section>
      )}

      {/* Step 3: pay */}
      {checkoutStep === "payment" && (
        <section className={styles["checkout-payment"]} aria-label="Payment">
          <p className={styles["checkout-total-amount"]}>
            Total Amount
            <span className={styles["checkout-total-amount-value"]}>₹{total}</span>
          </p>

          <ul className={styles["checkout-payment-list"]}>
            {paymentMethods.map((paymentMethod) => {
              const isOpen = openPaymentMethod === paymentMethod.method;
              return (
                <li
                  key={paymentMethod.method}
                  className={`${styles["checkout-payment-option"]} ${isOpen ? styles["checkout-payment-option-open"] : ""}`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    className={styles["checkout-payment-option-button"]}
                    onClick={() => setOpenPaymentMethod(paymentMethod.method)}
                  >
                    <span className={styles["checkout-payment-icon"]} aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        {paymentMethod.iconPaths.map((iconPath) => (
                          <path key={iconPath} d={iconPath} />
                        ))}
                      </svg>
                    </span>
                    <span className={styles["checkout-payment-title"]}>{paymentMethod.title}</span>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className={`${styles["checkout-payment-arrow"]} ${isOpen ? styles["checkout-payment-arrow-open"] : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className={styles["checkout-payment-details"]}>
                      <p className={styles["checkout-payment-description"]}>{paymentMethod.description}</p>
                      <button type="button" className={styles["checkout-primary-button"]} onClick={placeTheOrder}>
                        {paymentMethod.method === "cash-on-delivery" ? "Place Order" : `Pay ₹${total}`}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Bottom bar for steps 1 and 2: total and the next-step button */}
      {checkoutStep !== "payment" && (
        <div className={styles["checkout-bottom-bar"]}>
          <p className={styles["checkout-bottom-total"]}>
            {totalBeforeDiscount > total && (
              <s className={styles["checkout-bottom-original-total"]}>₹{totalBeforeDiscount}</s>
            )}
            <span className={styles["checkout-bottom-total-amount"]}>₹{total}</span>
            <span className={styles["checkout-bottom-total-label"]}>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </p>
          <button
            type="button"
            disabled={checkoutStep === "address" && !chosenAddress}
            className={styles["checkout-primary-button"]}
            onClick={() => setCheckoutStep(checkoutStep === "address" ? "confirm" : "payment")}
          >
            {checkoutStep === "address" ? "Deliver here" : "Continue"}
          </button>
        </div>
      )}

      {isAddressFormOpen && (
        <AddressFormDialog
          addressToEdit={null}
          isDefaultAtStart={addresses.length === 0}
          onSave={saveNewAddress}
          onClose={closeAddressForm}
        />
      )}
    </>
  );
}
