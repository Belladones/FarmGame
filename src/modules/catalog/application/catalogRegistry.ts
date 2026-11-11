import {
  defaultCatalog,
  validateCatalog,
  type GameCatalog,
} from "../../../shared/domain/gameCatalog";
import { itemNames, items, type Item } from "../../../shared/domain/resources";
import { salePrices, tradeOrders } from "../../commerce/domain/catalog";
import { models } from "../../robots/domain/catalog";
import {
  buildings,
  recipes,
  constructionSlots,
} from "../../construction/domain/catalog";
import { cropData } from "../../farm/domain/crops";
import {
  robotEquipment,
  buildingUpgrades,
  type UpgradeSpec,
} from "../../equipment/domain/assetProgression";
import { research, type Research } from "../../research/domain/catalog";
import { installResearchGroups } from "../../research/domain/researchGroups";
import { storageCapacities } from "../../research/domain/researchBalance";
import {
  chapters,
  installMissions,
  careerRanks,
  careerThresholds,
} from "../../missions/domain/missions";
import { cosmetics, type Cosmetic } from "../../companion/domain/companion";
let current: GameCatalog = structuredClone(defaultCatalog);
const replaceObject = (target: object, next: object) => {
  for (const key of Object.keys(target))
    delete (target as Record<string, unknown>)[key];
  Object.assign(target, structuredClone(next));
};
const replaceArray = <T>(target: T[], next: T[]) =>
  target.splice(0, target.length, ...structuredClone(next));
/** Install once before UI/worker initialization. Existing references stay valid. */
export function installCatalog(input: unknown) {
  validateCatalog(input);
  const c = structuredClone(input);
  replaceObject(
    itemNames,
    Object.fromEntries(c.resources.map((r) => [r.id, r.name])),
  );
  replaceObject(
    salePrices,
    Object.fromEntries(c.resources.map((r) => [r.id, r.salePrice])),
  );
  replaceArray(
    items,
    c.resources.map((r) => r.id as Item),
  );
  replaceArray(research, c.research as Research[]);
  installResearchGroups(c.groups);
  replaceObject(models, c.definitions.models);
  replaceObject(buildings, c.definitions.buildings);
  replaceObject(recipes, c.definitions.recipes);
  replaceObject(cropData, c.definitions.crops);
  replaceArray(robotEquipment, c.definitions.robotEquipment as UpgradeSpec[]);
  replaceArray(
    buildingUpgrades,
    c.definitions.buildingUpgrades as UpgradeSpec[],
  );
  replaceArray(tradeOrders, c.definitions.tradeOrders as typeof tradeOrders);
  replaceArray(constructionSlots, c.definitions.constructionSlots);
  replaceArray(storageCapacities, c.definitions.storageCapacities);
  replaceArray(cosmetics, c.definitions.cosmetics as Cosmetic[]);
  replaceArray(chapters, c.chapters);
  installMissions(c.campaigns);
  replaceArray(careerRanks, c.definitions.ranks);
  replaceArray(careerThresholds, c.definitions.thresholds);
  current = c;
}
export const getCatalog = () => structuredClone(current);
export const catalogVersion = () => current.version;
