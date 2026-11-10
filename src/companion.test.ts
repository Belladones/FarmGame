import { missions } from "./missions";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fresh, hydrateFarm } from "./engine";
import {
  customizeCompanion,
  freshCompanion,
  hydrateCompanion,
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
      lens: "lens-red",
      stickers: [{ id: "ribbon", slot: 1, rotation: 0 }],
      unlocked: [...freshCompanion().unlocked, "rose"],
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

test("lens, stickers and paint equip independently and legacy unlocks survive", () => {
  const f = fresh();
  assert.equal(customizeCompanion(f, "lens-cyan"), false);
  f.claimed = [missions[0].id];
  assert.equal(customizeCompanion(f, "rose"), true);
  assert.equal(customizeCompanion(f, "lens-cyan"), true);
  assert.equal(f.companion.skin, "rose");
  assert.equal(f.companion.accessory, "ribbon");
  assert.equal(f.companion.lens, "lens-cyan");
  assert.deepEqual(
    hydrateFarm(JSON.parse(JSON.stringify(f))).companion,
    f.companion,
  );
  const legacy = hydrateCompanion({
    skin: "mint",
    accessory: "halo",
    unlocked: ["mint", "halo"],
  });
  assert.equal(legacy.skin, "mint");
  assert.equal(legacy.accessory, "halo");
  assert.equal(legacy.lens, "lens-red");
  assert.equal(
    validFarm({ ...f, companion: { ...f.companion, lens: 123 } }),
    false,
  );
  assert.equal(
    validFarm({ ...f, companion: { ...f.companion, lens: "missing" } }),
    false,
  );
});

test("stickers are capped at three, placed independently, removable and stable across saves", () => {
  const f = fresh();
  f.claimed = missions.slice(0, 6).map((m) => m.id);
  assert.ok(customizeCompanion(f, "flower"));
  assert.ok(customizeCompanion(f, "halo"));
  const placements = structuredClone(f.companion.stickers!);
  assert.equal(placements.length, 3);
  assert.equal(new Set(placements.map((s) => s.slot)).size, 3);
  assert.equal(customizeCompanion(f, "ribbon"), false);
  assert.deepEqual(f.companion.stickers, placements);
  assert.deepEqual(
    hydrateFarm(JSON.parse(JSON.stringify(f))).companion.stickers,
    placements,
  );
  assert.ok(customizeCompanion(f, `sticker:remove:${placements[1].slot}`));
  assert.equal(f.companion.stickers!.length, 2);
  assert.ok(customizeCompanion(f, "ribbon"));
  assert.equal(f.companion.stickers!.length, 3);
  assert.equal(
    validFarm({
      ...f,
      companion: { ...f.companion, stickers: [...placements, placements[0]] },
    }),
    false,
  );
  assert.equal(
    validFarm({
      ...f,
      companion: {
        ...f.companion,
        stickers: [{ id: "ribbon", slot: 99, rotation: 0 }],
      },
    }),
    false,
  );
  assert.equal(
    validFarm({
      ...f,
      companion: { ...f.companion, stickers: [placements[0], placements[0]] },
    }),
    false,
  );
  assert.ok(customizeCompanion(f, "none"));
  assert.deepEqual(f.companion.stickers, []);
  assert.deepEqual(
    hydrateFarm(JSON.parse(JSON.stringify(f))).companion.stickers,
    [],
  );
});
