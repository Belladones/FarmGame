import bootstrap from "./bootstrap.json";
export const itemNames = Object.fromEntries(
  bootstrap.resources.map((r) => [r.id, r.name]),
) as Record<
  | "Hay"
  | "Wheat"
  | "Wood"
  | "Carrot"
  | "Pumpkin"
  | "Flour"
  | "Bread"
  | "Plank"
  | "Fertilizer",
  string
>;
export type Item = keyof typeof itemNames;
export type Inventory = Partial<Record<Item, number>>;
export const formatCost = (cost: Inventory) =>
  Object.entries(cost)
    .map(
      ([k, v]) =>
        `${v >= 1000000 ? new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(v) : v.toLocaleString("fr-FR")} ${itemNames[k as Item].toLowerCase()}${["Wood", "Fertilizer"].includes(k) ? "" : "s"}`,
    )
    .join(" + ") || "Gratuit";
export const sum = (inventory: Inventory) =>
  Object.values(inventory).reduce((a, b) => a + (b ?? 0), 0);
export const items = Object.keys(itemNames) as Item[];
