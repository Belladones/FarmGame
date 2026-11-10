import type { Item } from "../../../shared/domain/resources";
export const salePrices: Record<Item, number> = {
  Hay: 1,
  Wheat: 1,
  Wood: 3,
  Carrot: 5,
  Pumpkin: 12,
  Flour: 8,
  Bread: 25,
  Plank: 12,
  Fertilizer: 18,
};
export const tradeOrders = [
  {
    id: "village",
    name: "Le marché du village",
    item: "Wheat",
    quantity: 100,
    payment: 110,
    unlock: null,
  },
  {
    id: "carpenter",
    name: "Le charpentier",
    item: "Wood",
    quantity: 30,
    payment: 100,
    unlock: "bush",
  },
  {
    id: "soup",
    name: "La soupe du jour",
    item: "Carrot",
    quantity: 20,
    payment: 135,
    unlock: "carrot",
  },
  {
    id: "bakery",
    name: "La boulangerie du village",
    item: "Bread",
    quantity: 10,
    payment: 275,
    unlock: "bakery",
  },
  {
    id: "renovation",
    name: "La rénovation de la grange",
    item: "Plank",
    quantity: 20,
    payment: 265,
    unlock: "sawmill",
  },
] satisfies {
  id: string;
  name: string;
  item: Item;
  quantity: number;
  payment: number;
  unlock: string | null;
}[];
