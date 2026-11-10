import type { Inventory, Item } from "../../../shared/domain/resources";
export const cropData = {
  Grass: {
    resource: "Hay",
    seconds: 0.5,
    soil: "Any",
    cost: {},
    unlock: null,
    yields: Array.from({ length: 10 }, (_, i) => 2 ** i),
  },
  Wheat: {
    resource: "Wheat",
    seconds: 5,
    soil: "Any",
    cost: {},
    unlock: "wheat-base",
    yields: [1, 5, 12, 30, 75],
  },
  Bush: {
    resource: "Wood",
    seconds: 4,
    soil: "Any",
    cost: {},
    unlock: "bush",
    yields: Array.from({ length: 10 }, (_, i) => 2 ** i),
  },
  Carrot: {
    resource: "Carrot",
    seconds: 6,
    soil: "Soil",
    cost: { Hay: 1, Wood: 1 },
    unlock: "carrot",
    yields: Array.from({ length: 10 }, (_, i) => 2 ** i),
  },
  Tree: {
    resource: "Wood",
    seconds: 7,
    soil: "Any",
    cost: {},
    unlock: "tree",
    yields: Array.from({ length: 10 }, (_, i) => 5 * 2 ** i),
  },
  Pumpkin: {
    resource: "Pumpkin",
    seconds: 25,
    soil: "Soil",
    cost: { Carrot: 3, Wood: 2 },
    unlock: "pumpkin",
    yields: Array.from({ length: 10 }, (_, i) => 4 * 2 ** i),
  },
} satisfies Record<
  string,
  {
    resource: Item;
    seconds: number;
    soil: string;
    cost: Inventory;
    unlock: string | null;
    yields: number[];
  }
>;
