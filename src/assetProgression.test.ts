import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fresh,
  upgradeAsset,
  assetUpgradeBlocker,
  capacity,
  robotSpeed,
  actionDuration,
  depotCapacity,
  stockCapacity,
  command,
  advance,
  hydrateFarm,
  buy,
  type Farm,
  type Building,
  purchaseForInventory,
} from "./engine";
import { research } from "./catalog";
import {
  robotEquipment,
  upgradeCost,
  buildingUpgrades,
} from "./assetProgression";
import { validFarm } from "../server/validation";
const clone = <T>(value: T): T => structuredClone(value);
function setup() {
  const s = fresh();
  s.unlocks = research.filter((r) => !r.localOnly).map((r) => r.id);
  s.sites.push({ x: 0, y: -1 });
  s.buildings.push({
    ...clone(s.buildings[0]),
    id: "atelier",
    kind: "Workshop",
    x: 0,
    y: -1,
    inventory: {},
  });
  return s;
}
function fund(s: Farm, resources: Farm["resources"], gold = 0) {
  s.stock = 0;
  s.resources = { ...resources };
  s.gold = gold;
}
test("tree production doubles while upgrade prices quadruple to exactly 19.6608M hay", () => {
  for (let n = 2; n <= 10; n++) {
    const r = research.find((r) => r.id === "tree" + n)!;
    assert.equal(r.materials.Hay, 300 * 4 ** (n - 2));
    assert.match(r.detail, new RegExp(String(5 * 2 ** (n - 1))));
  }
  assert.equal(
    research.find((r) => r.id === "tree10")!.materials.Hay,
    19660800,
  );
});
test("equipment is local, a second robot stays at base capacity and workshop tiers gate access", () => {
  const s = setup();
  s.robots.push({ ...clone(s.robots[0]), id: "f2", deployed: false });
  const spec = robotEquipment.find((e) => e.id === "hold")!;
  assert.equal(capacity(s, s.robots[0]), 20);
  fund(s, upgradeCost(spec, 1).materials);
  assert.equal(upgradeAsset(s, "robot", "f1", "hold"), true);
  assert.equal(capacity(s, s.robots[0]), 40);
  assert.equal(capacity(s, s.robots[1]), 20);
  assert.equal(s.resources.Wood, 0);
  assert.equal(s.resources.Hay, 0);
  assert.match(assetUpgradeBlocker(s, "robot", "f1", "hold")!, /atelier/);
  fund(s, {}, 500);
  assert.equal(upgradeAsset(s, "building", "b1", "storage"), true);
  assert.equal(depotCapacity(s), 800);
  fund(s, { Wood: 200, Carrot: 100 });
  assert.equal(upgradeAsset(s, "building", "atelier", "workshop"), true);
  fund(s, upgradeCost(spec, 2).materials);
  assert.equal(upgradeAsset(s, "robot", "f1", "hold"), true);
  assert.equal(capacity(s), 80);
  const loaded = hydrateFarm(JSON.parse(JSON.stringify(s)));
  assert.equal(capacity(loaded), 80);
  assert.equal(capacity(loaded, loaded.robots[1]), 20);
  assert.equal(validFarm(JSON.parse(JSON.stringify(loaded))), true);
});
test("upgrade failures are atomic, require an atelier and reject incompatible equipment", () => {
  const s = fresh();
  s.unlocks.push("hold");
  fund(s, { Wood: 100, Hay: 50 });
  const before = clone(s);
  assert.equal(upgradeAsset(s, "robot", "f1", "hold"), false);
  assert.deepEqual(s.resources, before.resources);
  const equipped = setup();
  equipped.robots[0].moving = {
    x: 0,
    y: 0,
    fromX: 0,
    fromY: 0,
    started: 0,
    ends: 1,
  };
  fund(equipped, { Wood: 100, Hay: 50 });
  assert.equal(upgradeAsset(equipped, "robot", "f1", "hold"), false);
  assert.equal(equipped.resources.Wood, 100);
  delete equipped.robots[0].moving;
  equipped.robots[0].model = "Transporter";
  assert.equal(upgradeAsset(equipped, "robot", "f1", "tools"), false);
  assert.equal(buy(equipped, "storage2"), false);
  assert.equal(buy(equipped, "tools2"), false);
});
test("depots have individual capacities with gold-only prices x4", () => {
  const s = setup();
  s.sites.push({ x: 1, y: -1 });
  s.buildings.push({
    ...clone(s.buildings[0]),
    id: "depot2",
    x: 1,
    y: -1,
    inventory: {},
  });
  assert.equal(stockCapacity(s), 400);
  fund(s, {}, 500);
  assert.equal(upgradeAsset(s, "building", "b1", "storage"), true);
  assert.equal(s.gold, 0);
  assert.equal(depotCapacity(s, s.buildings[0]), 800);
  assert.equal(depotCapacity(s, s.buildings[2]), 200);
  assert.equal(stockCapacity(s), 1000);
  fund(s, {}, 2000);
  assert.equal(upgradeAsset(s, "building", "b1", "storage"), true);
  assert.equal(depotCapacity(s), 3200);
  const spec = buildingUpgrades.find((e) => e.id === "storage")!;
  assert.equal(upgradeCost(spec, 9).gold, 32768000);
});
test("identical mills run at independent rates without free ingredients", () => {
  const s = setup();
  const template = clone(s.buildings[0]);
  for (let i = 0; i < 2; i++)
    s.buildings.push({
      ...clone(template),
      id: "mill" + i,
      kind: "Mill",
      x: i + 1,
      y: -1,
      input: { Wheat: 5 },
      inventory: {},
      output: {},
      upgrades: i ? {} : { production: 2 },
    });
  advance(s, 0);
  assert.equal(s.buildings[2].cycle?.ends, 3);
  assert.equal(s.buildings[3].cycle?.ends, 6);
  advance(s, 3);
  assert.equal(s.buildings[2].output.Flour, 1);
  assert.equal(s.buildings[3].output.Flour ?? 0, 0);
  advance(s, 3);
  assert.equal(s.produced.Flour, 2);
});
test("physical sensors belong to one robot and the passive water reserve is bounded", () => {
  const s = setup();
  s.robots.push({ ...clone(s.robots[0]), id: "f2", deployed: false });
  fund(s, { Hay: 50, Wood: 10 });
  assert.throws(() => command(s, "can_harvest", []), /capteur/);
  assert.equal(upgradeAsset(s, "robot", "f1", "sensor"), true);
  assert.equal(command(s, "can_harvest", []), true);
  s.robots[1].deployed = true;
  assert.throws(() => command(s, "can_harvest", [], "f2"), /capteur/);
  s.robots[1].deployed = false;
  advance(s, 100);
  assert.equal(s.waterItems, 10);
});
test("old global upgrades migrate onto owned assets but newly purchased units start at baseline", () => {
  const raw = JSON.parse(JSON.stringify(fresh()));
  delete raw.assetProgression;
  raw.unlocks.push(
    "hold3",
    "motor3",
    "tools3",
    "storage4",
    "sensor",
    "milling3",
  );
  raw.buildings.push({
    ...clone(raw.buildings[0]),
    id: "mill",
    kind: "Mill",
    x: 0,
    y: -1,
    input: {},
    output: {},
  });
  raw.sites.push({ x: 0, y: -1 });
  const s = hydrateFarm(raw);
  assert.equal(s.assetProgression, 1);
  assert.ok(capacity(s) >= 160);
  assert.ok(depotCapacity(s) >= 10000);
  assert.ok(actionDuration(s) <= 0.4);
  assert.ok(robotSpeed(s) >= 2);
  assert.equal(s.robots[0].equipment?.sensor, 1);
  assert.equal(s.buildings[1].productionFloor, 4);
  s.unlocks.push("fleet");
  s.gold = 500;
  assert.equal(purchaseForInventory(s, "Farmer"), true);
  assert.equal(capacity(s, s.robots.at(-1)!), 20);
  const repeat = hydrateFarm(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(repeat.robots[0].equipment, s.robots[0].equipment);
});
test("water application upgrades conserve water and wells gain only their own production", () => {
  const s = setup();
  s.waterItems = 0;
  s.robots[0].water = 0.8;
  s.robots[0].equipment = { application: 2 };
  assert.equal(command(s, "watering", []), true);
  assert.ok(Math.abs(s.robots[0].water) < 1e-9);
  assert.equal(s.tiles[0].water, 0.25);
  const first: Building = {
    ...clone(s.buildings[0]),
    id: "well1",
    kind: "Well",
    x: 1,
    y: -1,
    inventory: {},
    water: 0,
    upgrades: { waterRate: 2 },
  };
  const second = { ...clone(first), id: "well2", x: 2, upgrades: {} };
  s.buildings.push(first, second);
  advance(s, 1);
  assert.equal(first.water + second.water, 3);
});

test("motors, tools, tanks and transfer timing improve only the paid robot", () => {
  const s = setup();
  s.robots.push({ ...clone(s.robots[0]), id: "f2", deployed: false });
  s.buildings[0].upgrades = { storage: 3 };
  s.buildings[1].upgrades = { workshop: 3 };
  for (const [id, cost] of [
    ["motor", { Wood: 150, Carrot: 50 }],
    ["tools", { Wood: 100, Carrot: 100 }],
    ["handling", { Wood: 200, Carrot: 50 }],
    ["tank", { Wood: 100, Carrot: 50 }],
  ] as const) {
    fund(s, cost);
    assert.equal(upgradeAsset(s, "robot", "f1", id), true, id);
  }
  assert.equal(robotSpeed(s, s.robots[0]), 2.5);
  assert.equal(robotSpeed(s, s.robots[1]), 2);
  assert.equal(actionDuration(s, s.robots[0]), 0.4);
  assert.equal(actionDuration(s, s.robots[1]), 0.5);
  command(s, "deposit", []);
  assert.equal(s.robots[0].readyAt, s.time + 0.25);
  s.robots[1].deployed = true;
  command(s, "deposit", [], "f2");
  assert.equal(s.robots[1].readyAt, s.time + 0.5);
});

test("fractional application can empty the last tank water instead of trapping a robot with an unusable remainder", () => {
  const s = setup();
  s.waterItems = 0;
  s.robots[0].water = 0.1;
  s.robots[0].equipment = { application: 2 };
  assert.equal(command(s, "watering", []), true);
  assert.equal(s.robots[0].water, 0);
  assert.ok(Math.abs(s.tiles[0].water! - 0.03125) < 1e-9);
});

test("migration preserves an explicit legacy depot floor even when its historic flag is missing", () => {
  const raw = JSON.parse(JSON.stringify(fresh()));
  delete raw.assetProgression;
  raw.legacyDepotCapacity = 2500;
  const s = hydrateFarm(raw);
  assert.ok(depotCapacity(s) >= 2500);
  assert.ok(s.buildings[0].capacityFloor! >= 2500);
});

test("legacy campaigns with local assets do not require retired global upgrade flags", async () => {
  const { missionsFor } = await import("./missions");
  const s = setup();
  s.progressionVersion = 1;
  const goal = missionsFor(s).find((m) => m.id === "construction")!;
  assert.equal(goal.progress(s), 2);
  fund(s, {}, 500);
  assert.equal(upgradeAsset(s, "building", "b1", "storage"), true);
  assert.equal(goal.progress(s), 3);
  assert.equal(s.unlocks.includes("storage2"), false);
});

test("migration carries industrial speed to sawmills and keeps the next local level useful", () => {
  const raw = JSON.parse(JSON.stringify(fresh()));
  delete raw.assetProgression;
  raw.unlocks.push("mechanization2");
  raw.buildings.push({
    ...clone(raw.buildings[0]),
    id: "scierie",
    kind: "Sawmill",
    x: 0,
    y: -1,
    input: {},
    output: {},
  });
  raw.sites.push({ x: 0, y: -1 });
  const s = hydrateFarm(raw);
  assert.equal(s.buildings[1].productionFloor, 2);
  assert.equal(s.buildings[1].upgrades?.production, 2);
});
