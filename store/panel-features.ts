/*
  The Chiranvi Panel pages that can be given to a manager. Plain data (no React), so server pages can
  read it too. store/staff-access-store.ts uses it for access.
*/

// Each one is a page in the Chiranvi Panel sidebar. Dashboard, Staff and Roles & permissions are added to these
// in store/staff-access-store.ts (PANEL_MODULES) for the permission grid.
export const PANEL_FEATURES = [
  { key: "orders", label: "Orders", group: "Sales", description: "See orders and change their status" },
  { key: "subscriptions", label: "Subscriptions", group: "Sales", description: "Daily and monthly milk plans" },
  { key: "pause-requests", label: "Pause requests", group: "Sales", description: "Customers pausing their deliveries" },
  { key: "customers", label: "Customers", group: "Sales", description: "Customer details and history" },
  { key: "leads", label: "Leads", group: "Sales", description: "People interested in Chiranvi" },
  { key: "payments", label: "Payments", group: "Sales", description: "Payments received and failed payments" },
  { key: "refunds", label: "Refunds & complaints", group: "Sales", description: "Refund requests and complaints" },
  { key: "products", label: "Products & pricing", group: "Operations", description: "Products, prices and stock" },
  { key: "deliveries", label: "Deliveries", group: "Operations", description: "Today's and tomorrow's deliveries" },
  { key: "routes", label: "Routes & agents", group: "Operations", description: "Delivery routes and agents" },
  { key: "reports", label: "Reports", group: "Business", description: "Sales and delivery reports" },
  { key: "coupons", label: "Coupons & offers", group: "Business", description: "Discount coupons and offers" },
] as const;

export type PanelFeature = (typeof PANEL_FEATURES)[number]["key"];
