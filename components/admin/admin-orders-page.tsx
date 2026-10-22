"use client";

import { useMemo, useState } from "react";
import {
  ADMIN_ORDER_STATUSES,
  addAdminOrder,
  changeAdminOrderStatus,
  useAdminOrders,
  type AdminOrder,
  type AdminOrderStatus,
} from "@/store/admin-orders-store";
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
} from "./admin-shared";
import dashboardStyles from "./admin-dashboard.module.css";
import sharedStyles from "./admin-shared.module.css";

/*
  Orders (/admin/orders), from the design 02-orders: every order across subscriptions and one-time
  purchases.
    top        search (customer, area or order number), New order (pop-up form), Custom range, Export
    numbers    total, delivered, pending (with out for delivery), cancelled, for the chosen dates
    table      All / Delivered / Pending / Cancelled tabs; 14 orders a page; "..." changes the status
  Orders come from store/admin-orders-store.ts (saved in this browser until the database is connected).
*/

const PAGE_SIZE = 14;

const STATUS_CLASS_NAMES: Record<AdminOrderStatus, string> = {
  Delivered: dashboardStyles["admin-status-delivered"],
  "Out for delivery": dashboardStyles["admin-status-out-for-delivery"],
  Pending: dashboardStyles["admin-status-pending"],
  Cancelled: sharedStyles["admin-status-cancelled"],
};

type StatusTab = "all" | "delivered" | "pending" | "cancelled";

function isInTab(order: AdminOrder, tab: StatusTab) {
  if (tab === "all") return true;
  if (tab === "delivered") return order.status === "Delivered";
  if (tab === "cancelled") return order.status === "Cancelled";
  return order.status === "Pending" || order.status === "Out for delivery";
}

