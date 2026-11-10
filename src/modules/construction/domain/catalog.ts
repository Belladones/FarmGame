import type { Inventory } from "../../../shared/domain/resources";
export type BuildingKind =
  | "Depot"
  | "Well"
  | "Cistern"
  | "Mill"
  | "Oven"
  | "Sawmill"
  | "Composter"
  | "Workshop";
export const buildings = {
  Depot: {
    name: "Dépôt",
    price: 500,
    research: "construction",
    description:
      "Stocke 200 unités ; améliorations individuelles jusqu’au niveau 10, capacité et prix ×4.",
  },
  Well: {
    name: "Puits",
    price: 300,
    research: "reservoir",
    description:
      "Produit 1 eau/s. Chaque amélioration locale double le débit ; réserve de 100 unités.",
  },
  Cistern: {
    name: "Citerne",
    price: 200,
    research: "reservoir",
    description:
      "Ajoute 400 unités au réseau d’eau connecté ; chaque amélioration locale multiplie cette réserve par 4. Ne produit pas d’eau.",
  },
  Mill: {
    name: "Moulin",
    price: 500,
    research: "milling",
    description:
      "5 blés → 1 farine en 6 secondes. Livrez les ingrédients puis récupérez la production.",
  },
  Oven: {
    name: "Four",
    price: 1000,
    research: "bakery",
    description: "2 farines + 1 bois → 1 pain en 10 secondes.",
  },
  Sawmill: {
    name: "Scierie",
    price: 750,
    research: "sawmill",
    description: "5 bois → 2 planches en 10 secondes.",
  },
  Composter: {
    name: "Composteur",
    price: 750,
    research: "composting",
    description: "5 blés + 2 carottes → 1 engrais en 12 secondes.",
  },
  Workshop: {
    name: "Atelier",
    price: 500,
    research: "workshop",
    description:
      "Reconstruit une carcasse pour 40 % du prix neuf : fermier 200 or, transporteur 200 or, drone 400 or.",
  },
} as const;
export const recipes: Partial<
  Record<
    BuildingKind,
    { input: Inventory; output: Inventory; duration: number }
  >
> = {
  Mill: { input: { Wheat: 5 }, output: { Flour: 1 }, duration: 6 },
  Oven: { input: { Flour: 2, Wood: 1 }, output: { Bread: 1 }, duration: 10 },
  Sawmill: { input: { Wood: 5 }, output: { Plank: 2 }, duration: 10 },
  Composter: {
    input: { Wheat: 5, Carrot: 2 },
    output: { Fertilizer: 1 },
    duration: 12,
  },
};
export const constructionSlots = [
  [-1, 0],
  [0, -1],
  [1, -1],
  [2, -1],
  [-1, 1],
  [-1, 2],
  [3, -1],
  [4, -1],
  [-1, 3],
  [-1, 4],
  [5, -1],
  [6, -1],
  [-1, 5],
  [-1, 6],
  [7, -1],
  [-1, 7],
].map(([x, y]) => ({ x, y }));
