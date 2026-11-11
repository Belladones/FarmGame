import { storageCapacities } from "../../research/domain/researchBalance";
import type { Farm } from "../../farm/domain/model";
import type { Building } from "./Building";
import { level } from "../../research/domain/levels";
export const depotCapacity = (
  s: Farm,
  b: Building = s.buildings.find((b) => b.kind === "Depot")!,
) =>
  s.assetProgression === 1
    ? Math.max(
        b?.capacityFloor ?? 0,
        storageCapacities[
          Math.min(
            storageCapacities.length - 1,
            Math.max(0, (b?.upgrades?.storage ?? 1) - 1),
          )
        ] ?? 200,
      )
    : Math.max(
        [200, 200, 500, 2500, 10000][Math.min(4, level(s, "storage", 10))] ??
          200,
        [
          200, 400, 2000, 10000, 50000, 250000, 1250000, 6250000, 31250000,
          156250000,
        ][Math.max(0, level(s, "storage", 10) - 1)],
      );
export const stockCapacity = (s: Farm) =>
  s.buildings
    .filter((b) => b.kind === "Depot")
    .reduce((total, b) => total + depotCapacity(s, b), 0);
