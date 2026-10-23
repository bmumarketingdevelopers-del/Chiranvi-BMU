import { useSyncExternalStore } from "react";

/*
  Coupons and offers, made in the Chiranvi Panel (Coupons & offers page), until the database is
  connected; kept here so the customer site's offers can read the same list later. Saved in this
  browser. No wallet: rewards are discounts on orders or plans.
  - Status comes from the dates, the use limit and the pause switch: Active, Scheduled (starts later),
    Paused, Expired (ended or fully used).
  - Redemptions: who used which coupon on which order. The first time, sample redemptions are made to
    match each coupon's use count.
*/

export type CouponKind = "flat" | "percent" | "free-days" | "referral";
export type CouponStatus = "Active" | "Scheduled" | "Paused" | "Expired";

export type Coupon = {
  code: string; // FIRST50 (unique, capitals)
  description: string; // "₹50 off the first order"
  kind: CouponKind;
  value: number; // ₹ off, % off, free days, or ₹ reward
  minOrder?: number; // ₹
  appliesTo: string; // "All products", "Milk", "Ghee & butter", ...
  usageLimit: number | null; // null: no limit
  used: number;
  validFrom: string; // YYYY-MM-DD
  validTill: string | null; // YYYY-MM-DD, null: no expiry
  isPaused: boolean;
};

export type Redemption = {
  id: string;
  code: string;
  customerName: string;
  area: string;
  orderNumber: string;
  redeemedAt: string; // ISO date and time
  discount: number; // ₹
  orderValue: number; // ₹ before the discount
};

export const COUPON_KINDS: { key: CouponKind; label: string }[] = [
  { key: "flat", label: "₹ off" },
  { key: "percent", label: "% off" },
  { key: "free-days", label: "Free days of milk" },
  { key: "referral", label: "Referral reward (₹ each)" },
];

export const COUPON_APPLIES_TO = ["All products", "Milk", "Milk plans", "Paneer", "Ghee & butter", "Others"];

const COUPONS_KEY = "chiranvi-coupons";
const REDEMPTIONS_KEY = "chiranvi-coupon-redemptions";

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function daysFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

