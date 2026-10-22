"use client";

import { useMemo, useState } from "react";
import {
  PAYMENT_METHODS,
  recordPayment,
  refundPayment,
  retryPayment,
  useAdminPayments,
  type AdminPayment,
  type PaymentMethod,
  type PaymentType,
} from "@/store/admin-payments-store";
import { useAdminOrders } from "@/store/admin-orders-store";
import { AdminFeatureGate } from "./admin-panel-layout";
import {
  AdminDialog,
  AdminDialogField,
  AdminFilterTabs,
  AdminPageTop,
  AdminPagination,
  AdminRowMenu,
  AdminStatCards,
  adminInputClassName,
  downloadCsv,
  formatDateRange,
  toDateFileName,
  useAdminToast,
  useIsPanelOwner,
  OWNER_ONLY_MESSAGE,
} from "./admin-shared";
import dashboardStyles from "./admin-dashboard.module.css";
import sharedStyles from "./admin-shared.module.css";
import styles from "./admin-payments-page.module.css";

/*
  Payments (/admin/payments), from the design 07-payments-wallet, without the wallet (Chiranvi does
  not use one): money in for orders and subscription plans, refunds, and failed payments.
    top        search (customer, area or transaction), Record payment (pop-up form), Custom range, Export
    numbers    collected in the chosen dates, collected today, refunded, failed payments (red: money to
               recover)
    table      All / Success / Failed tabs; 14 a page; "..." retries a failed payment or refunds one
    this week  money in by kind (subscriptions, one-time orders), refunds, cash still to collect on
               orders not yet delivered (pending dues), failed payments; for the chosen dates
    methods    how the money came in (UPI, card, cash) as one bar and a list
  Payments come from store/admin-payments-store.ts (saved in this browser for now).
*/

const PAGE_SIZE = 14;

type PaymentTab = "all" | "success" | "failed";

const TYPE_CLASS_NAMES: Record<PaymentType, string> = {
  Order: styles["admin-payment-type-order"],
  Subscription: styles["admin-payment-type-subscription"],
  Refund: styles["admin-payment-type-refund"],
};

