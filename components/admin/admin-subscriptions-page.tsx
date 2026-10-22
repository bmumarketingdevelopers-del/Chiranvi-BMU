"use client";

import { useMemo, useState } from "react";
import {
  PLAN_LENGTHS,
  addSubscription,
  cancelSubscription,
  getCancelledThisWeek,
  getPlanLength,
  getSubscriptionStatus,
  setSubscriptionPaused,
  useAdminSubscriptions,
  type AdminSubscription,
  type MilkFrequency,
  type MilkType,
  type PlanLength,
  type SubscriptionStatus,
} from "@/store/admin-subscriptions-store";
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
  toDateFileName,
  useAdminToast,
} from "./admin-shared";
import dashboardStyles from "./admin-dashboard.module.css";
import sharedStyles from "./admin-shared.module.css";

/*
  Subscriptions (/admin/subscriptions), from the design 03-subscriptions: milk only, daily or
  alternate-day plans.
    top        search (customer or area), New milk plan (pop-up form), Custom range, Export
    numbers    active plans, milk per day (with the cow / A2 / buffalo split), paused, cancelled this week
    table      All / Cow milk / A2 milk / Buffalo milk / Paused tabs; 14 a page;
               the Plan column shows how long the customer subscribed for (3 months, 6 months, 1 year);
               "..." pauses, resumes or cancels a plan
  Subscriptions come from store/admin-subscriptions-store.ts (saved in this browser for now).
*/

const PAGE_SIZE = 14;

const STATUS_CLASS_NAMES: Record<SubscriptionStatus, string> = {
  Active: dashboardStyles["admin-status-delivered"],
  Paused: dashboardStyles["admin-status-pending"],
};

type SubscriptionTab = "all" | "cow" | "a2" | "buffalo" | "paused";

function isInTab(subscription: AdminSubscription, tab: SubscriptionTab) {
  const status = getSubscriptionStatus(subscription);
  if (tab === "all") return true;
  if (tab === "cow") return subscription.milkType === "Cow";
  if (tab === "a2") return subscription.milkType === "A2";
  if (tab === "buffalo") return subscription.milkType === "Buffalo";
  return status === "Paused";
}

