"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BestSellersSection from "@/components/landing/best-sellers/best-sellers-section";
import { addProductToCart } from "@/store/cart-store";
import { useOrders, type Order, type OrderStatus } from "@/store/orders-store";
import { AccountPageHeading } from "../account-dashboard-layout";
import styles from "./orders-page.module.css";

/*
  "My Orders" dashboard page.
  - No orders yet: the empty message and the Best Sellers row below it.
  - After ordering ("Pay now" on the cart page), the orders list (design): filter buttons
    (All / Active / Delivered / Cancelled) and one card per order: product pictures, the items,
    order number and date, the delivery line, the status on the right with "Need help?" (on its way)
    or the total and "Reorder" (delivered or cancelled), and the delivery steps
    Placed -> Packed -> Out for delivery -> Delivered.
  Reorder puts the same items back in the cart and opens the cart page.
*/

type OrderFilter = "all" | "active" | "delivered" | "cancelled";

const orderFilters: { id: OrderFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

const deliverySteps: { status: OrderStatus; label: string }[] = [
  { status: "placed", label: "Placed" },
  { status: "packed", label: "Packed" },
  { status: "out-for-delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
];

const statusLabels: Record<OrderStatus, string> = {
  placed: "Order placed",
  packed: "Packed",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function isActiveOrder(order: Order) {
  return order.status !== "delivered" && order.status !== "cancelled";
}

// 1781234567890 -> "12 Oct 2026"
function formatOrderDate(time: number) {
  return new Date(time).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// "A2 Desi Ghee, Fresh Cow Paneer × 2"
function describeOrderItems(order: Order) {
  return order.items
    .map((orderItem) => (orderItem.quantity > 1 ? `${orderItem.name} × ${orderItem.quantity}` : orderItem.name))
    .join(", ");
}

// Delivery steps: done dots and line in green; on the way, the line reaches halfway to the next step.
function DeliveryTracker({ status }: { status: OrderStatus }) {
  const currentStepIndex = deliverySteps.findIndex((step) => step.status === status);
  const lastStepIndex = deliverySteps.length - 1;
  const filledSteps = currentStepIndex === lastStepIndex ? currentStepIndex : currentStepIndex + 0.5;
  return (
    <ol className={styles["order-tracker"]} aria-label={`Delivery progress: ${statusLabels[status]}`}>
      <span className={styles["order-tracker-line"]} aria-hidden="true">
        <span
          className={styles["order-tracker-line-filled"]}
          style={{ width: `${(filledSteps / lastStepIndex) * 100}%` }}
        />
      </span>
      {deliverySteps.map((step, stepIndex) => (
        <li
          key={step.status}
          aria-current={stepIndex === currentStepIndex ? "step" : undefined}
          className={`${styles["order-tracker-step"]} ${
            stepIndex <= currentStepIndex ? styles["order-tracker-step-done"] : ""
          }`}
        >
          <span className={styles["order-tracker-dot"]} aria-hidden="true" />
          {step.label}
        </li>
      ))}
    </ol>
  );
}

export default function OrdersPage() {
  const orders = useOrders();
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<OrderFilter>("all");

  const shownOrders = orders.filter(
    (order) =>
      selectedFilter === "all" ||
      (selectedFilter === "active" ? isActiveOrder(order) : order.status === selectedFilter),
  );

  function reorder(order: Order) {
    for (const orderItem of order.items) {
      const { quantity, ...product } = orderItem;
      for (let packNumber = 0; packNumber < quantity; packNumber += 1) addProductToCart(product);
    }
    router.push("/cart");
  }

  if (orders.length === 0) {
    return (
      <>
        <AccountPageHeading title="My Orders" description="Track deliveries and reorder your favourites." />

        <section className={styles["orders-empty-card"]} aria-labelledby="orders-empty-heading">
          <span className={styles["orders-empty-icon-circle"]} aria-hidden="true">
            <svg viewBox="0 0 24 24" className={styles["orders-empty-icon"]}>
              <path d="M2.5 3.5h2.4l2.3 11h11l2-8H6.2" />
              <circle cx="9" cy="19" r="1.6" />
              <circle cx="16.5" cy="19" r="1.6" />
            </svg>
          </span>
          <h2 id="orders-empty-heading" className={styles["orders-empty-heading"]}>
            Your cart is empty
          </h2>
          <p className={styles["orders-empty-description"]}>Your farm-fresh favourites are waiting for you!</p>
        </section>

        <BestSellersSection placement="account-orders" />
      </>
    );
  }

  return (
    <>
      <AccountPageHeading
        title="My Orders"
        description="Track deliveries and reorder your favourites."
        action={
          <div className={styles["orders-filter-buttons"]} role="group" aria-label="Show orders">
            {orderFilters.map((orderFilter) => (
              <button
                key={orderFilter.id}
                type="button"
                aria-pressed={selectedFilter === orderFilter.id}
                className={`${styles["orders-filter-button"]} ${
                  selectedFilter === orderFilter.id ? styles["orders-filter-button-selected"] : ""
                }`}
                onClick={() => setSelectedFilter(orderFilter.id)}
              >
                {orderFilter.label}
              </button>
            ))}
          </div>
        }
      />

      {shownOrders.length === 0 ? (
        <p className={styles["orders-none-in-filter"]}>No orders here yet.</p>
      ) : (
        <ul className={styles["orders-list"]}>
          {shownOrders.map((order) => {
            const isActive = isActiveOrder(order);
            return (
              <li key={order.orderId} className={styles["order-card"]}>
                <div className={styles["order-summary-row"]}>
                  {/* Product pictures side by side (up to three) */}
                  <span className={styles["order-pictures"]}>
                    {order.items.slice(0, 3).map((orderItem) => (
                      <span key={orderItem.productId} className={styles["order-picture-box"]}>
                        <Image
                          src={orderItem.imageSource}
                          alt=""
                          width={orderItem.imageWidth}
                          height={orderItem.imageHeight}
                          sizes="80px"
                          className={styles["order-picture"]}
                        />
                      </span>
                    ))}
                  </span>

                  <div className={styles["order-details"]}>
                    <h2 className={styles["order-items"]}>{describeOrderItems(order)}</h2>
                    <p className={styles["order-number-and-date"]}>
                      Order {order.orderId} · {formatOrderDate(order.placedAt)}
                    </p>
                    {isActive ? (
                      <p className={styles["order-arrival"]}>Arriving tomorrow by 7:00 AM</p>
                    ) : (
                      <p className={styles["order-number-and-date"]}>
                        {order.status === "cancelled" ? "Refunded to wallet" : `Delivered ${formatOrderDate(order.placedAt)}`}
                      </p>
                    )}
                  </div>

                  <div className={styles["order-status-area"]}>
                    <p
                      className={`${styles["order-status"]} ${
                        order.status === "cancelled" ? styles["order-status-cancelled"] : ""
                      }`}
                    >
                      {statusLabels[order.status]}
                    </p>
                    {isActive ? (
                      <Link href="/account/help" className={styles["order-help-button"]}>
                        Need help?
                      </Link>
                    ) : (
                      <>
                        <p className={styles["order-total"]}>₹{order.total}</p>
                        <button type="button" className={styles["order-reorder-button"]} onClick={() => reorder(order)}>
                          Reorder
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {order.status !== "cancelled" && <DeliveryTracker status={order.status} />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
