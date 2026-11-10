import type { Inventory } from "../../../shared/domain/resources";
import type { BuildingKind } from "./catalog";
import type { UpgradeLevels } from "../../equipment/domain/assetProgression";
export interface Building {
  upgrades?: UpgradeLevels;
  capacityFloor?: number;
  productionFloor?: number;
  waterCapacityFloor?: number;
  id: string;
  kind: BuildingKind;
  x: number;
  y: number;
  paid: number;
  inventory: Inventory;
  input: Inventory;
  output: Inventory;
  water: number;
  cycle?: { ends: number };
}
