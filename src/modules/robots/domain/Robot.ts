import type { Inventory } from "../../../shared/domain/resources";
import type { Model } from "./catalog";
import type { UpgradeLevels } from "../../equipment/domain/assetProgression";
export interface Robot {
  equipment?: UpgradeLevels;
  baseCapacity?: number;
  actionFloor?: number;
  id: string;
  model: Model;
  x: number;
  y: number;
  inventory: Inventory;
  water: number;
  code: string;
  paid: number;
  loan: boolean;
  destroyed: boolean;
  deployed: boolean;
  lastError?: string;
  readyAt: number;
  moving?: {
    x: number;
    y: number;
    fromX: number;
    fromY: number;
    started: number;
    ends: number;
  };
  reservation?: { x: number; y: number; expires: number };
}
