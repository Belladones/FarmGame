import { legacyFarm as fresh } from "../tests/fixtures";
import { test } from "node:test";
import assert from "node:assert/strict";
import { research, sum } from "./catalog";
import { researchTrees, researchDepth } from "./researchTrees";
import {
  buy,
  hydrateFarm,
  researchBlocker,
  slotCount,
  depotCapacity,
  command,
} from "./engine";
import { farmViewport, cameraInclination } from "./camera";
function ancestors(id: string, result = new Set<string>()) {
  for (const p of research.find((r) => r.id === id)!.prerequisites) {
    if (!result.has(p)) {
      result.add(p);
      ancestors(p, result);
    }
  }
  return result;
}
test("every research is acyclic, has producible costs and fits reachable storage", () => {
  const providers = {
    Wheat: "wheat-base",
    Wood: "bush",
    Carrot: "carrot",
    Pumpkin: "pumpkin",
  };
  for (const r of research) {
    assert.ok(researchDepth(r.id) > 0);
    const previous = ancestors(r.id),
      s = fresh();
    s.unlocks = [...previous];
    for (const [item, provider] of Object.entries(providers))
      if (r.materials[item as keyof typeof providers])
        assert.ok(previous.has(provider), `${r.id} cannot produce ${item}`);
    assert.ok(
      sum(r.materials) <= depotCapacity(s) * slotCount(s),
      `${r.id}: cost exceeds all attainable depots`,
    );
  }
});
test("trees contain exactly the actual research, in dependency order", () => {
  const nodes = researchTrees.flatMap((t) => t.nodes.filter((n) => n.research));
  assert.equal(nodes.length, research.length);
  assert.equal(new Set(nodes.map((n) => n.id)).size, research.length);
  for (const t of researchTrees)
    for (const n of t.nodes)
      for (const p of n.parents)
        assert.ok(
          t.nodes.find((x) => x.id === p)!.y < n.y,
          `${p} must precede ${n.id}`,
        );
});
test("storage gates prevent impossible payments and old unlocks remain valid", () => {
  const s = fresh();
  s.unlocks = ["wheat", "bush"];
  s.stock = 250;
  s.resources = { Wood: 100 };
  assert.match(researchBlocker(s, "wheat3")!, /Stockage/);
  assert.equal(buy(s, "wheat3"), false);
  assert.equal(s.stock, 250);
  s.unlocks.push("construction", "storage2");
  assert.equal(buy(s, "wheat3"), true);
  assert.equal(s.stock, 0);
  const loaded = hydrateFarm(JSON.parse(JSON.stringify(s)));
  assert.ok(loaded.unlocks.includes("wheat3"));
  loaded.unlocks = ["wheat3"];
  assert.equal(command(loaded, "plant", ["Wheat"]), true);
  assert.equal(loaded.tiles[0].yield, 12);
});
test("large research requires real depot capacity, not only a storage flag", () => {
  const s = fresh();
  s.unlocks = [...ancestors("wheat5")];
  s.stock = 15000;
  s.resources = { Wood: 5000, Carrot: 2000 };
  assert.match(researchBlocker(s, "wheat5")!, /Capacité insuffisante/);
  assert.equal(buy(s, "wheat5"), false);
  const base = structuredClone(s.buildings[0]);
  for (let i = 1; i < 3; i++)
    s.buildings.push({
      ...structuredClone(base),
      inventory: {},
      id: "depot" + i,
      x: -1,
      y: i,
    });
  assert.equal(buy(s, "wheat5"), true);
  assert.equal(s.stock, 0);
  assert.equal(s.resources.Wood, 0);
});
test("orthographic framing keeps the screen aspect and is independent of orbit", () => {
  for (const [w, h] of [
    [1440, 1000],
    [1024, 720],
    [390, 844],
  ])
    for (const span of [1.28, 3.84, 11.52]) {
      const view = farmViewport(w, h, span, span, true);
      assert.ok(
        Math.abs((view.right - view.left) / (view.top - view.bottom) - w / h) <
          1e-9,
      );
      assert.ok(view.top > 0);
      assert.equal(view.left, -view.right);
    }
  assert.ok(cameraInclination.min > 0);
  assert.ok(cameraInclination.max < Math.PI / 2);
});
