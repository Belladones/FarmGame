import { DEFAULT_PROGRAM } from "../../farm/domain/constants";
import { fresh } from "../../farm/domain/factories";
import type { Farm } from "../../farm/domain/model";
export function hasLocalProgress(farm: Farm): boolean {
  const baseline = fresh();
  const hasItems = (inventory: Record<string, number | undefined>) =>
    Object.values(inventory).some((n) => (n ?? 0) > 0);
  return (
    !!farm.previousProgram ||
    farm.planted > 0 ||
    farm.harvested > 0 ||
    farm.gold > 0 ||
    farm.stock > 0 ||
    farm.unlocks.some((id) => !baseline.unlocks.includes(id)) ||
    hasItems(farm.resources) ||
    farm.width !== baseline.width ||
    farm.height !== baseline.height ||
    farm.claimed.length > 0 ||
    farm.robots.length > 1 ||
    farm.buildings.length > 1 ||
    farm.storedBuildings.length > 0 ||
    farm.robots.some(
      (r) =>
        r.code !== DEFAULT_PROGRAM ||
        !r.deployed ||
        r.destroyed ||
        hasItems(r.inventory),
    ) ||
    farm.tiles.some(
      (t) =>
        (t.ground ?? "Grassland") !== "Grassland" ||
        (t.entity !== undefined && t.entity !== "Grass"),
    ) ||
    farm.companion.skin !== baseline.companion.skin ||
    farm.companion.accessory !== baseline.companion.accessory ||
    farm.companion.unlocked.some(
      (id) => !baseline.companion.unlocked.includes(id),
    )
  );
}
