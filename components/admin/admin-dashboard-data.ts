/*
  Sample numbers for the Chiranvi Panel dashboard, from the design, until real orders, deliveries and
  payments come from the database (Supabase). Everything the dashboard shows is listed here.
*/

export type AlertTone = "red" | "amber" | "orange" | "blue";
export type StatIconTone = "green" | "tan" | "blue" | "purple" | "orange" | "red";
export type TrendTone = "up" | "down" | "plain" | "bad";

export const dashboardAlerts: {
  tone: AlertTone;
  icon: string[];
  title: string;
  detail: string;
  action: string;
  href?: string;
  // Shown after the button is clicked when it does not open a page
  doneMessage?: string;
}[] = [
  {
    tone: "red",
    icon: ["M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z", "M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"],
    title: "3 missed deliveries",
    detail: "Route 2 · Kengeri",
    action: "View",
    href: "/admin/deliveries",
  },
  {
    tone: "orange",
    icon: ["M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z", "M4 7.5l8 4.5 8-4.5", "M12 12v9"],
    title: "6 items low in stock",
    detail: "Ghee, Paneer and 4 more",
    action: "View",
    href: "/admin/products",
  },
  {
    tone: "blue",
    icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M10 9v6", "M14 9v6"],
    title: "5 pause requests",
    detail: "For tomorrow’s delivery",
    action: "Review",
    href: "/admin/pause-requests",
  },
];

export const dashboardStats: {
  label: string;
  value: string;
  note: string;
  trend: TrendTone;
  iconTone: StatIconTone;
  icon: string[];
}[] = [
  {
    label: "Tomorrow’s deliveries",
    value: "842",
    note: "↑ 4.2% vs last week",
    trend: "up",
    iconTone: "green",
    icon: ["M2.5 6.5h11v9.5h-11z", "M13.5 9.5h4l3.5 3.5v3h-7.5", "M6.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  },
  {
    label: "Deliveries today",
    value: "768 / 812",
    note: "94.6% done · 41 pending",
    trend: "plain",
    iconTone: "green",
    icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M8.5 12.2l2.4 2.4 4.8-4.8"],
  },
  {
    label: "Revenue this week",
    value: "₹3,18,400",
    note: "↑ 12.4% vs last week",
    trend: "up",
    iconTone: "green",
    icon: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M9 7.5h6", "M9 10.5h6", "M11 7.5c2.6 0 2.6 4.5 0 4.5H9l4.5 4.5"],
  },
  {
    label: "Plans ending this week",
    value: "18",
    note: "Renewal reminders sent",
    trend: "plain",
    iconTone: "tan",
    icon: ["M4 6h16v14H4z", "M4 10h16", "M8 3.5v4M16 3.5v4", "M12 13v3l2 1"],
  },
  {
    label: "New orders",
    value: "37",
    note: "↑ 8 vs last week",
    trend: "up",
    iconTone: "blue",
    icon: ["M6 8h12l-1 13H7L6 8Z", "M9 8V6a3 3 0 0 1 6 0v2"],
  },
  {
    label: "Active subscriptions",
    value: "1,126",
    note: "↑ 21 new this week",
    trend: "up",
    iconTone: "purple",
    icon: ["M4 8.5h14.5", "M15.5 5.5l3 3-3 3", "M20 15.5H5.5", "M8.5 12.5l-3 3 3 3"],
  },
  {
    label: "Churn this week",
    value: "9",
    note: "↓ 3 · 6 paused, 3 cancelled",
    trend: "up",
    iconTone: "orange",
    icon: ["M10 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M3 20.5a7 7 0 0 1 14 0", "M16 11h6"],
  },
  {
    label: "Failed payments",
    value: "4",
    note: "₹2,180 to recover",
    trend: "bad",
    iconTone: "red",
    icon: ["M3 6h18v12H3z", "M3 10h18", "M14 13.5l4 4", "M18 13.5l-4 4"],
  },
];

// Revenue for the last seven days, oldest first (the last one is today)
export const revenueThisWeek = [41000, 44000, 42000, 47000, 49000, 46000, 50200];
export const revenueLastWeek = [38000, 40000, 39000, 42000, 43000, 41000, 39500];

export const todaysDeliveries = { scheduled: 812, routes: 6, delivered: 768, pending: 41, missed: 3 };
