import { test } from "node:test";
import assert from "node:assert/strict";
import {
  research,
  cropData,
  salePrices,
  models,
  buildings,
  sum,
} from "./catalog";
import {
  fresh,
  buy,
  command,
  advance,
  capacity,
  depotCapacity,
  hydrateFarm,
  researchBlocker,
} from "./engine";
import { researchDepth } from "./researchTrees";
import { validFarm } from "../server/validation";
const entry = (id: string) => research.find((r) => r.id === id)!;
function fund(s: ReturnType<typeof fresh>, id: string) {
  const r = entry(id);
  s.resources = { ...r.materials };
  s.stock = r.materials.Wheat ?? 0;
  s.gold = r.goldCost ?? 0;
}
test("explicit workbook costs and category dependencies are respected", () => {
  for (const [id, cost] of Object.entries({
    loops: { Hay: 5 },
    speed: { Hay: 20 },
    plant: { Hay: 50 },
    move: { Hay: 30 },
    bush: { Hay: 50 },
    carrot: { Wood: 50 },
    tree: { Wood: 50, Carrot: 70 },
    grass2: { Hay: 300 },
    carrot2: { Wood: 250 },
    carrot3: { Wood: 1250 },
    watering: { Wood: 50 },
    watering2: { Wood: 200 },
    watering3: { Wood: 800 },
    conditions: { Hay: 150, Wood: 10 },
    print: { Hay: 150, Wood: 50 },
    variables: { Wood: 100, Carrot: 150 },
    sensor: { Hay: 50, Wood: 10 },
    consumables: { Wood: 50 },
    humidity: { Carrot: 15 },
    position: { Wood: 50, Carrot: 50 },
    analysis: { Wood: 100, Carrot: 50 },
    extension: { Hay: 30 },
    extension3: { Wood: 20 },
  }))
    assert.deepEqual(entry(id).materials, cost, id);
  assert.equal(entry("storage2").goldCost, 500);
  assert.equal(models.Farmer.price, 500);
  assert.equal(models.Transporter.price, 500);
  assert.equal(buildings.Depot.price, 500);
  assert.equal(salePrices.Carrot, 5);
  assert.equal(capacity(fresh()), 20);
  for (const r of research) {
    assert.ok(researchDepth(r.id) > 0);
    for (const parent of r.prerequisites) assert.ok(entry(parent), parent);
  }
});
test("a real fresh farm can advance from hay to wood and buy storage without wheat", () => {
  const s = fresh();
  for (const id of ["loops", "speed", "extension", "move", "plant", "bush"]) {
    fund(s, id);
    assert.equal(buy(s, id), true, id);
  }
  assert.equal(s.width, 3);
  assert.equal(s.height, 1);
  command(s, "move", ["West"]);
  advance(s, 0.5);
  assert.equal(s.x, 2);
  command(s, "move", ["East"]);
  advance(s, 0.5);
  assert.equal(s.x, 0);
  assert.equal(command(s, "plant", ["Bush"]), true);
  advance(s, 4.8);
  command(s, "harvest", []);
  command(s, "deposit", []);
  assert.equal(s.resources.Wood, 1);
  assert.equal(s.stock, 0);
  fund(s, "construction");
  assert.equal(buy(s, "construction"), true);
  s.gold = 499;
  assert.match(researchBlocker(s, "storage2")!, /Or insuffisant/);
  s.gold = 500;
  assert.equal(buy(s, "storage2"), true);
  assert.equal(s.gold, 0);
  assert.equal(depotCapacity(s), 400);
  assert.equal(buy(s, "storage2"), false);
});
test("carrot seeds consume exactly one hay and one wood, and trees are free on either soil", () => {
  const s = fresh();
  s.unlocks.push("plant", "carrot", "tree");
  command(s, "till", []);
  s.robots[0].inventory = { Hay: 1, Wood: 1 };
  assert.equal(command(s, "plant", ["Carrot"]), true);
  assert.equal(sum(s.robots[0].inventory), 0);
  advance(s, 7.2);
  command(s, "harvest", []);
  assert.equal(s.robots[0].inventory.Carrot, 1);
  assert.equal(command(s, "plant", ["Tree"]), true);
  assert.equal(s.tiles[0].yield, 5);
});
test("blank crop tiers double yields and continue research prices by five, without instant changing existing crops", () => {
  const s = fresh();
  const before = s.tiles[0].yield;
  s.unlocks.push("loops", "construction", "storage2");
  fund(s, "grass2");
  assert.equal(buy(s, "grass2"), true);
  assert.equal(s.tiles[0].yield, before);
  command(s, "harvest", []);
  advance(s, 0.5);
  assert.equal(s.tiles[0].yield, 2);
  for (const base of ["grass", "bush", "carrot", "tree", "pumpkin"])
    for (let n = 3; n <= 10; n++)
      assert.equal(
        sum(entry(base + n).materials),
        5 * sum(entry(base + (n - 1)).materials),
      );
  assert.equal(cropData.Grass.yields[9], 512);
  assert.equal(cropData.Tree.yields[9], 2560);
});
test("passive water survives reload, levels double rate and use_item accepts bounded repetitions", () => {
  const s = fresh();
  s.unlocks.push("watering", "consumables", "plant", "carrot", "humidity");
  advance(s, 9.9);
  assert.equal(s.waterItems, 0);
  advance(s, 0.1);
  assert.equal(s.waterItems, 1);
  const loaded = hydrateFarm(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.waterItems, 1);
  loaded.unlocks.push("watering2");
  advance(loaded, 10);
  assert.equal(loaded.waterItems, 3);
  assert.equal(command(loaded, "get_inventory", ["Water"]), 3);
  assert.equal(command(loaded, "use_item", ["Water", 2]), true);
  assert.equal(loaded.waterItems, 1);
  assert.equal(loaded.tiles[0].water, 0.5);
  advance(loaded, 1);
  assert.ok(Math.abs(loaded.tiles[0].water! - 0.495) < 1e-10);
  assert.throws(
    () => command(loaded, "use_item", ["Water", -1]),
    /entier positif/,
  );
  assert.equal(validFarm(JSON.parse(JSON.stringify(loaded))), true);
});
test("watering growth is invariant to simulation step size", () => {
  const s = fresh();
  s.unlocks.push("plant", "carrot");
  command(s, "till", []);
  s.robots[0].inventory = { Hay: 1, Wood: 1 };
  command(s, "plant", ["Carrot"]);
  s.tiles[0].water = 1;
  const fine = structuredClone(s);
  advance(s, 0.5);
  for (let i = 0; i < 10; i++) advance(fine, 0.05);
  assert.ok(Math.abs(s.tiles[0].progress! - fine.tiles[0].progress!) < 1e-10);
  assert.ok(s.tiles[0].progress! > 0.3);
});
test("all nine expansion steps reach a valid 10x10 farm without losing a crop", () => {
  const s = fresh();
  const first = s.tiles[0];
  s.unlocks = research
    .filter((r) => !r.id.startsWith("extension"))
    .map((r) => r.id);
  for (const id of [
    "extension",
    ...Array.from({ length: 8 }, (_, i) => "extension" + (i + 3)),
  ]) {
    fund(s, id);
    assert.equal(buy(s, id), true, id);
    assert.equal(s.tiles[0], first);
  }
  assert.equal(s.tiles.length, 100);
  assert.equal(s.width, 10);
  assert.equal(s.height, 10);
  assert.equal(validFarm(JSON.parse(JSON.stringify(s))), true);
  assert.equal(hydrateFarm(JSON.parse(JSON.stringify(s))).width, 10);
});

