import { useSyncExternalStore } from "react";

/*
  The row of five products under every product page, set in the Chiranvi Panel (Products & pricing →
  Product rows), until the database is connected:
    - "Fast selling products": one list for every page except the noodles, pasta and macaroni ones.
    - "You may also like": one list each for the Instant Noodles, Pasta and Macaroni pages. Besides fixed
      products, a slot can be "another flavour" of the page's own product, or the page's own flavour of
      another product ("same flavour" Pasta on Beetroot Noodles = Beetroot Pasta).
  A page can also have its own order (Edit page → "Product row on this page"), which it uses instead.
  The page's own product never shows in its row; a slot whose product is gone is skipped, and the page fills
  the row up to five (see FastSellingRow in components/product/one-time-product-page.tsx).
  Saved in this browser (and shared through the dev server's sync, as every chiranvi-admin- key).
*/

export type NoodlesKind = "instant-noodles" | "pasta" | "macaroni";
export const NOODLES_KINDS: NoodlesKind[] = ["instant-noodles", "pasta", "macaroni"];
export const NOODLES_KIND_NAMES: Record<NoodlesKind, string> = { "instant-noodles": "Instant Noodles", pasta: "Pasta", macaroni: "Macaroni" };
export const NOODLES_FLAVOURS = ["carrot", "beetroot", "tomato", "palak", "ragi", "millet"];

// A slot: a product address ("a2-desi-milk"), "other-flavour", or "same-flavour:pasta"
export type RowSlot = string;
export const OTHER_FLAVOUR_SLOT = "other-flavour";
export const sameFlavourSlot = (kind: NoodlesKind) => `same-flavour:${kind}`;

export type ProductRows = {
  fastSelling: RowSlot[];
  youMayAlsoLike: Record<NoodlesKind, RowSlot[]>;
};

export const ROW_SIZE = 5;

// The rows as they were before the panel could change them
export const DEFAULT_PRODUCT_ROWS: ProductRows = {
  fastSelling: ["a2-desi-ghee", "fresh-cow-paneer", "batter-powder", "desi-white-butter", "a2-desi-milk"],
  youMayAlsoLike: {
    "instant-noodles": [OTHER_FLAVOUR_SLOT, OTHER_FLAVOUR_SLOT, sameFlavourSlot("pasta"), sameFlavourSlot("macaroni"), "a2-desi-milk"],
    pasta: [OTHER_FLAVOUR_SLOT, OTHER_FLAVOUR_SLOT, sameFlavourSlot("instant-noodles"), sameFlavourSlot("macaroni"), "a2-desi-ghee"],
    macaroni: [OTHER_FLAVOUR_SLOT, OTHER_FLAVOUR_SLOT, sameFlavourSlot("pasta"), sameFlavourSlot("instant-noodles"), "a2-desi-milk"],
  },
};

const STORAGE_KEY = "chiranvi-admin-product-rows";
let productRows: ProductRows | null = null;
const listeners = new Set<() => void>();

function getProductRows(): ProductRows {
  if (productRows) return productRows;
  if (typeof window === "undefined") return DEFAULT_PRODUCT_ROWS;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    productRows = saved && Array.isArray(saved.fastSelling) ? { ...DEFAULT_PRODUCT_ROWS, ...saved, youMayAlsoLike: { ...DEFAULT_PRODUCT_ROWS.youMayAlsoLike, ...saved.youMayAlsoLike } } : DEFAULT_PRODUCT_ROWS;
  } catch {
    productRows = DEFAULT_PRODUCT_ROWS;
  }
  return productRows as ProductRows;
}

export function saveProductRows(rows: ProductRows) {
  productRows = rows;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Storage blocked: the rows last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Saved in another tab, or by another browser through the shared-data sync
  function followOtherTabs(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    productRows = null;
    onChange();
  }
  window.addEventListener("storage", followOtherTabs);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", followOtherTabs);
  };
}

export function useProductRows() {
  return useSyncExternalStore(subscribe, getProductRows, () => DEFAULT_PRODUCT_ROWS);
}

// "beetroot-pasta" → its kind and flavour; any other page: null
export function noodlesPageOf(slug: string): { kind: NoodlesKind; flavour: string } | null {
  const kind = NOODLES_KINDS.find((oneKind) => slug.endsWith(`-${oneKind}`));
  const flavour = kind ? slug.slice(0, -(kind.length + 1)) : "";
  return kind && NOODLES_FLAVOURS.includes(flavour) ? { kind, flavour } : null;
}

/*
  The product addresses a page's row lists, in order, and which heading it has. The page's own override
  wins; otherwise the shared list for its kind of page. "Another flavour" slots take the next flavours in
  order; "same flavour" of the page's own product counts as another flavour.
*/
export function productRowFor(currentSlug: string, rows: ProductRows, override?: RowSlot[]) {
  const noodlesPage = noodlesPageOf(currentSlug);
  const slots = override?.length ? override : noodlesPage ? rows.youMayAlsoLike[noodlesPage.kind] : rows.fastSelling;
  const slugs: string[] = [];
  const nextOtherFlavour = () => {
    if (!noodlesPage) return null;
    const flavour = NOODLES_FLAVOURS.find(
      (oneFlavour) => oneFlavour !== noodlesPage.flavour && !slugs.includes(`${oneFlavour}-${noodlesPage.kind}`),
    );
    return flavour ? `${flavour}-${noodlesPage.kind}` : null;
  };
  slots.forEach((slot) => {
    let slug: string | null = slot;
    if (slot === OTHER_FLAVOUR_SLOT) slug = nextOtherFlavour();
    else if (slot.startsWith("same-flavour:")) {
      const kind = slot.slice("same-flavour:".length);
      slug = !noodlesPage ? null : kind === noodlesPage.kind ? nextOtherFlavour() : `${noodlesPage.flavour}-${kind}`;
    }
    if (slug && slug !== currentSlug && !slugs.includes(slug)) slugs.push(slug);
  });
  return { slugs, isYouMayAlsoLike: Boolean(noodlesPage) };
}
