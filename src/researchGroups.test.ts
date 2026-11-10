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
    bush = researchGroupFor("bush")!;
  assert.equal(groupProgress(grass, []).level, 1);
  assert.equal(groupProgress(grass, []).max, 10);
  assert.equal(groupProgress(bush, []).level, 0);
  assert.equal(groupProgress(bush, ["bush"]).level, 1);
  const sparse = groupProgress(bush, ["bush4"]);
  assert.equal(sparse.level, 4);
  assert.equal(sparse.next?.id, "bush5");
  assert.equal(hasResearchLevel(["bush4"], "bush2"), true);
  for (const group of researchGroups) {
    const max = groupProgress(group, group.steps);
    assert.equal(max.level, max.max);
    assert.equal(max.next, undefined);
    assert.equal(max.current?.id, group.steps.at(-1));
  }
});
test("global trees do not expose retired building or gear levels", () => {
  const represented = researchTrees.flatMap((t) =>
    t.nodes.flatMap((n) => n.group?.steps ?? (n.research ? [n.research] : [])),
  );
  assert.ok(!represented.includes("storage2"));
  assert.ok(!represented.includes("hold2"));
  assert.ok(represented.includes("hold"));
  assert.ok(represented.includes("workshop"));
  assert.ok(
    research
      .find((r) => r.id === "tree10")!
      .prerequisites.includes("construction"),
  );
});

test("thematic branches have real parents, disjoint subtree lanes and ordered tiers", () => {
  for (const tree of [...researchTrees, ...robotTrees]) {
    const descendants = (id: string): typeof tree.nodes =>
      tree.nodes
        .filter((n) => n.branchParent === id)
        .flatMap((n) => [n, ...descendants(n.id)]);
    for (const node of tree.nodes) {
      if (node.branchParent)
        assert.ok(node.parents.includes(node.branchParent));
      for (const parent of node.parents)
        assert.ok(tree.nodes.find((n) => n.id === parent)!.y < node.y);
      assert.ok(node.x >= 0 && node.x + 114 <= tree.width);
      const children = tree.nodes.filter((n) => n.branchParent === node.id);
      for (let i = 1; i < children.length; i++) {
        const left = [children[i - 1], ...descendants(children[i - 1].id)];
        const right = [children[i], ...descendants(children[i].id)];
        assert.ok(
          Math.max(...left.map((n) => n.x + 114)) <
            Math.min(...right.map((n) => n.x)),
          `${tree.name}: overlapping sibling branches`,
        );
      }
    }
  }
  const programming = researchTrees.find((t) => t.name === "Programmation")!;
  assert.equal(
    programming.nodes.find((n) => n.id === "lists")!.branchParent,
    "for",
  );
  assert.equal(
    programming.nodes.find((n) => n.id === "functions")!.branchParent,
    "variables",
  );
  assert.ok(
    programming.nodes.filter((n) => n.branchParent === "conditions").length >=
      2,
  );
});
