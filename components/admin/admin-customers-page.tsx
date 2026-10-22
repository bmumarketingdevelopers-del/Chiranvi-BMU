"use client";

import { useMemo, useState } from "react";
import { getNameInitials } from "@/components/account/account-profile";
import {
  INACTIVE_AFTER_DAYS,
  addCustomer,
  getCustomerStatus,
  removeCustomer,
  setCustomerPaused,
  useAdminCustomers,
  type AdminCustomer,
  type CustomerStatus,
} from "@/store/admin-customers-store";
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
  useIsPanelOwner,
  OWNER_ONLY_MESSAGE,
} from "./admin-shared";
import dashboardStyles from "./admin-dashboard.module.css";
import sharedStyles from "./admin-shared.module.css";

/*
  Customers (/admin/customers), from the design 05-customers: everyone who orders from Chiranvi.
  (The design's wallet column, card and tab are left out: Chiranvi does not use a wallet.)
    top        search (name, phone or area), Add customer (pop-up form), Custom range, Export
    numbers    total customers (new this month), active, average lifetime value, inactive
    table      All / Active / Paused / Inactive tabs; 14 a page; initials, phone, plan, lifetime value,
               orders, last order, status; "..." pauses, resumes or removes a customer
  Inactive: no order for more than 30 days. Customers come from store/admin-customers-store.ts.
*/

const PAGE_SIZE = 14;

const STATUS_CLASS_NAMES: Record<CustomerStatus, string> = {
  Active: dashboardStyles["admin-status-delivered"],
  Paused: dashboardStyles["admin-status-pending"],
  Inactive: sharedStyles["admin-status-cancelled"],
};

type CustomerTab = "all" | "active" | "paused" | "inactive";

