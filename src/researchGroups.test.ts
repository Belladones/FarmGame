import { test } from "node:test";
import assert from "node:assert/strict";
import { research } from "./catalog";
import {
  researchGroups,
  researchGroupFor,
  groupProgress,
  hasResearchLevel,
} from "./researchGroups";
import { researchTrees } from "./researchTrees";
import { robotTrees } from "./robotTrees";
import { fresh, buy } from "./engine";
test("one card represents each research family and every tier remains reachable", () => {
  const ids = researchTrees.flatMap((t) => t.nodes.map((n) => n.id));
  for (const group of researchGroups) {
    assert.equal(ids.filter((id) => id === group.id).length, 1, group.id);
    assert.equal(new Set(group.steps).size, group.steps.length);
    for (const id of group.steps) {
      assert.ok(
        research.find((r) => r.id === id),
        id,
      );
      assert.equal(researchGroupFor(id), group);
    }
  }
  for (const tree of [...researchTrees, ...robotTrees])
    assert.equal(new Set(tree.nodes.map((n) => n.id)).size, tree.nodes.length);
});
test("Expansion updates the next purchase in place using its nine existing IDs and costs", () => {
  const family = researchGroupFor("extension")!,
    s = fresh();
  s.unlocks.push("loops", "speed", "plant", "bush");
  s.resources = { Hay: 30, Wood: 20 };
  let state = groupProgress(family, s.unlocks);
  assert.equal(state.level, 0);
  assert.equal(state.max, 9);
  assert.equal(state.next?.id, "extension");
  assert.equal(buy(s, state.next!.id), true);
  state = groupProgress(family, s.unlocks);
  assert.equal(state.level, 1);
  assert.equal(state.next?.id, "extension3");
  assert.deepEqual(state.next?.materials, { Wood: 20 });
  assert.equal(buy(s, state.next!.id), true);
  state = groupProgress(family, s.unlocks);
  assert.equal(state.level, 2);
  assert.equal(state.next?.id, "extension4");
  assert.equal(family.id, "extension");
});
test("base levels, sparse legacy saves and maximum tiers have consistent counters", () => {
  const grass = researchGroupFor("grass2")!,
    storage = researchGroupFor("storage2")!,
    bush = researchGroupFor("bush")!;
  assert.equal(groupProgress(grass, []).level, 1);
  assert.equal(groupProgress(grass, []).max, 10);
  assert.equal(groupProgress(storage, []).level, 1);
  assert.equal(groupProgress(bush, []).level, 0);
  assert.equal(groupProgress(bush, ["bush"]).level, 1);
  const sparse = groupProgress(storage, ["storage4"]);
  assert.equal(sparse.level, 4);
  assert.equal(sparse.next?.id, "storage5");
  assert.equal(hasResearchLevel(["storage4"], "storage2"), true);
  for (const group of researchGroups) {
    const max = groupProgress(group, group.steps);
    assert.equal(max.level, max.max);
    assert.equal(max.next, undefined);
    assert.equal(max.current?.id, group.steps.at(-1));
  }
});
test("a prerequisite for a later tier still maps to its shared card", () => {
  const pumpkin10 = research.find((r) => r.id === "pumpkin10")!;
  assert.ok(pumpkin10.prerequisites.includes("storage10"));
  assert.equal(researchGroupFor("storage10")?.id, "storage2");
  assert.ok(
    researchTrees
      .find((t) => t.name === "Technologie")!
      .nodes.some((n) => n.group?.steps.includes("storage10")),
  );
});
