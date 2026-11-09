import { test } from "node:test";
import assert from "node:assert/strict";
import { fresh, advance, command } from "./engine";
import { hasLocalProgress } from "./persistence";
test("the free initial skill and automatic grass growth do not conflict with cloud login", () => {
  const s = fresh();
  assert.deepEqual(s.unlocks, ["till"]);
  assert.equal(hasLocalProgress(s), false);
  advance(s, 120);
  assert.equal(hasLocalProgress(s), false);
});
test("earned resources, research, custom code, terrain and cosmetics remain meaningful local progress", () => {
  const cases = [
    (s: ReturnType<typeof fresh>) => {
      command(s, "harvest", []);
    },
    (s: ReturnType<typeof fresh>) => {
      s.resources.Hay = 5;
    },
    (s: ReturnType<typeof fresh>) => {
      s.unlocks.push("loops");
    },
    (s: ReturnType<typeof fresh>) => {
      s.robots[0].code = "harvest();";
    },
    (s: ReturnType<typeof fresh>) => {
      command(s, "till", []);
    },
    (s: ReturnType<typeof fresh>) => {
      s.companion.accessory = "none";
    },
  ];
  cases.push((s) => {
    s.previousProgram = "while (true) { harvest(); }";
  });
  for (const change of cases) {
    const s = fresh();
    change(s);
    assert.equal(hasLocalProgress(s), true);
  }
});