function formatPaidAt(paidAt: string) {
  const date = new Date(paidAt);
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${date
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    .toUpperCase()}`;
}

function rupees(amount: number) {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

// ₹1,93,700 -> ₹193.7k (the payment methods list)
function shortRupees(amount: number) {
  return amount >= 1000 ? `₹${(amount / 1000).toFixed(1)}k` : rupees(amount);
}

const EMPTY_NEW_PAYMENT = { customerName: "", area: "", type: "Order" as PaymentType, method: "Cash" as PaymentMethod, amount: "" };

export default function AdminPaymentsPage() {
  return (
    <AdminFeatureGate feature="payments">
      <PaymentsPage />
    </AdminFeatureGate>
  );
}

function PaymentsPage() {
  const payments = useAdminPayments();
  const orders = useAdminOrders();
  const [today] = useState(() => new Date());
  const [rangeFrom, setRangeFrom] = useState(() => new Date(today.getTime() - 6 * 86400000));
  const [rangeTo, setRangeTo] = useState(today);
  const [searchText, setSearchText] = useState("");
  const [tab, setTab] = useState<PaymentTab>("all");
  const [page, setPage] = useState(1);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [newPayment, setNewPayment] = useState(EMPTY_NEW_PAYMENT);
  const { showToast, toast } = useAdminToast();
  // Sensitive actions only the owner can do (Roles & permissions)
  const isOwner = useIsPanelOwner();

  const paymentsInRange = useMemo(() => {
    const from = new Date(rangeFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(rangeTo);
    to.setHours(23, 59, 59, 999);
    const words = searchText.trim().toLowerCase();
    return payments.filter((payment) => {
      const paidAt = new Date(payment.paidAt);
      if (paidAt < from || paidAt > to) return false;
      return !words || `${payment.customerName} ${payment.area} ${payment.id}`.toLowerCase().includes(words);
    });
  }, [payments, rangeFrom, rangeTo, searchText]);

  const shown = paymentsInRange.filter((payment) => tab === "all" || payment.status.toLowerCase() === tab);
  const pageItems = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const successful = paymentsInRange.filter((payment) => payment.status === "Success");
  const moneyIn = successful.filter((payment) => payment.amount > 0);
  const collected = moneyIn.reduce((sum, payment) => sum + payment.amount, 0);
  const todayKey = today.toDateString();
  const collectedToday = moneyIn
    .filter((payment) => new Date(payment.paidAt).toDateString() === todayKey)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const paymentsToday = moneyIn.filter((payment) => new Date(payment.paidAt).toDateString() === todayKey).length;
  const refunds = successful.filter((payment) => payment.amount < 0);
  const refunded = refunds.reduce((sum, payment) => sum - payment.amount, 0);
  const failed = paymentsInRange.filter((payment) => payment.status === "Failed");
  const toRecover = failed.reduce((sum, payment) => sum + Math.abs(payment.amount), 0);

  // This week card: money in by kind, and cash still to collect when orders are delivered
  const collectedFrom = (type: PaymentType) =>
    moneyIn.filter((payment) => payment.type === type).reduce((sum, payment) => sum + payment.amount, 0);
  const cashToCollect = orders.filter(
    (order) => order.payment === "Cash" && (order.status === "Pending" || order.status === "Out for delivery"),
  );
  const pendingDues = cashToCollect.reduce((sum, order) => sum + order.amount, 0);
  const isLastSevenDays =
    rangeTo.toDateString() === today.toDateString() && Math.round((rangeTo.getTime() - rangeFrom.getTime()) / 86400000) === 6;

  const byMethod = PAYMENT_METHODS.map((method) => ({
    method,
    total: moneyIn.filter((payment) => payment.method === method).reduce((sum, payment) => sum + payment.amount, 0),
  }));

  function exportPayments() {
    downloadCsv(`chiranvi-payments-${toDateFileName(rangeFrom)}-to-${toDateFileName(rangeTo)}.csv`, [
      ["Transaction", "Date", "Customer", "Area", "Type", "Method", "Amount (₹)", "Status"],
      ...shown.map((payment: AdminPayment) => [
        payment.id,
        formatPaidAt(payment.paidAt),
        payment.customerName,
        payment.area,
        payment.type,
        payment.method,
        payment.amount,
        payment.status,
      ]),
    ]);
  }

  function saveNewPayment() {
    const amount = Number(newPayment.amount);
    if (!newPayment.customerName.trim() || !(amount > 0)) {
      showToast("Enter the customer and the amount");
      return;
    }
    const added = recordPayment({
      customerName: newPayment.customerName.trim(),
      area: newPayment.area.trim() || "—",
      type: newPayment.type,
      method: newPayment.method,
      amount: newPayment.type === "Refund" ? -amount : amount,
    });
    setRangeTo(today);
    setIsRecordOpen(false);
    setNewPayment(EMPTY_NEW_PAYMENT);
    setTab("all");
    setPage(1);
    showToast(`${added.id} recorded for ${added.customerName}`);
  }

  return (
    <div className={dashboardStyles["admin-dashboard"]}>
      <AdminPageTop
        title="Payments"
        description="Money in, refunds and failed payments"
        searchText={searchText}
        onSearchTextChange={(text) => {
          setSearchText(text);
          setPage(1);
        }}
        searchPlaceholder="Search customer or transaction..."
        actionLabel="Record payment"
        onAction={() => setIsRecordOpen(true)}
        today={today}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onRangeChange={(from, to) => {
          setRangeFrom(from);
          setRangeTo(to);
          setPage(1);
        }}
        onExport={exportPayments}
      />

      <AdminStatCards
        stats={[
          {
            label: "Collected",
            value: rupees(collected),
            note: "↑ 10.8% vs last week",
            trend: "up",
            icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M9 7.5h6", "M9 10.5h6", "M11 7.5c2.6 0 2.6 4.5 0 4.5H9l4.5 4.5"],
          },
          {
            label: "Collected today",
            value: rupees(collectedToday),
            note: `${paymentsToday} payments`,
            trend: "plain",
            icon: ["M4 16l5-5 4 4 7-7", "M15 8h5v5"],
          },
          {
            label: "Refunded",
            value: rupees(refunded),
            note: `${refunds.length} refunds`,
            trend: "plain",
            icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M16 12H8.5", "M11.5 9l-3 3 3 3"],
          },
          {
            label: "Failed payments",
            value: String(failed.length),
            note: `${rupees(toRecover)} to recover`,
            trend: failed.length ? "bad" : "plain",
            icon: ["M12 4l9 16H3L12 4Z", "M12 10v4", "M12 17h.01"],
          },
        ]}
      />

      <div className={styles["admin-payments-columns"]}>
        <section className={dashboardStyles["admin-card"]} aria-labelledby="admin-payments-heading">
          <div className={dashboardStyles["admin-card-heading-row"]}>
            <div>
              <h2 id="admin-payments-heading" className={dashboardStyles["admin-card-title"]}>
                Transactions
              </h2>
              <p className={dashboardStyles["admin-card-subtitle"]}>Orders, subscription plans and refunds</p>
            </div>
            <AdminFilterTabs
              label="Show payments"
              selected={tab}
              onSelect={(newTab) => {
                setTab(newTab);
                setPage(1);
              }}
              tabs={[
                { key: "all", label: "All" },
                { key: "success", label: "Success" },
                { key: "failed", label: `Failed ${failed.length}` },
              ]}
            />
          </div>

          <div className={dashboardStyles["admin-table-scroll"]}>
            <table className={dashboardStyles["admin-orders-table"]}>
              <thead>
                <tr>
                  <th scope="col">Transaction</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Type</th>
                  <th scope="col">Method</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className={dashboardStyles["admin-visually-hidden"]}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <span className={dashboardStyles["admin-orders-customer"]}>{payment.id}</span>
                      <span className={dashboardStyles["admin-orders-area"]}>{formatPaidAt(payment.paidAt)}</span>
                    </td>
                    <td>
                      <span className={dashboardStyles["admin-orders-customer"]}>{payment.customerName}</span>
                      <span className={dashboardStyles["admin-orders-area"]}>{payment.area}</span>
                    </td>
                    <td>
                      <span className={`${styles["admin-payment-type"]} ${TYPE_CLASS_NAMES[payment.type]}`}>{payment.type}</span>
                    </td>
                    <td>{payment.method}</td>
                    <td
                      className={`${dashboardStyles["admin-orders-amount"]} ${
                        payment.amount < 0 ? styles["admin-payment-amount-out"] : sharedStyles["admin-money-ok"]
                      }`}
                    >
                      {payment.amount < 0 ? "−" : "+"}
                      {rupees(Math.abs(payment.amount))}
                    </td>
                    <td>
                      <span
                        className={`${dashboardStyles["admin-status"]} ${
                          payment.status === "Failed" ? sharedStyles["admin-status-warning"] : dashboardStyles["admin-status-delivered"]
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className={dashboardStyles["admin-orders-actions"]}>
                      <AdminRowMenu
                        label={`Actions for ${payment.id}`}
                        title="Payment"
                        options={
                          payment.status === "Failed"
                            ? [
                                {
                                  label: "Retry payment",
                                  onSelect: () => {
                                    retryPayment(payment.id);
                                    showToast(`${payment.id} collected`);
                                  },
                                },
                              ]
                            : [
                                {
                                  label: "Refund",
                                  isDisabled: payment.type === "Refund",
                                  isDanger: true,
                                  onSelect: () => {
                                    if (!isOwner && Math.abs(payment.amount) > 500) {
                                      showToast(OWNER_ONLY_MESSAGE);
                                      return;
                                    }
                                    refundPayment(payment.id);
                                    showToast(`${rupees(Math.abs(payment.amount))} refunded to ${payment.customerName}`);
                                  },
                                },
                              ]
                        }
                      />
                    </td>
                  </tr>
                ))}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className={dashboardStyles["admin-orders-empty"]}>
                      No payments match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination page={page} pageSize={PAGE_SIZE} total={shown.length} onPageChange={setPage} itemName="payments" />
        </section>

        <div className={styles["admin-payments-side"]}>
        <section className={dashboardStyles["admin-card"]} aria-labelledby="admin-week-heading">
          <div className={styles["admin-week-heading-row"]}>
            <h2 id="admin-week-heading" className={dashboardStyles["admin-card-title"]}>
              {isLastSevenDays ? "This week" : "These dates"}
            </h2>
            <span className={styles["admin-week-dates"]}>{formatDateRange(rangeFrom, rangeTo)}</span>
          </div>
          <dl className={styles["admin-week-list"]}>
            <div className={styles["admin-week-total"]}>
              <dt>Total collected</dt>
              <dd>{rupees(collected)}</dd>
            </div>
            <div>
              <dt>Subscriptions</dt>
              <dd>{rupees(collectedFrom("Subscription"))}</dd>
            </div>
            <div>
              <dt>One-time orders</dt>
              <dd>{rupees(collectedFrom("Order"))}</dd>
            </div>
            <div>
              <dt>Refunds</dt>
              <dd className={styles["admin-week-refunds"]}>−{rupees(refunded)}</dd>
            </div>
            <div>
              <dt title="Cash orders not delivered yet: collected at the door">
                Pending dues
                <span className={styles["admin-week-hint"]}>
                  {cashToCollect.length} cash {cashToCollect.length === 1 ? "order" : "orders"} to collect
                </span>
              </dt>
              <dd className={styles["admin-week-dues"]}>{rupees(pendingDues)}</dd>
            </div>
            <div>
              <dt>Failed payments</dt>
              <dd className={styles["admin-week-failed"]}>
                {failed.length} · {rupees(toRecover)}
              </dd>
            </div>
          </dl>
        </section>

        <section className={dashboardStyles["admin-card"]} aria-labelledby="admin-methods-heading">
          <h2 id="admin-methods-heading" className={dashboardStyles["admin-card-title"]}>
            Payment methods
          </h2>
          <p className={dashboardStyles["admin-card-subtitle"]}>Share of money collected in these dates</p>
          <div className={styles["admin-methods-bar"]} aria-hidden="true">
            {byMethod.map(({ method, total }) =>
              total > 0 ? (
                <span
                  key={method}
                  className={styles[`admin-method-${method.toLowerCase()}`]}
                  style={{ flexGrow: total }}
                />
              ) : null,
            )}
          </div>
          <ul className={styles["admin-methods-list"]}>
            {byMethod.map(({ method, total }) => (
              <li key={method}>
                <span className={styles["admin-methods-name"]}>
                  <span className={`${styles["admin-methods-swatch"]} ${styles[`admin-method-${method.toLowerCase()}`]}`} />
                  {method}
                </span>
                <span className={styles["admin-methods-value"]}>
                  {collected ? Math.round((total / collected) * 100) : 0}% · {shortRupees(total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        </div>
      </div>

      {isRecordOpen && (
        <AdminDialog title="Record payment" submitLabel="Record" onClose={() => setIsRecordOpen(false)} onSubmit={saveNewPayment}>
          <AdminDialogField label="Customer name">
            <input
              className={adminInputClassName}
              value={newPayment.customerName}
              onChange={(changeEvent) => setNewPayment({ ...newPayment, customerName: changeEvent.target.value })}
              autoFocus
            />
          </AdminDialogField>
          <AdminDialogField label="Area">
            <input
              className={adminInputClassName}
              value={newPayment.area}
              onChange={(changeEvent) => setNewPayment({ ...newPayment, area: changeEvent.target.value })}
            />
          </AdminDialogField>
          <AdminDialogField label="For">
            <select
              className={adminInputClassName}
              value={newPayment.type}
              onChange={(changeEvent) => setNewPayment({ ...newPayment, type: changeEvent.target.value as PaymentType })}
            >
              <option>Order</option>
              <option>Subscription</option>
              <option>Refund</option>
            </select>
          </AdminDialogField>
          <AdminDialogField label="Method">
            <select
              className={adminInputClassName}
              value={newPayment.method}
              onChange={(changeEvent) => setNewPayment({ ...newPayment, method: changeEvent.target.value as PaymentMethod })}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </AdminDialogField>
          <AdminDialogField label="Amount (₹)" isWide>
            <input
              className={adminInputClassName}
              inputMode="numeric"
              value={newPayment.amount}
              onChange={(changeEvent) => setNewPayment({ ...newPayment, amount: changeEvent.target.value.replace(/\D/g, "") })}
            />
          </AdminDialogField>
        </AdminDialog>
      )}

      {toast}
    </div>
  );
}
