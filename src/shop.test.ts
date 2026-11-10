import { legacyFarm as fresh } from "../tests/fixtures";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buy,
  configureSite,
  purchase,
  sellStock,
  command,
  advance,
  capacity,
  stockCapacity,
  totalStock,
  getStock,
  activeRobot,
  selectRobot,
  fulfillOrder,
  resellAsset,
  repair,
  hydrateFarm,
  relocateBuilding,
  at,
  releaseReservation,
} from "./modules/farm/application/engine";
import { research } from "./modules/research/domain/catalog";
import { buildings, constructionSlots } from "./modules/construction/domain/catalog";
import { models } from "./modules/robots/domain/catalog";
import { sum } from "./shared/domain/resources";
function prepared() {
  const s = fresh();
  s.stock = 100;
  s.resources.Hay = 30;
  buy(s, "extension");
  s.unlocks = research
    .map((r) => r.id)
    .filter(
      (id) => !/^(speed|milling[2-5]|bakery[2-5]|reservoir[3-5])$/.test(id),
    );
  s.sites = structuredClone(constructionSlots);
  s.gold = 5000;
  s.stock = 100;
  s.resources = { Wood: 50, Carrot: 20 };
  return s;
}
test("initial farmer is terrestrial, free, with a 10-unit hold and a free 200-unit depot", () => {
  const s = fresh();
  assert.equal(activeRobot(s).model, "Farmer");
  assert.equal(models.Farmer.medium, "ground");
  assert.equal(capacity(s), 10);
  assert.equal(s.gold, 0);
  assert.equal(s.robots[0].paid, 0);
  assert.equal(stockCapacity(s), 200);
});
test("selling only consumes deposited goods, at the documented price, and rejects invalid quantities", () => {
  const s = fresh();
  s.stock = 20;
  s.cargo = 7;
  assert.equal(sellStock(s, "Wheat", 10), 10);
  assert.equal(s.gold, 10);
  assert.equal(s.stock, 10);
  assert.equal(s.cargo, 7);
  assert.throws(() => sellStock(s, "Wheat", -1));
  assert.throws(() => sellStock(s, "Wheat", 1.5));
  assert.equal(s.gold, 10);
  assert.equal(sellStock(s, "Wood", 10), 0);
  assert.throws(() => sellStock(s, "Water" as never, 1));
});
test("research consumes materials once; buildings consume gold only and require a free bought site", () => {
  const s = fresh();
  s.unlocks = ["bush"];
  s.stock = 100;
  s.resources = { Wood: 50 };
  assert.equal(buy(s, "construction"), true);
  assert.equal(s.stock, 100);
  assert.equal(getStock(s, "Wood"), 30);
  s.gold = 600;
  assert.equal(purchase(s, "Depot"), false);
  s.unlocks.push("land");
  assert.equal(configureSite(s, { x: 0, y: -1 }, false, true), true);
  assert.equal(purchase(s, "Depot", 1, { x: 0, y: -1 }), true);
  assert.equal(s.gold, 100);
  assert.equal(s.stock, 100);
  assert.equal(getStock(s, "Wood"), 30);
  assert.equal(stockCapacity(s), 400);
  assert.equal(purchase(s, "Depot", 1, { x: 0, y: -1 }), false);
  assert.equal(s.gold, 100);
  assert.equal(buy(s, "construction"), false);
});
test("catalogue purchases remain atomic when locked, unaffordable or storage is full", () => {
  const s = fresh();
  s.gold = 2000;
  assert.equal(purchase(s, "Farmer"), false);
  assert.equal(purchase(s, "Drone"), false);
  assert.equal(purchase(s, "Fertilizer"), false);
  assert.equal(s.gold, 2000);
  s.unlocks.push("consumables");
  s.stock = 200;
  assert.equal(purchase(s, "Fertilizer"), false);
  assert.equal(s.gold, 2000);
  s.stock = 190;
  assert.equal(purchase(s, "Fertilizer", 1.5), false);
  assert.equal(purchase(s, "Fertilizer", 2), true);
  assert.equal(s.gold, 1950);
  assert.equal(getStock(s, "Fertilizer"), 2);
});
test("purchased fertilizer costs 25 and sells for 18, without an arbitrage loop", () => {
  const s = fresh();
  s.unlocks = ["consumables"];
  s.gold = 25;
  assert.equal(purchase(s, "Fertilizer"), true);
  assert.equal(s.gold, 0);
  assert.equal(sellStock(s, "Fertilizer", 1), 1);
  assert.equal(s.gold, 18);
  assert.equal(purchase(s, "Fertilizer"), false);
});
test("each purchased robot has its own inventory and a valid spawn; transporters and drones cannot farm", () => {
  const s = prepared();
  assert.equal(purchase(s, "Farmer"), true);
  const second = s.robots[1];
  assert.equal(second.x, 1);
  assert.equal(command(s, "plant", ["Bush"], second.id), true);
  assert.equal(command(s, "plant", ["Wheat"], "f1"), true);
  advance(s, 8);
  assert.equal(command(s, "harvest", [], second.id), true);
  assert.equal(second.inventory.Wood, 8);
  assert.equal(s.cargo, 0);
  assert.equal(purchase(s, "Transporter"), true);
  assert.equal(purchase(s, "Drone"), true);
  const transport = s.robots.find((r) => r.model === "Transporter")!,
    drone = s.robots.find((r) => r.model === "Drone")!;
  assert.equal(capacity({ ...s, unlocks: [] } as typeof s, transport), 100);
  assert.equal(command(s, "harvest", [], transport.id), false);
  assert.equal(command(s, "plant", ["Wheat"], drone.id), false);
  assert.equal(command(s, "till", [], drone.id), false);
  assert.equal(models.Drone.speed, 2);
});
test("head-on ground swaps destroy both robots and cargo, retain code, and lend exactly one slower farmer", () => {
  const s = prepared();
  purchase(s, "Farmer");
  const second = s.robots[1];
  s.cargo = 3;
  s.robots[0].code = 'print("conservé");';
  const gold = s.gold,
    stock = s.stock;
  command(s, "move", ["East"], "f1");
  command(s, "move", ["West"], second.id);
  advance(s, 1);
  assert.equal(s.robots.filter((r) => r.destroyed).length, 2);
  assert.equal(s.robots[0].inventory.Wheat, undefined);
  assert.equal(s.robots[0].code, 'print("conservé");');
  assert.equal(s.gold, gold);
  assert.equal(s.stock, stock);
  const loan = s.robots.find((r) => r.loan)!;
  assert.equal(loan.model, "Farmer");
  assert.equal(resellAsset(s, loan.id), false);
  command(s, "plant", ["Wheat"], loan.id);
  assert.equal(loan.readyAt, s.time + 0.8);
  advance(s, 1);
  assert.equal(s.robots.filter((r) => r.loan && !r.destroyed).length, 1);
});
test("workshop repairs one existing wreck for 40% of new price and retires the loan", () => {
  const s = prepared();
  purchase(s, "Workshop", 1, { x: 0, y: -1 });
  purchase(s, "Farmer");
  command(s, "move", ["East"], "f1");
  command(s, "move", ["West"], s.robots[1].id);
  advance(s, 1);
  const before = s.gold,
    loan = s.robots.find((r) => r.loan)!;
  selectRobot(s, loan.id);
  s.cargo = 3;
  assert.equal(repair(s, "f1"), true);
  assert.equal(s.gold, before - 200);
  assert.equal(s.robots.find((r) => r.id === "f1")?.destroyed, false);
  assert.equal(
    s.robots.some((r) => r.loan),
    false,
  );
  assert.equal(s.cargo, 3);
  assert.equal(repair(s, "f1"), false);
  assert.equal(s.gold, before - 200);
});
test("intact purchased assets resell at 50% and nonempty cargo prevents accidental loss", () => {
  const s = prepared();
  purchase(s, "Farmer");
  const r = s.robots[1];
  const before = s.gold;
  assert.equal(resellAsset(s, r.id), true);
  assert.equal(s.gold, before + 250);
  purchase(s, "Drone");
  const d = s.robots.find((r) => r.model === "Drone")!;
  d.inventory.Wood = 1;
  assert.equal(resellAsset(s, d.id), false);
});
test("mill inputs are consumed at cycle start; output must be collected and deposited before sale", () => {
  const s = fresh();
  s.stock = 20;
  s.gold = 500;
  s.unlocks = ["construction", "milling", "land"];
  configureSite(s, { x: 0, y: -1 }, false, true);
  assert.equal(purchase(s, "Mill", 1, { x: 0, y: -1 }), true);
  assert.equal(command(s, "load", ["Wheat", 5]), 5);
  assert.equal(command(s, "deliver", ["South", "Wheat", 5]), 5);
  const mill = s.buildings.find((b) => b.kind === "Mill")!;
  assert.equal(mill.input.Wheat, 0);
  assert.equal(mill.cycle?.ends, 6);
  assert.equal(s.stock, 15);
  advance(s, 5.9);
  assert.equal(mill.output.Flour ?? 0, 0);
  advance(s, 0.1);
  assert.equal(mill.output.Flour, 1);
  assert.equal(sellStock(s, "Flour", 1), 0);
  assert.equal(command(s, "collect", ["South", "Flour", 1]), 1);
  assert.equal(getStock(s, "Flour"), 0);
  assert.equal(command(s, "deposit", []), 1);
  assert.equal(sellStock(s, "Flour", 1), 1);
  assert.equal(s.gold, 8);
});
test("a full output buffer prevents ingredient consumption and transfers obey 50-unit buffers", () => {
  const s = prepared();
  purchase(s, "Mill", 1, { x: 0, y: -1 });
  const mill = s.buildings.find((b) => b.kind === "Mill")!;
  mill.input.Wheat = 5;
  mill.output.Flour = 50;
  advance(s, 20);
  assert.equal(mill.input.Wheat, 5);
  assert.equal(mill.cycle, undefined);
  assert.equal(command(s, "deliver", ["South", "Wood", 1]), 0);
});
test("all four recipes follow the document and mechanization does not change yields", () => {
  for (const [kind, input, output, units, seconds] of [
    ["Mill", { Wheat: 5 }, "Flour", 1, 6],
    ["Oven", { Flour: 2, Wood: 1 }, "Bread", 1, 10],
    ["Sawmill", { Wood: 5 }, "Plank", 2, 10],
    ["Composter", { Wheat: 5, Carrot: 2 }, "Fertilizer", 1, 12],
  ] as const) {
    const s = prepared();
    purchase(s, kind, 1, { x: 0, y: -1 });
    const b = s.buildings.find((b) => b.kind === kind)!;
    b.input = { ...input };
    advance(s, 0);
    assert.equal(b.cycle?.ends, seconds * 0.5);
    advance(s, seconds * 0.5);
    assert.equal(b.output[output], units);
    assert.equal(sum(b.input), 0);
  }
});
test("connected cistern adds capacity without water production and fixed reservoir level 2 triples capacity", () => {
  const s = prepared();
  purchase(s, "Well", 1, { x: 0, y: -1 });
  purchase(s, "Cistern", 1, { x: 1, y: -1 });
  s.unlocks = s.unlocks.filter((id) => id !== "reservoir2");
  advance(s, 1);
  assert.equal(
    s.buildings.reduce((n, b) => n + b.water, 0),
    1,
  );
  advance(s, 999);
  assert.equal(
    s.buildings.reduce((n, b) => n + b.water, 0),
    500,
  );
  s.unlocks.push("reservoir2");
  advance(s, 1000);
  assert.equal(
    s.buildings.reduce((n, b) => n + b.water, 0),
    1500,
  );
  assert.equal(command(s, "refill_water", []), true);
  assert.equal(activeRobot(s).water, 10);
  assert.equal(sum(activeRobot(s).inventory), 0);
  assert.equal(
    s.buildings.reduce((n, b) => n + b.water, 0),
    1490,
  );
});
test("carrots require tilled soil and only consume seeds from the robot after a successful planting", () => {
  const s = fresh();
  s.unlocks = ["bush", "carrot", "till"];
  s.stock = 2;
  s.resources = { Wood: 1 };
  command(s, "load", ["Wheat", 2]);
  command(s, "load", ["Wood", 1]);
  assert.equal(command(s, "plant", ["Carrot"]), false);
  assert.equal(s.cargo, 2);
  assert.equal(activeRobot(s).inventory.Wood, 1);
  assert.equal(command(s, "till", []), true);
  assert.equal(command(s, "plant", ["Carrot"]), true);
  assert.equal(s.cargo, 0);
  assert.equal(activeRobot(s).inventory.Wood, 0);
  assert.equal(command(s, "till", []), false);
  advance(s, 10);
  assert.equal(command(s, "harvest", []), true);
  assert.equal(activeRobot(s).inventory.Carrot, 2);
});
test("watering and fertilizer do not consume supplies on invalid targets", () => {
  const s = prepared();
  activeRobot(s).water = 2;
  activeRobot(s).inventory.Fertilizer = 1;
  s.tiles[0].ground = "Soil";
  s.tiles[0].planted = null;
  delete s.tiles[0].entity;
  assert.equal(command(s, "use_item", ["Fertilizer"]), false);
  assert.equal(activeRobot(s).inventory.Fertilizer, 1);
  command(s, "plant", ["Wheat"]);
  assert.equal(command(s, "use_item", ["Fertilizer"]), true);
  assert.equal(s.tiles[0].progress, 0.5);
  s.tiles[0].water = 1;
  assert.equal(command(s, "watering", []), false);
  assert.equal(activeRobot(s).water, 2);
});
test("orders consume goods, pay only once per period, and become available after 600 simulation seconds", () => {
  const s = fresh();
  s.stock = 200;
  assert.equal(fulfillOrder(s, "village"), true);
  assert.equal(s.gold, 110);
  assert.equal(s.stock, 100);
  assert.equal(fulfillOrder(s, "village"), false);
  advance(s, 600);
  assert.equal(fulfillOrder(s, "village"), true);
  assert.equal(s.stock, 0);
  assert.equal(s.gold, 220);
});
test("buildings move only during a pause, empty and onto a free unlocked slot", () => {
  const s = prepared();
  purchase(s, "Mill", 1, { x: 0, y: -1 });
  const b = s.buildings.find((b) => b.kind === "Mill")!;
  assert.equal(relocateBuilding(s, b.id, { x: 1, y: -1 }, false), false);
  assert.equal(relocateBuilding(s, b.id, { x: 1, y: -1 }, true), true);
  b.input.Wheat = 1;
  assert.equal(relocateBuilding(s, b.id, { x: 2, y: -1 }, true), false);
});
test("reservation prevents another ground robot entering until release or expiry", () => {
  const s = prepared();
  purchase(s, "Farmer");
  const second = s.robots[1];
  second.x = 2;
  assert.equal(command(s, "reserve", ["East"], "f1"), true);
  assert.equal(command(s, "move", ["West"], second.id), false);
  releaseReservation(s, "f1");
  assert.equal(command(s, "reserve", ["East"], "f1"), true);
  advance(s, 5);
  assert.equal(s.robots[0].reservation, undefined);
});
test("legacy saves retain wheat, old overcapacity cargo, coordinates and code while adopting the terrestrial model", () => {
  const old = { ...fresh() } as Record<string, unknown>;
  delete old.robots;
  delete old.buildings;
  delete old.resources;
  delete old.height;
  old.stock = 195;
  old.cargo = 17;
  const s = hydrateFarm(old, "harvest();");
  assert.equal(capacity(s), 10);
  assert.equal(s.cargo, 17);
  assert.equal(s.stock, 195);
  assert.equal(activeRobot(s).code, "harvest();");
  assert.equal(command(s, "deposit", []), 5);
  assert.equal(s.cargo, 12);
  assert.equal(s.stock, 200);
});
test("expanding to 4×4 preserves crops and robot coordinates", () => {
  const s = prepared();
  s.unlocks = s.unlocks.filter(
    (id) => !["extension3", "extension4"].includes(id),
  );
  s.stock = 5000;
  s.resources = { Wood: 1000, Carrot: 200 };
  assert.equal(buy(s, "extension3"), true);
  const old = at(s, 2, 2)!;
  old.entity = "Tree";
  old.planted = 0;
  old.yield = 5;
  selectRobot(s, "f1");
  s.x = 2;
  s.y = 2;
  assert.equal(buy(s, "extension4"), true);
  assert.equal(s.width, 4);
  assert.equal(s.height, 4);
  assert.equal(at(s, 2, 2), old);
  assert.equal(s.x, 2);
  assert.equal(s.y, 2);
  assert.equal(s.tiles.length, 16);
});
test("aerial robots coexist with ground robots, but two drones collide", () => {
  const s = prepared();
  purchase(s, "Drone");
  purchase(s, "Drone");
  const drones = s.robots.filter((r) => r.model === "Drone");
  advance(s, 0);
  assert.equal(s.robots[0].destroyed, false);
  assert.equal(drones[0].destroyed, false);
  command(s, "move", ["West"], drones[1].id);
  advance(s, 1);
  assert.equal(drones[0].destroyed, true);
  assert.equal(drones[1].destroyed, true);
  assert.equal(s.robots[0].destroyed, false);
  assert.equal(
    s.robots.some((r) => r.loan),
    false,
  );
});
test("group harvest applies the pumpkin bonus once, then preserves remaining harvest", () => {
  const s = prepared();
  s.unlocks = s.unlocks.filter((id) => id !== "extension3");
  s.stock = 200;
  s.resources = { Wood: 50 };
  buy(s, "extension3");
  s.unlocks = s.unlocks.filter((id) => id !== "group2");
  for (const [x, y] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ]) {
    const t = at(s, x, y)!;
    Object.assign(t, {
      planted: s.time,
      entity: "Pumpkin",
      yield: 4,
      level: 1,
      progress: 1,
      updatedAt: s.time,
      grouped: false,
    });
  }
  assert.equal(command(s, "harvest_group", []), true);
  assert.equal(activeRobot(s).inventory.Pumpkin, 6);
  assert.equal(at(s, 1, 0)?.yield, 6);
  assert.equal(at(s, 1, 0)?.grouped, true);
  assert.equal(command(s, "harvest_group", []), false);
  assert.equal(at(s, 1, 0)?.yield, 6);
});
test("loading locked goods fails visibly and leaves stocks unchanged", () => {
  const s = fresh();
  s.resources = { Wood: 2 };
  assert.throws(() => command(s, "load", ["Wood", 1]), /Buisson/);
  assert.equal(getStock(s, "Wood"), 2);
  assert.equal(activeRobot(s).inventory.Wood, undefined);
});