function lastOrderText(daysAgo: number) {
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  const date = new Date(Date.now() - daysAgo * 86400000);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const EMPTY_NEW_CUSTOMER = { name: "", area: "", phone: "", plan: "Cow Milk 1 L" };
const PLAN_CHOICES = ["Cow Milk 1 L", "Cow Milk 500 ml", "Cow Milk 2 L", "A2 Milk 1 L", "Buffalo Milk 1 L", "One-time orders"];

export default function AdminCustomersPage() {
  return (
    <AdminFeatureGate feature="customers">
      <CustomersPage />
    </AdminFeatureGate>
  );
}

function CustomersPage() {
  const customers = useAdminCustomers();
  const [today] = useState(() => new Date());
  const [rangeFrom, setRangeFrom] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [rangeTo, setRangeTo] = useState(today);
  const [searchText, setSearchText] = useState("");
  const [tab, setTab] = useState<CustomerTab>("all");
  const [page, setPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState(EMPTY_NEW_CUSTOMER);
  const { showToast, toast } = useAdminToast();
  // Sensitive actions only the owner can do (Roles & permissions)
  const isOwner = useIsPanelOwner();

  const matchingSearch = useMemo(() => {
    const words = searchText.trim().toLowerCase();
    if (!words) return customers;
    const digits = words.replace(/\D/g, "");
    return customers.filter(
      (customer) =>
        `${customer.name} ${customer.area}`.toLowerCase().includes(words) ||
        (digits.length >= 3 && customer.phone.replace(/\D/g, "").includes(digits)),
    );
  }, [customers, searchText]);

  const shown = matchingSearch.filter((customer) => tab === "all" || getCustomerStatus(customer).toLowerCase() === tab);
  const pageItems = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCount = customers.filter((customer) => getCustomerStatus(customer) === "Active").length;
  const inactiveCount = customers.filter((customer) => getCustomerStatus(customer) === "Inactive").length;
  const newThisMonth = customers.filter((customer) => customer.joinedDaysAgo < today.getDate()).length;
  const averageValue = customers.length
    ? Math.round(customers.reduce((sum, customer) => sum + customer.lifetimeValue, 0) / customers.length)
    : 0;

  function saveNewCustomer() {
    const phoneDigits = newCustomer.phone.replace(/\D/g, "");
    if (!newCustomer.name.trim() || phoneDigits.length !== 10) {
      showToast("Enter the name and a 10-digit phone number");
      return;
    }
    const added = addCustomer({
      name: newCustomer.name.trim(),
      area: newCustomer.area.trim() || "—",
      phone: `${phoneDigits.slice(0, 5)} ${phoneDigits.slice(5, 7)} ${phoneDigits.slice(7)}`,
      plan: newCustomer.plan,
    });
    setIsAddOpen(false);
    setNewCustomer(EMPTY_NEW_CUSTOMER);
    setTab("all");
    setPage(1);
    showToast(`${added.name} added`);
  }

  function exportCustomers() {
    downloadCsv(`chiranvi-customers-${toDateFileName(today)}.csv`, [
      ["Customer", "Area", "Phone", "Plan", "Lifetime value (₹)", "Orders", "Last order", "Status"],
      ...shown.map((customer: AdminCustomer) => [
        customer.name,
        customer.area,
        customer.phone,
        customer.plan,
        customer.lifetimeValue,
        customer.orderCount,
        lastOrderText(customer.lastOrderDaysAgo),
        getCustomerStatus(customer),
      ]),
    ]);
  }

  return (
    <div className={dashboardStyles["admin-dashboard"]}>
      <AdminPageTop
        title="Customers"
        description="Everyone who orders from Chiranvi"
        searchText={searchText}
        onSearchTextChange={(text) => {
          setSearchText(text);
          setPage(1);
        }}
        searchPlaceholder="Search customer by name or phone..."
        actionLabel="Add customer"
        onAction={() => setIsAddOpen(true)}
        today={today}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onRangeChange={(from, to) => {
          setRangeFrom(from);
          setRangeTo(to);
        }}
        onExport={exportCustomers}
      />

      <AdminStatCards
        stats={[
          {
            label: "Total customers",
            value: customers.length.toLocaleString("en-IN"),
            note: `↑ ${newThisMonth} new this month`,
            trend: "up",
            icon: ["M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4.5 20.5a7.5 7.5 0 0 1 15 0"],
          },
          {
            label: "Active",
            value: activeCount.toLocaleString("en-IN"),
            note: `${customers.length ? Math.round((activeCount / customers.length) * 100) : 0}% of all customers`,
            trend: "plain",
            icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M8.5 12.2l2.4 2.4 4.8-4.8"],
          },
          {
            label: "Avg lifetime value",
            value: `₹${averageValue.toLocaleString("en-IN")}`,
            note: "↑ 6.2% vs last month",
            trend: "up",
            icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M9 7.5h6", "M9 10.5h6", "M11 7.5c2.6 0 2.6 4.5 0 4.5H9l4.5 4.5"],
          },
          {
            label: "Inactive",
            value: inactiveCount.toLocaleString("en-IN"),
            note: `No order in ${INACTIVE_AFTER_DAYS} days`,
            trend: "plain",
            icon: ["M10 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M3 20.5a7 7 0 0 1 14 0", "M16 11h6"],
          },
        ]}
      />

      <section className={dashboardStyles["admin-card"]} aria-labelledby="admin-customers-heading">
        <div className={dashboardStyles["admin-card-heading-row"]}>
          <div>
            <h2 id="admin-customers-heading" className={dashboardStyles["admin-card-title"]}>
              Customers
            </h2>
            <p className={dashboardStyles["admin-card-subtitle"]}>Search by name, phone or area</p>
          </div>
          <AdminFilterTabs
            label="Show customers"
            selected={tab}
            onSelect={(newTab) => {
              setTab(newTab);
              setPage(1);
            }}
            tabs={[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "paused", label: "Paused" },
              { key: "inactive", label: "Inactive" },
            ]}
          />
        </div>

        <div className={dashboardStyles["admin-table-scroll"]}>
          <table className={dashboardStyles["admin-orders-table"]}>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Phone</th>
                <th scope="col">Plan</th>
                <th scope="col">Lifetime value</th>
                <th scope="col">Orders</th>
                <th scope="col">Last order</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className={dashboardStyles["admin-visually-hidden"]}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((customer, rowIndex) => {
                const status = getCustomerStatus(customer);
                return (
                  <tr key={customer.id}>
                    <td>
                      <span className={sharedStyles["admin-person-cell"]}>
                        <span
                          className={`${sharedStyles["admin-initials"]} ${
                            rowIndex % 2 ? sharedStyles["admin-initials-yellow"] : ""
                          }`}
                          aria-hidden="true"
                        >
                          {getNameInitials(customer.name)}
                        </span>
                        <span>
                          <span className={dashboardStyles["admin-orders-customer"]}>{customer.name}</span>
                          <span className={dashboardStyles["admin-orders-area"]}>{customer.area}</span>
                        </span>
                      </span>
                    </td>
                    <td className={dashboardStyles["admin-orders-muted"]}>
                      <a href={`tel:+91${customer.phone.replace(/\D/g, "")}`} className={sharedStyles["admin-phone-link"]}>
                        {customer.phone}
                      </a>
                    </td>
                    <td>{customer.plan}</td>
                    <td className={dashboardStyles["admin-orders-amount"]}>₹{customer.lifetimeValue.toLocaleString("en-IN")}</td>
                    <td>{customer.orderCount}</td>
                    <td className={dashboardStyles["admin-orders-muted"]}>{lastOrderText(customer.lastOrderDaysAgo)}</td>
                    <td>
                      <span className={`${dashboardStyles["admin-status"]} ${STATUS_CLASS_NAMES[status]}`}>{status}</span>
                    </td>
                    <td className={dashboardStyles["admin-orders-actions"]}>
                      <AdminRowMenu
                        label={`Actions for ${customer.name}`}
                        title="Customer"
                        options={[
                          customer.isPaused
                            ? {
                                label: "Resume deliveries",
                                onSelect: () => {
                                  setCustomerPaused(customer.id, false);
                                  showToast(`${customer.name}'s deliveries resumed`);
                                },
                              }
                            : {
                                label: "Pause deliveries",
                                onSelect: () => {
                                  setCustomerPaused(customer.id, true);
                                  showToast(`${customer.name}'s deliveries paused`);
                                },
                              },
                          {
                            label: "Remove customer",
                            isDanger: true,
                            permission: "delete",
                            onSelect: () => {
                              if (!isOwner) {
                                showToast(OWNER_ONLY_MESSAGE);
                                return;
                              }
                              removeCustomer(customer.id);
                              showToast(`${customer.name} removed`);
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
                    No customers match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination page={page} pageSize={PAGE_SIZE} total={shown.length} onPageChange={setPage} itemName="customers" />
      </section>

      {isAddOpen && (
        <AdminDialog title="Add customer" submitLabel="Add customer" onClose={() => setIsAddOpen(false)} onSubmit={saveNewCustomer}>
          <AdminDialogField label="Name">
            <input
              className={adminInputClassName}
              value={newCustomer.name}
              onChange={(changeEvent) => setNewCustomer({ ...newCustomer, name: changeEvent.target.value })}
              autoFocus
            />
          </AdminDialogField>
          <AdminDialogField label="Phone">
            <input
              className={adminInputClassName}
              inputMode="numeric"
              placeholder="10-digit number"
              value={newCustomer.phone}
              onChange={(changeEvent) =>
                setNewCustomer({ ...newCustomer, phone: changeEvent.target.value.replace(/\D/g, "").slice(0, 10) })
              }
            />
          </AdminDialogField>
          <AdminDialogField label="Area">
            <input
              className={adminInputClassName}
              value={newCustomer.area}
              onChange={(changeEvent) => setNewCustomer({ ...newCustomer, area: changeEvent.target.value })}
            />
          </AdminDialogField>
          <AdminDialogField label="Plan">
            <select
              className={adminInputClassName}
              value={newCustomer.plan}
              onChange={(changeEvent) => setNewCustomer({ ...newCustomer, plan: changeEvent.target.value })}
            >
              {PLAN_CHOICES.map((plan) => (
                <option key={plan}>{plan}</option>
              ))}
            </select>
          </AdminDialogField>
        </AdminDialog>
      )}

      {toast}
    </div>
  );
}
