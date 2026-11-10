export const itemNames = {
  Hay: "Foin",
  Wheat: "Blé",
  Wood: "Bois",
  Carrot: "Carotte",
  Pumpkin: "Citrouille",
  Flour: "Farine",
  Bread: "Pain",
  Plank: "Planche",
  Fertilizer: "Engrais",
} as const;
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
