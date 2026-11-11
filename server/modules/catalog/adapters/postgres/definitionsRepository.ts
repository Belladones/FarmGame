import type { Connection, Definitions } from "./connection.js";
import { seedAssetTypes, readAssetTypes } from "./definitions/assetTypes.js";
import { seedCrops, readCrops } from "./definitions/crops.js";
import { seedRecipes, readRecipes } from "./definitions/recipes.js";
import { seedEquipment, readEquipment } from "./definitions/equipment.js";
import { seedTradeOrders, readTradeOrders } from "./definitions/commerce.js";
import { seedCosmetics, readCosmetics } from "./definitions/cosmetics.js";
import { seedProgression, readProgression } from "./definitions/progression.js";
export async function seedDefinitions(db: Connection, d: Definitions) {
  await seedAssetTypes(db, d);
  await seedCrops(db, d);
  await seedRecipes(db, d);
  await seedEquipment(db, d);
  await seedTradeOrders(db, d);
  await seedCosmetics(db, d);
  await seedProgression(db, d);
}
/** This connection belongs to the caller's repeatable-read catalogue transaction. */
export async function readDefinitions(db: Connection): Promise<Definitions> {
  return {
    ...(await readAssetTypes(db)),
    crops: await readCrops(db),
    recipes: await readRecipes(db),
    ...(await readEquipment(db)),
    tradeOrders: await readTradeOrders(db),
    cosmetics: await readCosmetics(db),
    ...(await readProgression(db)),
  };
}
