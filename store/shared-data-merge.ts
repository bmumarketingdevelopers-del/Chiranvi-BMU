/*
  Merging two saved copies of the same data (used by the shared-data server and by a browser's first
  sync), so a change made in one browser is not lost when another browser saves too:
  - lists of records (orders, customers, products …): one list with every record, matched by its ID
    (the first copy wins where both have the same record), in the first copy's order, then the rest;
  - records keyed by name (customer profiles by mobile number …): every key, the first copy winning;
  - anything else: the first copy.
*/

const ID_FIELDS = ["id", "orderNumber", "orderId", "productId", "slug", "code", "customerId", "mobileNumber"];

// A record's mobile number, when it has one (two people never share a record, even with the same ID)
const PHONE_FIELDS = ["phone", "primaryMobile", "customerMobile"];

function recordId(record: unknown): string | null {
  if (!record || typeof record !== "object") return null;
  for (const field of ID_FIELDS) {
    const value = (record as Record<string, unknown>)[field];
    if (typeof value === "string" || typeof value === "number") {
      const phoneField = PHONE_FIELDS.find((name) => typeof (record as Record<string, unknown>)[name] === "string");
      const phone = phoneField ? String((record as Record<string, unknown>)[phoneField]).replace(/\D/g, "") : "";
      return `${field}:${value}${phone ? `|${phone}` : ""}`;
    }
  }
  return null;
}

// first and second are the saved texts (JSON); returns the merged text
export function mergeSharedValues(first: string, second: string): string {
  let firstValue: unknown;
  let secondValue: unknown;
  try {
    firstValue = JSON.parse(first);
    secondValue = JSON.parse(second);
  } catch {
    return first;
  }
  if (Array.isArray(firstValue) && Array.isArray(secondValue)) {
    // Only lists whose records all have an ID can be merged safely
    if (![...firstValue, ...secondValue].every((record) => recordId(record) !== null)) return first;
    const firstIds = new Set(firstValue.map(recordId));
    return JSON.stringify([...firstValue, ...secondValue.filter((record) => !firstIds.has(recordId(record)))]);
  }
  const isPlainObject = (value: unknown) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  if (isPlainObject(firstValue) && isPlainObject(secondValue)) {
    return JSON.stringify({ ...(secondValue as object), ...(firstValue as object) });
  }
  return first;
}