function startingCoupons(): Coupon[] {
  const today = new Date();
  const monthEnd = dayKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const monthStart = dayKey(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastMonthEnd = dayKey(new Date(today.getFullYear(), today.getMonth(), 0));
  const lastMonthStart = dayKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  return [
    { code: "FIRST50", description: "₹50 off the first order", kind: "flat", value: 50, appliesTo: "All products", usageLimit: 200, used: 86, validFrom: monthStart, validTill: monthEnd, isPaused: false },
    { code: "SUB50", description: "₹50 off a 3-month milk plan", kind: "flat", value: 50, appliesTo: "Milk plans", usageLimit: 300, used: 31, validFrom: monthStart, validTill: monthEnd, isPaused: false },
    { code: "A2TRY", description: "First 3 days of A2 milk free", kind: "free-days", value: 3, appliesTo: "Milk", usageLimit: 50, used: 21, validFrom: monthStart, validTill: daysFromToday(24), isPaused: false },
    { code: "REFER100", description: "₹100 for you and your friend", kind: "referral", value: 100, appliesTo: "All products", usageLimit: null, used: 12, validFrom: "2026-01-01", validTill: null, isPaused: false },
    { code: "DIWALI10", description: "10% off ghee and paneer", kind: "percent", value: 10, appliesTo: "Ghee & butter", usageLimit: 150, used: 64, validFrom: monthStart, validTill: daysFromToday(12), isPaused: false },
    { code: "MONSOON20", description: "20% off curd combo", kind: "percent", value: 20, appliesTo: "Others", usageLimit: 120, used: 120, validFrom: lastMonthStart, validTill: lastMonthEnd, isPaused: false },
  ];
}

const sampleCustomers: [string, string][] = [
  ["Naveen Reddy", "Kengeri"],
  ["Sneha Kulkarni", "Uttarahalli"],
  ["Mahesh B", "Vijayanagar"],
  ["Deepa S", "Banashankari"],
  ["Rahul Jain", "JP Nagar"],
  ["Anitha R", "Basavanagudi"],
  ["Suresh Gowda", "Kengeri"],
  ["Meena Iyer", "Uttarahalli"],
  ["Karthik N", "Vijayanagar"],
  ["Divya Rao", "Banashankari"],
  ["Harish Patil", "JP Nagar"],
  ["Lakshmi Devi", "RR Nagar"],
  ["Arjun Shetty", "Jayanagar"],
  ["Kavya M", "Basavanagudi"],
];

// What a coupon takes off an order of this value
export function getDiscount(coupon: Pick<Coupon, "kind" | "value">, orderValue: number) {
  if (coupon.kind === "percent") return Math.round((orderValue * coupon.value) / 100);
  if (coupon.kind === "free-days") return coupon.value * 96; // A2 milk 1 L a day
  return Math.min(coupon.value, orderValue);
}

// Each coupon's uses spread over its dates (newest first), one order number per redemption
function makeRedemptions(coupons: Coupon[]): Redemption[] {
  const redemptions: Redemption[] = [];
  const now = new Date();
  let count = 0;
  coupons.forEach((coupon, couponIndex) => {
    const start = new Date(`${coupon.validFrom}T09:00:00`);
    const end = coupon.validTill && new Date(`${coupon.validTill}T20:00:00`) < now ? new Date(`${coupon.validTill}T20:00:00`) : now;
    // Referral coupons started long ago: spread over the last 60 days only
    const from = coupon.kind === "referral" ? new Date(now.getTime() - 60 * 86400000) : start;
    for (let use = 0; use < coupon.used; use++) {
      const at = new Date(from.getTime() + ((end.getTime() - from.getTime()) * (use + 0.5)) / coupon.used);
      const [customerName, area] = sampleCustomers[(use * 5 + couponIndex * 3) % sampleCustomers.length];
      const orderValue = coupon.kind === "free-days" ? 288 : 120 + ((use * 97 + couponIndex * 53) % 980);
      redemptions.push({
        id: `RD-${++count}`,
        code: coupon.code,
        customerName,
        area,
        orderNumber: "",
        redeemedAt: at.toISOString(),
        discount: getDiscount(coupon, orderValue),
        orderValue,
      });
    }
  });
  redemptions.sort((first, second) => second.redeemedAt.localeCompare(first.redeemedAt));
  redemptions.forEach((redemption, index) => (redemption.orderNumber = `#CF-${2041 - index * 5}`));
  return redemptions;
}

let coupons: Coupon[] | null = null;
let redemptions: Redemption[] | null = null;
const listeners = new Set<() => void>();
const EMPTY_COUPONS: Coupon[] = [];
const EMPTY_REDEMPTIONS: Redemption[] = [];

function load() {
  if (coupons && redemptions) return;
  if (typeof window === "undefined") return;
  try {
    const savedCoupons = JSON.parse(window.localStorage.getItem(COUPONS_KEY) ?? "null");
    const savedRedemptions = JSON.parse(window.localStorage.getItem(REDEMPTIONS_KEY) ?? "null");
    coupons = Array.isArray(savedCoupons) ? savedCoupons : startingCoupons();
    redemptions = Array.isArray(savedRedemptions) ? savedRedemptions : makeRedemptions(coupons as Coupon[]);
  } catch {
    coupons = startingCoupons();
    redemptions = makeRedemptions(coupons);
  }
}

function getCoupons() {
  load();
  return coupons ?? EMPTY_COUPONS;
}

function getRedemptions() {
  load();
  return redemptions ?? EMPTY_REDEMPTIONS;
}

function save(newCoupons: Coupon[]) {
  coupons = newCoupons;
  try {
    window.localStorage.setItem(COUPONS_KEY, JSON.stringify(newCoupons));
    window.localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(getRedemptions()));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

export function getCouponStatus(coupon: Coupon, today = new Date()): CouponStatus {
  const todayKey = dayKey(today);
  if ((coupon.validTill && coupon.validTill < todayKey) || (coupon.usageLimit !== null && coupon.used >= coupon.usageLimit)) return "Expired";
  if (coupon.isPaused) return "Paused";
  if (coupon.validFrom > todayKey) return "Scheduled";
  return "Active";
}

export function addCoupon(coupon: Omit<Coupon, "used" | "isPaused">) {
  const newCoupon: Coupon = { ...coupon, used: 0, isPaused: false };
  save([newCoupon, ...getCoupons()]);
  return newCoupon;
}

// Edit: the code itself does not change (customers may already have it)
export function updateCoupon(code: string, changes: Partial<Omit<Coupon, "code" | "used">>) {
  save(getCoupons().map((coupon) => (coupon.code === code ? { ...coupon, ...changes } : coupon)));
}

export function removeCoupon(code: string) {
  save(getCoupons().filter((coupon) => coupon.code !== code));
}

/*
  Website checkout: what a code takes off this cart, or why it can't be used.
  cartLines: each item's amount (after its own discount) and its product category.
  - Must be Active (not paused, not scheduled, not ended or used up) and reach its minimum order.
  - "All products" counts the whole cart; a category counts only those items; "Milk plans" and free
    days of milk are for subscriptions, not one-time orders.
*/
export function checkCouponForCart(
  code: string,
  allCoupons: Coupon[],
  cartLines: { amount: number; category: string }[],
): { coupon: Coupon; discount: number } | { error: string } {
  const coupon = allCoupons.find((existing) => existing.code === code.trim().toUpperCase());
  if (!coupon) return { error: "This code doesn't exist" };
  const status = getCouponStatus(coupon);
  if (status === "Expired") return { error: `${coupon.code} has ended` };
  if (status === "Paused") return { error: `${coupon.code} can't be used right now` };
  if (status === "Scheduled") return { error: `${coupon.code} starts on ${coupon.validFrom.split("-").reverse().join("/")}` };
  if (coupon.appliesTo === "Milk plans" || coupon.kind === "free-days") {
    return { error: `${coupon.code} is for milk subscriptions, not one-time orders` };
  }
  const cartTotal = cartLines.reduce((sum, line) => sum + line.amount, 0);
  if (coupon.minOrder && cartTotal < coupon.minOrder) {
    return { error: `Add ₹${coupon.minOrder - cartTotal} more to use ${coupon.code} (minimum ₹${coupon.minOrder})` };
  }
  const eligible =
    coupon.appliesTo === "All products"
      ? cartTotal
      : cartLines.filter((line) => line.category === coupon.appliesTo).reduce((sum, line) => sum + line.amount, 0);
  if (eligible <= 0) return { error: `${coupon.code} is only for ${coupon.appliesTo.toLowerCase()}` };
  return { coupon, discount: getDiscount(coupon, eligible) };
}

/*
  Website checkout of a milk subscription: what a code takes off the plan, or why it can't be used.
  - Must be Active and reach its minimum order (the plan's total).
  - "All products", "Milk" and "Milk plans" codes work on plans; other categories (paneer, ghee...) don't.
  - Free days of milk: those days' bottles at the plan's price per litre.
*/
export function checkCouponForSubscription(
  code: string,
  allCoupons: Coupon[],
  plan: { planTotal: number; pricePerLitre: number; bottlesPerDay: number },
): { coupon: Coupon; discount: number } | { error: string } {
  const coupon = allCoupons.find((existing) => existing.code === code.trim().toUpperCase());
  if (!coupon) return { error: "This code doesn't exist" };
  const status = getCouponStatus(coupon);
  if (status === "Expired") return { error: `${coupon.code} has ended` };
  if (status === "Paused") return { error: `${coupon.code} can't be used right now` };
  if (status === "Scheduled") return { error: `${coupon.code} starts on ${coupon.validFrom.split("-").reverse().join("/")}` };
  if (!["All products", "Milk", "Milk plans"].includes(coupon.appliesTo)) {
    return { error: `${coupon.code} is only for ${coupon.appliesTo.toLowerCase()}, not milk plans` };
  }
  if (coupon.minOrder && plan.planTotal < coupon.minOrder) {
    return { error: `${coupon.code} needs an order of at least ₹${coupon.minOrder}` };
  }
  const discount =
    coupon.kind === "free-days"
      ? coupon.value * plan.bottlesPerDay * plan.pricePerLitre
      : getDiscount(coupon, plan.planTotal);
  return { coupon, discount: Math.min(discount, plan.planTotal) };
}

// A customer used the coupon at checkout: one more use, and a redemption for the panel's table
export function recordCouponUse(code: string, redemption: Omit<Redemption, "id" | "code" | "redeemedAt">) {
  const highest = Math.max(0, ...getRedemptions().map((existing) => Number(existing.id.replace(/\D/g, ""))));
  redemptions = [
    { ...redemption, id: `RD-${highest + 1}`, code, redeemedAt: new Date().toISOString() },
    ...getRedemptions(),
  ];
  save(getCoupons().map((coupon) => (coupon.code === code ? { ...coupon, used: coupon.used + 1 } : coupon)));
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useCoupons() {
  return useSyncExternalStore(subscribe, getCoupons, () => EMPTY_COUPONS);
}

export function useRedemptions() {
  return useSyncExternalStore(subscribe, getRedemptions, () => EMPTY_REDEMPTIONS);
}
