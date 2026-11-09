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

test("local named games preserve robots and code when starting over and resuming", async () => {
  const { CloudSave } = await import("./persistence");
  const storage = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  let farm = fresh();
  farm.resources.Hay = 42;
  farm.robots[0].code = "harvest(); // My program";
  const client = new CloudSave({
    getFarm: () => farm,
    applyFarm: (next) => {
      farm = next;
    },
    onChange: () => {},
  });
  client.status.mode = "guest";
  try {
    await client.saveSlot("Ma ferme");
    const [saved] = await client.listSlots();
    await client.openSlot(null);
    assert.equal(farm.resources.Hay ?? 0, 0);
    assert.equal((await client.listSlots()).length, 2);
    await client.openSlot(saved.id);
    assert.equal(farm.resources.Hay, 42);
    assert.equal(farm.robots[0].code, "harvest(); // My program");
    farm.resources.Hay = 3;
    await client.openSlot(saved.id);
    assert.equal(
      farm.resources.Hay,
      42,
      "opening does not mutate the saved snapshot",
    );
    client.status.mode = "conflict";
    await assert.rejects(client.openSlot(null), /conflit/);
    assert.equal(farm.resources.Hay, 42);
    client.status.mode = "guest";
    await client.deleteSlot(saved.id);
    assert.equal(
      (await client.listSlots()).some((slot) => slot.id === saved.id),
      false,
    );
    storage.set("farmscript-slots-v1", "broken");
    await assert.rejects(client.openSlot(null));
    assert.equal(
      farm.resources.Hay,
      42,
      "a failed archive must leave the current game intact",
    );
  } finally {
    client.dispose();
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