function formatOrderDate(placedAt: string) {
  const date = new Date(placedAt);
  const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} · ${time}`;
}

const EMPTY_NEW_ORDER = { customerName: "", area: "", items: "", amount: "", payment: "UPI", slot: "6–7 AM" };

export default function AdminOrdersPage() {
  return (
    <AdminFeatureGate feature="orders">
      <OrdersPage />
    </AdminFeatureGate>
  );
}

function OrdersPage() {
  const orders = useAdminOrders();
  const [today] = useState(() => new Date());
  const [rangeFrom, setRangeFrom] = useState(() => new Date(today.getTime() - 6 * 86400000));
  const [rangeTo, setRangeTo] = useState(today);
  const [searchText, setSearchText] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [page, setPage] = useState(1);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrder, setNewOrder] = useState(EMPTY_NEW_ORDER);
  const { showToast, toast } = useAdminToast();

  // Orders in the chosen dates that match the search (the numbers and tabs count these)
  const ordersInRange = useMemo(() => {
    const from = new Date(rangeFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(rangeTo);
    to.setHours(23, 59, 59, 999);
    const words = searchText.trim().toLowerCase();
    return orders.filter((order) => {
      const placedAt = new Date(order.placedAt);
      if (placedAt < from || placedAt > to) return false;
      return !words || `${order.customerName} ${order.area} ${order.orderNumber}`.toLowerCase().includes(words);
    });
  }, [orders, rangeFrom, rangeTo, searchText]);

  const counts = {
    all: ordersInRange.length,
    delivered: ordersInRange.filter((order) => isInTab(order, "delivered")).length,
    pending: ordersInRange.filter((order) => isInTab(order, "pending")).length,
    outForDelivery: ordersInRange.filter((order) => order.status === "Out for delivery").length,
    cancelled: ordersInRange.filter((order) => isInTab(order, "cancelled")).length,
  };
  const shownOrders = ordersInRange.filter((order) => isInTab(order, statusTab));
  const pageOrders = shownOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const deliveredShare = counts.all ? ((counts.delivered / counts.all) * 100).toFixed(1) : "0";

  function exportOrders() {
    downloadCsv(`chiranvi-orders-${toDateFileName(rangeFrom)}-to-${toDateFileName(rangeTo)}.csv`, [
      ["Order", "Date", "Customer", "Area", "Items", "Amount (₹)", "Payment", "Slot", "Status"],
      ...shownOrders.map((order) => [
        order.orderNumber,
        formatOrderDate(order.placedAt),
        order.customerName,
        order.area,
        order.items,
        order.amount,
        order.payment,
        order.slot,
        order.status,
      ]),
    ]);
  }

  function saveNewOrder() {
    const amount = Number(newOrder.amount);
    if (!newOrder.customerName.trim() || !newOrder.items.trim() || !(amount > 0)) {
      showToast("Fill in the customer, items and amount");
      return;
    }
    const added = addAdminOrder({
      customerName: newOrder.customerName.trim(),
      area: newOrder.area.trim() || "—",
      items: newOrder.items.trim(),
      amount,
      payment: newOrder.payment as AdminOrder["payment"],
      slot: newOrder.slot,
    });
    setIsNewOrderOpen(false);
    setNewOrder(EMPTY_NEW_ORDER);
    setRangeTo(today);
    setStatusTab("all");
    setPage(1);
    showToast(`${added.orderNumber} added for ${added.customerName}`);
  }

  return (
    <div className={dashboardStyles["admin-dashboard"]}>
      <AdminPageTop
        title="Orders"
        description="Every order across subscriptions and one-time purchases"
        searchText={searchText}
        onSearchTextChange={(text) => {
          setSearchText(text);
          setPage(1);
        }}
        searchPlaceholder="Search customer, area or order..."
        actionLabel="New order"
        onAction={() => setIsNewOrderOpen(true)}
        today={today}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onRangeChange={(from, to) => {
          setRangeFrom(from);
          setRangeTo(to);
          setPage(1);
        }}
        onExport={exportOrders}
      />

      <AdminStatCards
        stats={[
          {
            label: "Total orders",
            value: counts.all.toLocaleString("en-IN"),
            note: "↑ 9.1% vs last week",
            trend: "up",
            icon: ["M9 3.5h6v3H9z", "M7 5H5.5v15.5h13V5H17", "M8.5 11.5h7", "M8.5 15.5h5"],
          },
          {
            label: "Delivered",
            value: counts.delivered.toLocaleString("en-IN"),
            note: `${deliveredShare}% of all orders`,
            trend: "plain",
            icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M8.5 12.2l2.4 2.4 4.8-4.8"],
          },
          {
            label: "Pending",
            value: counts.pending.toLocaleString("en-IN"),
            note: `${counts.outForDelivery} out for delivery`,
            trend: "plain",
            icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7.5V12l3 2"],
          },
          {
            label: "Cancelled",
            value: counts.cancelled.toLocaleString("en-IN"),
            note: "↓ 2 vs last week",
            trend: "up",
            icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M9 9l6 6", "M15 9l-6 6"],
          },
        ]}
      />

      <section className={dashboardStyles["admin-card"]} aria-labelledby="admin-orders-heading">
        <div className={dashboardStyles["admin-card-heading-row"]}>
          <div>
            <h2 id="admin-orders-heading" className={dashboardStyles["admin-card-title"]}>
              All orders
            </h2>
            <p className={dashboardStyles["admin-card-subtitle"]}>
              Orders placed between {formatDateRange(rangeFrom, rangeTo)}
            </p>
          </div>
          <AdminFilterTabs
            label="Show orders"
            selected={statusTab}
            onSelect={(tab) => {
              setStatusTab(tab);
              setPage(1);
            }}
            tabs={[
              { key: "all", label: `All ${counts.all}` },
              { key: "delivered", label: `Delivered ${counts.delivered}` },
              { key: "pending", label: `Pending ${counts.pending}` },
              { key: "cancelled", label: `Cancelled ${counts.cancelled}` },
            ]}
          />
        </div>

        <div className={dashboardStyles["admin-table-scroll"]}>
          <table className={dashboardStyles["admin-orders-table"]}>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Date</th>
                <th scope="col">Customer</th>
                <th scope="col">Items</th>
                <th scope="col">Amount</th>
                <th scope="col">Payment</th>
                <th scope="col">Slot</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className={dashboardStyles["admin-visually-hidden"]}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageOrders.map((order) => (
                <tr key={order.orderNumber}>
                  <td className={dashboardStyles["admin-orders-muted"]}>{order.orderNumber}</td>
                  <td className={dashboardStyles["admin-orders-muted"]}>{formatOrderDate(order.placedAt)}</td>
                  <td>
                    <span className={dashboardStyles["admin-orders-customer"]}>{order.customerName}</span>
                    <span className={dashboardStyles["admin-orders-area"]}>{order.area}</span>
                  </td>
                  <td>{order.items}</td>
                  <td className={dashboardStyles["admin-orders-amount"]}>₹{order.amount}</td>
                  <td>{order.payment}</td>
                  <td>{order.slot}</td>
                  <td>
                    <span className={`${dashboardStyles["admin-status"]} ${STATUS_CLASS_NAMES[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className={dashboardStyles["admin-orders-actions"]}>
                    <AdminRowMenu
                      label={`Change status of ${order.orderNumber}`}
                      title="Mark as"
                      options={ADMIN_ORDER_STATUSES.map((status) => ({
                        label: status,
                        isDisabled: status === order.status,
                        isDanger: status === "Cancelled",
                        onSelect: () => {
                          changeAdminOrderStatus(order.orderNumber, status);
                          showToast(`${order.orderNumber} marked as ${status.toLowerCase()}`);
                        },
                      }))}
                    />
                  </td>
                </tr>
              ))}
              {pageOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className={dashboardStyles["admin-orders-empty"]}>
                    No orders match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination page={page} pageSize={PAGE_SIZE} total={shownOrders.length} onPageChange={setPage} itemName="orders" />
      </section>

      {isNewOrderOpen && (
        <AdminDialog title="New order" submitLabel="Add order" onClose={() => setIsNewOrderOpen(false)} onSubmit={saveNewOrder}>
          <AdminDialogField label="Customer name">
            <input
              className={adminInputClassName}
              value={newOrder.customerName}
              onChange={(changeEvent) => setNewOrder({ ...newOrder, customerName: changeEvent.target.value })}
              autoFocus
            />
          </AdminDialogField>
          <AdminDialogField label="Area">
            <input
              className={adminInputClassName}
              value={newOrder.area}
              onChange={(changeEvent) => setNewOrder({ ...newOrder, area: changeEvent.target.value })}
            />
          </AdminDialogField>
          <AdminDialogField label="Items" isWide>
            <input
              className={adminInputClassName}
              value={newOrder.items}
              placeholder="Milk 1 L × 2, Paneer 200 g"
              onChange={(changeEvent) => setNewOrder({ ...newOrder, items: changeEvent.target.value })}
            />
          </AdminDialogField>
          <AdminDialogField label="Amount (₹)">
            <input
              className={adminInputClassName}
              inputMode="numeric"
              value={newOrder.amount}
              onChange={(changeEvent) => setNewOrder({ ...newOrder, amount: changeEvent.target.value.replace(/\D/g, "") })}
            />
          </AdminDialogField>
          <AdminDialogField label="Payment">
            <select
              className={adminInputClassName}
              value={newOrder.payment}
              onChange={(changeEvent) => setNewOrder({ ...newOrder, payment: changeEvent.target.value })}
            >
              {["UPI", "Cash", "Card"].map((payment) => (
                <option key={payment}>{payment}</option>
              ))}
            </select>
          </AdminDialogField>
          <AdminDialogField label="Delivery slot">
            <select
              className={adminInputClassName}
              value={newOrder.slot}
              onChange={(changeEvent) => setNewOrder({ ...newOrder, slot: changeEvent.target.value })}
            >
              {["5–6 AM", "6–7 AM", "7–8 AM"].map((slot) => (
                <option key={slot}>{slot}</option>
              ))}
            </select>
          </AdminDialogField>
        </AdminDialog>
      )}

      {toast}
    </div>
  );
}
