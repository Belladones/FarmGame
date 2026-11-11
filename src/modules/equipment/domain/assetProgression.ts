import bootstrap from "../../../shared/domain/bootstrap.json";
import type { Inventory } from "../../../shared/domain/resources";
import type { Model } from "../../robots/domain/catalog";
import type { BuildingKind } from "../../construction/domain/catalog";
export interface UpgradeSpec {
  id: string;
  name: string;
  initial: number;
  max: number;
  materials: Inventory;
  gold?: number;
  research?: string;
  models?: readonly Model[];
  kinds?: readonly BuildingKind[];
  detail: string;
}
export type UpgradeLevels = Record<string, number>;
export const robotEquipment: UpgradeSpec[] = structuredClone(
  bootstrap.definitions.robotEquipment,
) as UpgradeSpec[];
export const buildingUpgrades: UpgradeSpec[] = structuredClone(
  bootstrap.definitions.buildingUpgrades,
) as UpgradeSpec[];
export const upgradeCost = (spec: UpgradeSpec, current: number) => {
  const factor = 4 ** Math.max(0, current - spec.initial);
  return {
    materials: Object.fromEntries(
      Object.entries(spec.materials).map(([id, n]) => [id, n! * factor]),
    ) as Inventory,
    gold: (spec.gold ?? 0) * factor,
  };
};
export const upgradeLevel = (
  levels: UpgradeLevels | undefined,
  spec: UpgradeSpec,
) => levels?.[spec.id] ?? spec.initial;
export const retiredResearch = (id: string) =>
  /^(storage(?:[2-9]|10)|hold[23]|motor[23]|tools[23]|milling[2-5]|bakery[2-5]|reservoir[2-5]|mechanization2?|maintenance)$/.test(
    id,
  );