test("four orthogonal tree neighbors multiply growth time by sixteen", () => {
  const s = fresh();
  s.width = 3;
  s.height = 3;
  s.tiles = Array.from({ length: 9 }, () => ({
    planted: null,
    yield: 1,
    ground: "Grassland" as const,
    water: 0,
    progress: 0,
  }));
  s.tiles[4] = {
    planted: 0,
    entity: "Tree",
    yield: 5,
    ground: "Grassland",
    water: 0,
    progress: 0,
  };
  const spaced = structuredClone(s);
  for (const i of [1, 3, 5, 7]) s.tiles[i] = { ...s.tiles[4] };
  advance(s, 1);
  advance(spaced, 1);
  assert.ok(
    Math.abs(spaced.tiles[4].progress! - 16 * s.tiles[4].progress!) < 1e-10,
  );
});
test("wrapping occupancy and reservations inspect the same destination as move", () => {
  const s = fresh();
  s.width = 3;
  s.tiles = Array.from({ length: 3 }, () => structuredClone(s.tiles[0]));
  s.unlocks.push("move", "traffic", "traffic2");
  const other = structuredClone(s.robots[0]);
  other.id = "f2";
  other.x = 2;
  s.robots.push(other);
  assert.equal(command(s, "is_occupied", ["West"]), true);
  assert.equal(command(s, "reserve", ["West"]), false);
  other.x = 1;
  assert.equal(command(s, "reserve", ["West"]), true);
  assert.equal(s.robots[0].reservation?.x, 2);
});

test("machine tier upgrades shorten cycles without giving free ingredients or output", () => {
  const s = fresh();
  s.unlocks.push("milling", "milling2");
  s.sites.push({ x: 0, y: -1 });
  s.buildings.push({
    ...structuredClone(s.buildings[0]),
    id: "mill",
    kind: "Mill",
    x: 0,
    y: -1,
    inventory: {},
    input: { Wheat: 5 },
    output: {},
  });
  advance(s, 0);
  const mill = s.buildings[1];
  assert.equal(mill.cycle?.ends, 3);
  assert.equal(mill.input.Wheat, 0);
  advance(s, 2.99);
  assert.equal(mill.output.Flour ?? 0, 0);
  advance(s, 0.01);
  assert.equal(mill.output.Flour, 1);
  advance(s, 20);
  assert.equal(mill.output.Flour, 1);
  assert.equal(s.produced.Flour, 1);
});

test("existing saves migrate without relocking program calls or reducing purchased storage", () => {
  const raw = JSON.parse(JSON.stringify(fresh()));
  delete raw.researchRevision;
  raw.unlocks.push("storage2");
  raw.robots[0].code = "plant(Entities.Bush); move(Direction.East);";
  const loaded = hydrateFarm(raw);
  assert.equal(loaded.researchRevision, 2);
  assert.ok(loaded.unlocks.includes("plant"));
  assert.ok(loaded.unlocks.includes("move"));
  assert.equal(depotCapacity(loaded), 500);
  assert.equal(loaded.robots[0].code, raw.robots[0].code);
  assert.equal(validFarm(JSON.parse(JSON.stringify(loaded))), true);
});

test("wrapping does not make adjacent empty construction sites unreachable", () => {
  const s = fresh();
  s.unlocks.push("move");
  s.sites.push({ x: 0, y: -1 });
  assert.equal(command(s, "move", ["South"]), true);
  advance(s, 1);
  assert.equal(s.y, -1);
  assert.equal(command(s, "move", ["North"]), true);
  advance(s, 1);
  assert.equal(s.y, 0);
});
