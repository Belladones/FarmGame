import { legacyFarm as fresh } from "../tests/fixtures";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advance,
  buy,
  configureSite,
  siteBlocker,
  purchaseForInventory,
  placeBuilding,
  storeBuilding,
  storeBuildingBlocker,
  stockCapacity,
  hydrateFarm,
  deployRobot,
  recallRobot,
  robotPlacementBlocker,
  type Farm,
} from "./modules/farm/application/engine";
import { validFarm } from "../server/validation";
const saved = (s: Farm) => JSON.parse(JSON.stringify(s));
function equipped() {
  const s = fresh();
  s.gold = 3000;
  s.unlocks.push("construction", "land", "milling", "fleet");
  return s;
}
test("new purchases stay in inventory without free land and do not supply storage or collide", () => {
  const s = equipped();
  assert.equal(purchaseForInventory(s, "Depot"), true);
  assert.equal(s.storedBuildings.length, 1);
  assert.equal(stockCapacity(s), 200);
  assert.equal(s.gold, 2500);
  assert.equal(purchaseForInventory(s, "Farmer"), true);
  assert.equal(s.robots[1].deployed, false);
  advance(s, 1);
  assert.equal(s.robots.filter((r) => r.destroyed).length, 0);
  assert.equal(s.robots.length, 2);
});
test("terrain placement uses credits, prevents future crop overlap and keeps support connections", () => {
  const s = equipped();
  s.unlocks.push("land2");
  assert.equal(configureSite(s, { x: 0, y: -1 }, false, false), false);
  assert.equal(configureSite(s, { x: 0, y: -1 }, false, true), true);
  assert.equal(configureSite(s, { x: 1, y: -1 }, false, true), true);
  assert.equal(configureSite(s, { x: 1, y: 0 }, false, true), false);
  assert.match(siteBlocker(s, { x: 0, y: -1 }, true)!, /relie/);
  assert.equal(configureSite(s, { x: 1, y: -1 }, true, true), true);
  assert.equal(configureSite(s, { x: 0, y: -1 }, true, true), true);
  assert.equal(s.sites.length, 1);
  const plain = fresh();
  assert.equal(configureSite(plain, { x: 0, y: -1 }, false, true), false);
});
test("buildings can be placed, stored and reinstalled without payment or identity loss", () => {
  const s = equipped();
  configureSite(s, { x: 0, y: -1 }, false, true);
  purchaseForInventory(s, "Depot");
  const id = s.storedBuildings[0].id,
    gold = s.gold;
  assert.equal(placeBuilding(s, id, { x: 0, y: -1 }, true), true);
  assert.equal(stockCapacity(s), 400);
  assert.equal(configureSite(s, { x: 0, y: -1 }, true, true), false);
  assert.equal(storeBuilding(s, id, true), true);
  assert.equal(stockCapacity(s), 200);
  assert.equal(s.storedBuildings[0].paid, 500);
  assert.equal(placeBuilding(s, id, { x: 0, y: -1 }, true), true);
  assert.equal(s.gold, gold);
  assert.equal(s.buildings[1].id, id);
});
test("nonempty buildings, water, cycles, moving robots and reservations block removal or construction", () => {
  const s = equipped();
  s.stock = 1;
  assert.equal(storeBuilding(s, "b1", true), false);
  assert.equal(s.stock, 1);
  s.stock = 0;
  advance(s, 0);
  s.buildings[0].water = 1;
  assert.ok(storeBuildingBlocker(s, "b1"));
  s.buildings[0].water = 0;
  s.buildings[0].cycle = { ends: 10 };
  assert.equal(storeBuilding(s, "b1", true), false);
  delete s.buildings[0].cycle;
  s.robots[0].reservation = { x: 0, y: -1, expires: 10 };
  assert.equal(configureSite(s, { x: 0, y: -1 }, false, true), false);
  delete s.robots[0].reservation;
  configureSite(s, { x: 0, y: -1 }, false, true);
  purchaseForInventory(s, "Depot");
  s.robots[0].reservation = { x: 0, y: -1, expires: 10 };
  assert.equal(
    placeBuilding(s, s.storedBuildings[0].id, { x: 0, y: -1 }, true),
    false,
  );
});
test("saving an entirely stored farm does not recreate or duplicate the starter depot", () => {
  const s = fresh();
  assert.equal(storeBuilding(s, "b1", true), true);
  assert.equal(configureSite(s, { x: -1, y: 0 }, true, true), true);
  assert.equal(validFarm(saved(s)), true);
  const loaded = hydrateFarm(saved(s));
  assert.equal(loaded.buildings.length, 0);
  assert.equal(loaded.storedBuildings.length, 1);
  assert.equal(loaded.sites.length, 0);
  assert.equal(configureSite(loaded, { x: 0, y: -1 }, false, true), true);
  assert.equal(placeBuilding(loaded, "b1", { x: 0, y: -1 }, true), true);
  assert.equal(stockCapacity(loaded), 200);
  const invalid = saved(loaded);
  invalid.sites.push({ ...invalid.sites[0] });
  assert.equal(validFarm(invalid), false);
});
test("legacy saves retain their original construction positions and buildings", () => {
  const raw = saved(fresh());
  delete raw.sites;
  delete raw.storedBuildings;
  raw.unlocks.push("land");
  const migrated = hydrateFarm(raw);
  assert.deepEqual(migrated.sites, [
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ]);
  assert.equal(migrated.buildings[0].id, "b1");
  assert.deepEqual(migrated.storedBuildings, []);
});
test("robots deploy on the chosen cell and honor reservations", () => {
  const s = equipped();
  s.stock = 25;
  s.resources.Hay = 30;
  buy(s, "extension");
  purchaseForInventory(s, "Farmer");
  const id = s.robots[1].id;
  s.robots[0].reservation = { x: 1, y: 0, expires: 10 };
  assert.ok(robotPlacementBlocker(s, id, { x: 1, y: 0 }));
  assert.equal(deployRobot(s, id, { x: 1, y: 0 }), false);
  delete s.robots[0].reservation;
  assert.equal(deployRobot(s, id, { x: 1, y: 0 }), true);
  assert.equal(s.robots[1].x, 1);
});
test("deploying an inventory farmer retires a rescue loan while preserving its cargo and code", () => {
  const s = equipped();
  s.robots[0].destroyed = true;
  s.robots[0].deployed = false;
  advance(s, 0);
  const loan = s.robots.find((r) => r.loan)!;
  loan.inventory.Wood = 2;
  loan.code = "// secours";
  purchaseForInventory(s, "Farmer");
  const next = s.robots.find((r) => !r.loan && !r.destroyed)!;
  recallRobot(s, loan.id);
  assert.equal(deployRobot(s, next.id, { x: 0, y: 0 }), true);
  assert.equal(
    s.robots.some((r) => r.loan),
    false,
  );
  assert.equal(next.inventory.Wood, 2);
  assert.equal(next.code, "// secours");
});
