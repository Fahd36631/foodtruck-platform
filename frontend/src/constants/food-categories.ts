/** Same food types as home discovery filters (excluding "الكل"). */
export const FOOD_CATEGORIES = [
  { key: "burger", label: "برجر", match: ["برجر", "burger"] },
  { key: "shawarma", label: "شاورما", match: ["شاورما", "shawarma"] },
  { key: "coffee", label: "قهوة", match: ["قهوة", "coffee", "كوفي"] },
  { key: "sweets", label: "حلى", match: ["حلى", "حلو", "sweet"] },
  { key: "pizza", label: "بيتزا", match: ["بيتزا", "pizza"] }
] as const;

export const FOOD_CATEGORY_OPTIONS = FOOD_CATEGORIES.map((item) => item.label);