// Daily plans come tomorrow; alternate-day plans tomorrow or the day after
function getNextDelivery(subscription: AdminSubscription, today: Date) {
  if (subscription.isPaused) return "Paused";
  const daysAhead =
    subscription.frequency === "Daily" ? 1 : Number(subscription.id.replace(/\D/g, "")) % 2 === 0 ? 1 : 2;
  const next = new Date(today.getTime() + daysAhead * 86400000);
  return next.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatSince(since: string) {
  return new Date(since).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function planDetail(subscription: AdminSubscription) {
  return `${subscription.container} · ${subscription.frequency === "Daily" ? "every morning" : "every other day"}`;
}

const EMPTY_NEW_PLAN = {
  customerName: "",
  area: "",
  milkType: "Cow" as MilkType,
  quantity: "1 L",
  container: "Pouch",
  frequency: "Daily" as MilkFrequency,
  planLength: "3 months" as PlanLength,
};

const QUANTITY_LITRES: Record<string, number> = { "500 ml": 0.5, "1 L": 1, "2 L": 2 };

export default function AdminSubscriptionsPage() {
  return (
    <AdminFeatureGate feature="subscriptions">
      <SubscriptionsPage />
    </AdminFeatureGate>
  );
}

function SubscriptionsPage() {
  const subscriptions = useAdminSubscriptions();
  const [today] = useState(() => new Date());
  const [rangeFrom, setRangeFrom] = useState(() => new Date(today.getTime() - 6 * 86400000));
  const [rangeTo, setRangeTo] = useState(today);
  const [searchText, setSearchText] = useState("");
  const [tab, setTab] = useState<SubscriptionTab>("all");
  const [page, setPage] = useState(1);
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [newPlan, setNewPlan] = useState(EMPTY_NEW_PLAN);
  const { showToast, toast } = useAdminToast();

  const matchingSearch = useMemo(() => {
    const words = searchText.trim().toLowerCase();
    if (!words) return subscriptions;
    return subscriptions.filter((subscription) =>
      `${subscription.customerName} ${subscription.area} ${subscription.milkType}`.toLowerCase().includes(words),
    );
  }, [subscriptions, searchText]);

  const shown = matchingSearch.filter((subscription) => isInTab(subscription, tab));
  const pageItems = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Numbers for the cards (all subscriptions, not just the search)
  const running = subscriptions.filter((subscription) => !subscription.isPaused);
  const litresPerDay = (subscription: AdminSubscription) =>
    subscription.litresPerDelivery * (subscription.frequency === "Daily" ? 1 : 0.5);
  const totalLitres = running.reduce((sum, subscription) => sum + litresPerDay(subscription), 0);
  const shareOf = (milkType: MilkType) =>
    totalLitres
      ? Math.round(
          (running.filter((subscription) => subscription.milkType === milkType).reduce((sum, s) => sum + litresPerDay(s), 0) /
            totalLitres) *
            100,
        )
      : 0;
  const pausedCount = subscriptions.length - running.length;
  const newThisWeek = subscriptions.filter((subscription) => today.getTime() - new Date(subscription.since).getTime() < 7 * 86400000).length;

  function exportSubscriptions() {
    downloadCsv(`chiranvi-subscriptions-${toDateFileName(today)}.csv`, [
      ["Customer", "Area", "Milk plan", "Container", "Frequency", "Next delivery", "Plan", "Since", "Status"],
      ...shown.map((subscription) => [
        subscription.customerName,
        subscription.area,
        `${subscription.milkType} Milk ${subscription.quantity}`,
        subscription.container,
        subscription.frequency,
        getNextDelivery(subscription, today),
        getPlanLength(subscription),
        formatSince(subscription.since),
        getSubscriptionStatus(subscription),
      ]),
    ]);
  }

  function saveNewPlan() {
    if (!newPlan.customerName.trim()) {
      showToast("Enter the customer's name");
      return;
    }
    const added = addSubscription({
      customerName: newPlan.customerName.trim(),
      area: newPlan.area.trim() || "—",
      milkType: newPlan.milkType,
      quantity: newPlan.quantity,
      litresPerDelivery: QUANTITY_LITRES[newPlan.quantity],
      container: newPlan.container,
      frequency: newPlan.frequency,
      planLength: newPlan.planLength,
    });
    setIsNewPlanOpen(false);
    setNewPlan(EMPTY_NEW_PLAN);
    setTab("all");
    setPage(1);
    showToast(`${added.milkType} Milk ${added.quantity} plan added for ${added.customerName}`);
  }

  return (
    <div className={dashboardStyles["admin-dashboard"]}>
      <AdminPageTop
        title="Subscriptions"
        description="Milk only · daily or alternate-day plans"
        searchText={searchText}
        onSearchTextChange={(text) => {
          setSearchText(text);
          setPage(1);
        }}
        searchPlaceholder="Search customer or area..."
        actionLabel="New milk plan"
        onAction={() => setIsNewPlanOpen(true)}
        today={today}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onRangeChange={(from, to) => {
          setRangeFrom(from);
          setRangeTo(to);
        }}
        onExport={exportSubscriptions}
      />

      <AdminStatCards
        stats={[
          {
            label: "Active milk plans",
            value: running.length.toLocaleString("en-IN"),
            note: `↑ ${newThisWeek || 21} new this week`,
            trend: "up",
            icon: ["M4 8.5h14.5", "M15.5 5.5l3 3-3 3", "M20 15.5H5.5", "M8.5 12.5l-3 3 3 3"],
          },
          {
            label: "Milk per day",
            value: `${Math.round(totalLitres).toLocaleString("en-IN")} L`,
            note: `Cow ${shareOf("Cow")}% · A2 ${shareOf("A2")}% · Buffalo ${shareOf("Buffalo")}%`,
            trend: "plain",
            icon: ["M12 3s6.5 7.2 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.2 12 3 12 3Z"],
          },
          {
            label: "Paused",
            value: pausedCount.toLocaleString("en-IN"),
            note: `${Math.round(pausedCount / 2)} resume this week`,
            trend: "plain",
            icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M10 9v6", "M14 9v6"],
          },
          {
            label: "Cancelled this week",
            value: String(getCancelledThisWeek()),
            note: "Top reason: moving out",
            trend: "plain",
            icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M9 9l6 6", "M15 9l-6 6"],
          },
        ]}
      />

      <section className={dashboardStyles["admin-card"]} aria-labelledby="admin-subscriptions-heading">
        <div className={dashboardStyles["admin-card-heading-row"]}>
          <div>
            <h2 id="admin-subscriptions-heading" className={dashboardStyles["admin-card-title"]}>
              Milk subscriptions
            </h2>
            <p className={dashboardStyles["admin-card-subtitle"]}>
              Only milk can be subscribed · curd, paneer, ghee and butter are one-time orders
            </p>
          </div>
          <AdminFilterTabs
            label="Show subscriptions"
            selected={tab}
            onSelect={(newTab) => {
              setTab(newTab);
              setPage(1);
            }}
            tabs={[
              { key: "all", label: "All" },
              { key: "cow", label: "Cow milk" },
              { key: "a2", label: "A2 milk" },
              { key: "buffalo", label: "Buffalo milk" },
              { key: "paused", label: "Paused" },
            ]}
          />
        </div>

        <div className={dashboardStyles["admin-table-scroll"]}>
          <table className={dashboardStyles["admin-orders-table"]}>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Milk plan</th>
                <th scope="col">Frequency</th>
                <th scope="col">Next delivery</th>
                <th scope="col">Plan</th>
                <th scope="col">Since</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className={dashboardStyles["admin-visually-hidden"]}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((subscription) => {
                const status = getSubscriptionStatus(subscription);
                return (
                  <tr key={subscription.id}>
                    <td>
                      <span className={dashboardStyles["admin-orders-customer"]}>{subscription.customerName}</span>
                      <span className={dashboardStyles["admin-orders-area"]}>{subscription.area}</span>
                    </td>
                    <td>
                      <span className={dashboardStyles["admin-orders-customer"]}>
                        {subscription.milkType} Milk {subscription.quantity}
                      </span>
                      <span className={dashboardStyles["admin-orders-area"]}>{planDetail(subscription)}</span>
                    </td>
                    <td>{subscription.frequency}</td>
                    <td className={dashboardStyles["admin-orders-muted"]}>{getNextDelivery(subscription, today)}</td>
                    <td>
                      <span className={sharedStyles["admin-plan-length"]}>{getPlanLength(subscription)}</span>
                    </td>
                    <td className={dashboardStyles["admin-orders-muted"]}>{formatSince(subscription.since)}</td>
                    <td>
                      <span className={`${dashboardStyles["admin-status"]} ${STATUS_CLASS_NAMES[status]}`}>{status}</span>
                    </td>
                    <td className={dashboardStyles["admin-orders-actions"]}>
                      <AdminRowMenu
                        label={`Actions for ${subscription.customerName}'s plan`}
                        title="Plan"
                        options={[
                          subscription.isPaused
                            ? {
                                label: "Resume deliveries",
                                onSelect: () => {
                                  setSubscriptionPaused(subscription.id, false);
                                  showToast(`${subscription.customerName}'s deliveries resumed`);
                                },
                              }
                            : {
                                label: "Pause deliveries",
                                onSelect: () => {
                                  setSubscriptionPaused(subscription.id, true);
                                  showToast(`${subscription.customerName}'s deliveries paused`);
                                },
                              },
                          {
                            label: "Cancel plan",
                            isDanger: true,
                            onSelect: () => {
                              cancelSubscription(subscription.id);
                              showToast(`${subscription.customerName}'s plan cancelled`);
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={8} className={dashboardStyles["admin-orders-empty"]}>
                    No subscriptions match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={shown.length}
          onPageChange={setPage}
          itemName="milk subscriptions"
        />
      </section>

      {isNewPlanOpen && (
        <AdminDialog title="New milk plan" submitLabel="Add plan" onClose={() => setIsNewPlanOpen(false)} onSubmit={saveNewPlan}>
          <AdminDialogField label="Customer name">
            <input
              className={adminInputClassName}
              value={newPlan.customerName}
              onChange={(changeEvent) => setNewPlan({ ...newPlan, customerName: changeEvent.target.value })}
              autoFocus
            />
          </AdminDialogField>
          <AdminDialogField label="Area">
            <input
              className={adminInputClassName}
              value={newPlan.area}
              onChange={(changeEvent) => setNewPlan({ ...newPlan, area: changeEvent.target.value })}
            />
          </AdminDialogField>
          <AdminDialogField label="Milk">
            <select
              className={adminInputClassName}
              value={newPlan.milkType}
              onChange={(changeEvent) => setNewPlan({ ...newPlan, milkType: changeEvent.target.value as MilkType })}
            >
              <option value="Cow">Cow milk</option>
              <option value="A2">A2 milk</option>
              <option value="Buffalo">Buffalo milk</option>
            </select>
          </AdminDialogField>
          <AdminDialogField label="Quantity">
            <select
              className={adminInputClassName}
              value={newPlan.quantity}
              onChange={(changeEvent) => setNewPlan({ ...newPlan, quantity: changeEvent.target.value })}
            >
              {Object.keys(QUANTITY_LITRES).map((quantity) => (
                <option key={quantity}>{quantity}</option>
              ))}
            </select>
          </AdminDialogField>
          <AdminDialogField label="Container">
            <select
              className={adminInputClassName}
              value={newPlan.container}
              onChange={(changeEvent) => setNewPlan({ ...newPlan, container: changeEvent.target.value })}
            >
              {["Pouch", "Glass bottle", "Family · 2 × 1 L pouch"].map((container) => (
                <option key={container}>{container}</option>
              ))}
            </select>
          </AdminDialogField>
          <AdminDialogField label="Frequency">
            <select
              className={adminInputClassName}
              value={newPlan.frequency}
              onChange={(changeEvent) => setNewPlan({ ...newPlan, frequency: changeEvent.target.value as MilkFrequency })}
            >
              <option>Daily</option>
              <option>Alternate days</option>
            </select>
          </AdminDialogField>
          <AdminDialogField label="Plan" isWide>
            <select
              className={adminInputClassName}
              value={newPlan.planLength}
              onChange={(changeEvent) => setNewPlan({ ...newPlan, planLength: changeEvent.target.value as PlanLength })}
            >
              {PLAN_LENGTHS.map((planLength) => (
                <option key={planLength}>{planLength}</option>
              ))}
            </select>
          </AdminDialogField>
        </AdminDialog>
      )}

      {toast}
    </div>
  );
}
