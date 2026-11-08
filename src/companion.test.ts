import { missions } from "./missions";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fresh, hydrateFarm } from "./engine";
import {
  customizeCompanion,
  freshCompanion,
  hydrateCompanion,
  perimeterPoint,
} from "./companion";
import { validFarm } from "../server/validation";
test("legacy saves gain a default companion without changing the fleet", () => {
  const f = fresh(),
    old = JSON.parse(JSON.stringify(f));
  delete old.companion;
  const loaded = hydrateFarm(old);
  assert.deepEqual(loaded.companion, freshCompanion());
  assert.deepEqual(loaded.robots, hydrateFarm(f).robots);
  assert.equal(validFarm(old), true);
});
test("cosmetics unlock through claimed missions, equip independently and cost no resources", () => {
  const f = fresh();
  assert.equal(customizeCompanion(f, "rose"), false);
  f.claimed = ["unknown", "unknown", "unknown"];
  assert.equal(customizeCompanion(f, "rose"), false);
  f.claimed = [];
  assert.equal(customizeCompanion(f, "halo"), false);
  f.claimed = [missions[0].id];
  const before = { gold: f.gold, stock: f.stock };
  assert.equal(customizeCompanion(f, "rose"), true);
  assert.equal(f.companion.skin, "rose");
  assert.equal(f.companion.accessory, "ribbon");
  assert.deepEqual({ gold: f.gold, stock: f.stock }, before);
  f.claimed = missions.slice(0, 5).map((m) => m.id);
  assert.equal(customizeCompanion(f, "halo"), true);
  assert.equal(f.companion.accessory, "halo");
  assert.equal(f.companion.skin, "rose");
  f.claimed = [];
  assert.equal(customizeCompanion(f, "pearl"), true);
  assert.equal(customizeCompanion(f, "rose"), true);
  assert.deepEqual(
    hydrateFarm(JSON.parse(JSON.stringify(f))).companion,
    f.companion,
  );
  assert.equal(customizeCompanion(f, "missing"), false);
});
test("cosmetic data is normalized and validated on loading", () => {
  assert.deepEqual(
    hydrateCompanion({
      skin: "unknown",
      accessory: "rose",
      unlocked: ["unknown", "rose", "rose"],
    }),
    {
      skin: "pearl",
      accessory: "ribbon",
      unlocked: ["pearl", "none", "ribbon", "rose"],
    },
  );
  assert.equal(
    validFarm({
      ...fresh(),
      companion: { skin: 3, accessory: "none", unlocked: [] },
    }),
    false,
  );
  assert.equal(validFarm(fresh()), true);
});
test("patrol follows the outside boundary through corners and wraps in both directions", () => {
  const left = -3,
    right = 4,
    back = -2,
    front = 5;
  for (let t = -100; t < 100; t += 0.03) {
    const p = perimeterPoint(t, left, right, back, front);
    assert.ok(p.x >= left && p.x <= right);
    assert.ok(p.z >= back && p.z <= front);
    assert.ok(p.x === left || p.x === right || p.z === back || p.z === front);
  }
  assert.deepEqual(
    perimeterPoint(0, left, right, back, front),
    perimeterPoint(28, left, right, back, front),
  );
});
