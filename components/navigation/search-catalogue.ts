/*
  What the navigation bar's search can find, until real product data exists.
  Each entry: the name shown in the results, a short label, a picture, and extra words people
  might type (so "ghee", "turmeric" or "haldi" all find the right item).
  Picking a result opens its product page (productSlug), or the All products page when it has none yet.
*/

export type SearchCatalogueItem = {
  name: string;
  label: string;
  imageSource: string;
  imageWidth: number;
  imageHeight: number;
  extraSearchWords: string;
  productSlug?: string; // /products/<productSlug>
};

export const searchCatalogue: SearchCatalogueItem[] = [
  {
    name: "A2 Desi Milk",
    productSlug: "a2-desi-milk",
    label: "Milk",
    imageSource: "/images/products/a2-cow-milk-1-litre-bottle.webp",
    imageWidth: 232,
    imageHeight: 500,
    extraSearchWords: "milk cow a2 desi dairy fresh bottle litre",
  },
  {
    name: "A2 Desi Ghee",
    productSlug: "a2-desi-ghee",
    label: "Ghee",
    imageSource: "/images/products/desi-ghee-jar-chiranvi-farm.webp",
    imageWidth: 1524,
    imageHeight: 2204,
    extraSearchWords: "ghee cow a2 desi jar pure",
  },
  {
    name: "Fresh Cow Paneer",
    productSlug: "fresh-cow-paneer",
    label: "Paneer",
    imageSource: "/images/products/fresh-paneer-200g-box.webp",
    imageWidth: 604,
    imageHeight: 444,
    extraSearchWords: "paneer cottage cheese fresh cow",
  },
  {
    name: "Butter",
    productSlug: "desi-white-butter",
    label: "Butter",
    imageSource: "/images/categories/butter-category.webp",
    imageWidth: 412,
    imageHeight: 272,
    extraSearchWords: "butter white makhan dairy",
  },
  {
    name: "Flours",
    productSlug: "whole-wheat-atta",
    label: "Flours",
    imageSource: "/images/categories/flours-category-chiranvi-farm.webp",
    imageWidth: 412,
    imageHeight: 276,
    extraSearchWords: "flour flours atta ragi jowar millet",
  },
  {
    name: "Batter",
    productSlug: "batter-powder",
    label: "Batter",
    imageSource: "/images/categories/batter-category-chiranvi-farm.webp",
    imageWidth: 372,
    imageHeight: 248,
    extraSearchWords: "batter green gram moong dosa idli",
  },
  {
    name: "Moringa Powder",
    label: "Powders",
    imageSource: "/images/products/moringa-leaves-powder-pouch.webp",
    imageWidth: 336,
    imageHeight: 516,
    extraSearchWords: "moringa drumstick leaves powder homemade",
  },
  {
    name: "Turmeric Powder",
    label: "Powders",
    imageSource: "/images/products/turmeric-powder-pouch.webp",
    imageWidth: 360,
    imageHeight: 548,
    extraSearchWords: "turmeric haldi powder spice homemade",
  },
  {
    name: "Red Chilli Powder",
    label: "Powders",
    imageSource: "/images/products/red-chilli-powder-pouch.webp",
    imageWidth: 360,
    imageHeight: 548,
    extraSearchWords: "red chilli chili mirchi powder spice homemade",
  },
];

// Items whose name, label or extra words contain every typed word (capital letters ignored).
export function findCatalogueItems(searchText: string) {
  const typedWords = searchText.toLowerCase().split(/\s+/).filter(Boolean);
  if (typedWords.length === 0) return [];
  return searchCatalogue.filter((catalogueItem) => {
    const searchableText = `${catalogueItem.name} ${catalogueItem.label} ${catalogueItem.extraSearchWords}`.toLowerCase();
    return typedWords.every((typedWord) => searchableText.includes(typedWord));
  });
}
