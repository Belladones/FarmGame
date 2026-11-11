import bootstrap from "../../../shared/domain/bootstrap.json";
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
export const buildings = structuredClone(bootstrap.definitions.buildings);
export const recipes: Partial<
  Record<
    BuildingKind,
    { input: Inventory; output: Inventory; duration: number }
  >
> = structuredClone(bootstrap.definitions.recipes);
export const constructionSlots = structuredClone(
  bootstrap.definitions.constructionSlots,
);
