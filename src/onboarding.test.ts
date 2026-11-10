import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import {
  fresh,
  hydrateFarm,
  advance,
  command,
  buy,
  getStock,
  TICK_SECONDS,
  missionBlocker,
  claim,
} from "./modules/farm/application/engine";
import { currentMission, missionsFor, career } from "./modules/missions/domain/missions";
import { validateProgramProgression } from "./modules/programming/adapters/typescript/programProgression";
import { declarations } from "./modules/programming/domain/api";
import { research } from "./modules/research/domain/catalog";
test("a new game starts with harvestable grass, no wheat or loop unlock and a simple program", () => {
  const s = fresh();
  assert.equal(s.tiles[0].entity, "Grass");
  assert.equal(s.tiles[0].progress, 1);
  assert.equal(s.unlocks.includes("loops"), false);
  assert.ok(!/\bwhile\s*\(/.test(s.robots[0].code));
  assert.throws(() => command(s, "plant", ["Wheat"]), /plant/);
  assert.equal(command(s, "harvest", []), true);
  assert.equal(s.robots[0].inventory.Hay, 1);
  assert.equal(s.robots[0].readyAt, 200 * TICK_SECONDS);
  assert.equal(command(s, "deposit", []), 1);
  assert.equal(getStock(s, "Hay"), 1);
  assert.equal(s.depositedItems.Hay, 1);
  assert.equal(s.stock, 0);
});
test("grass regrows on prairie after half a second, but not automatically on soil", () => {
  const s = fresh();
  command(s, "harvest", []);
  advance(s, 0.5);
  assert.equal(s.tiles[0].entity, "Grass");
  assert.equal(command(s, "harvest", []), true);
  assert.equal(command(s, "till", []), true);
  advance(s, 2);
  assert.equal(s.tiles[0].ground, "Soil");
  assert.equal(s.tiles[0].planted, null);
  assert.equal(command(s, "harvest", []), false);
  assert.equal(s.robots[0].readyAt, s.time + TICK_SECONDS);
  s.unlocks.push("plant");
  assert.equal(command(s, "plant", ["Grass"]), true);
  advance(s, 0.5);
  assert.equal(command(s, "harvest", []), true);
  command(s, "till", []);
  advance(s, 0.5);
  assert.equal(s.tiles[0].entity, "Grass");
  assert.equal(s.tiles[0].progress, 1);
});
test("five deposited hay unlock the first loop exactly once without charging wheat", () => {
  const s = fresh();
  for (let i = 0; i < 5; i++) {
    command(s, "harvest", []);
    command(s, "deposit", []);
    advance(s, 2);
  }
  assert.equal(getStock(s, "Hay"), 5);
  assert.equal(buy(s, "loops"), true);
  assert.equal(getStock(s, "Hay"), 0);
  assert.equal(buy(s, "loops"), false);
  assert.equal(s.stock, 0);
});
test("an immature crop is removed without yield and a full hold preserves ripe crops", () => {
  const s = fresh();
  s.unlocks.push("loops", "plant", "wheat-base");
  command(s, "plant", ["Wheat"]);
  assert.equal(command(s, "harvest", []), true);
  assert.equal(s.harvested, 0);
  assert.equal(s.tiles[0].planted, null);
  assert.equal(s.robots[0].readyAt, s.time + 1);
  command(s, "plant", ["Wheat"]);
  advance(s, 5);
  s.robots[0].inventory.Hay = 20;
  assert.equal(command(s, "harvest", []), false);
  assert.equal(s.tiles[0].entity, "Wheat");
  assert.equal(s.robots[0].readyAt, s.time + TICK_SECONDS);
});
test("progression validates loop syntax before running even inside functions", () => {
  const parse = (code: string) =>
    ts.createSourceFile(
      "test.ts",
      code,
      ts.ScriptTarget.ES2020,
      true,
      ts.ScriptKind.TS,
    );
  assert.doesNotThrow(() =>
    validateProgramProgression(parse("harvest(); deposit();"), {
      loops: false,
      conditions: false,
    }),
  );
  for (const code of [
    "while(true) {}",
    "for(;;) {}",
    "function work(){while(true){harvest();}}",
  ])
    assert.throws(
      () =>
        validateProgramProgression(parse(code), {
          loops: false,
          conditions: false,
        }),
      /5 foins/,
    );
  assert.doesNotThrow(() =>
    validateProgramProgression(parse("while(true){harvest();deposit();}"), {
      loops: true,
      conditions: false,
    }),
  );
  assert.throws(
    () =>
      validateProgramProgression(parse("if(true)harvest();"), {
        loops: true,
        conditions: false,
      }),
    /Conditions/,
  );
});
test("the introductory missions use actual hay and wheat, and cannot be skipped by aggregate counters", () => {
  const s = fresh();
  s.harvested = 1000;
  s.deposited = 1000;
  assert.match(missionBlocker(s, "first")!, /Objectif/);
  s.harvestedItems.Hay = 1;
  assert.equal(claim(s, "first"), true);
  assert.equal(s.stock, 0);
  assert.equal(currentMission(s)?.id, "deposit");
  s.depositedItems.Hay = 5;
  assert.equal(claim(s, "deposit"), true);
  assert.equal(currentMission(s)?.id, "first-loop");
  assert.equal(claim(s, "routine"), false);
  assert.ok(missionsFor(s).some((m) => m.id === "first-wheat"));
  assert.ok(
    missionsFor(s)
      .filter((m) => m.chapter === 0)
      .every((m) => m.reward === 0),
  );
  assert.ok(career(s).xp > 0);
});
test("old snapshots retain acquired skills, programs and rewards; modern saves retain granular counters", () => {
  const raw = JSON.parse(JSON.stringify(fresh()));
  delete raw.progressionVersion;
  raw.robots[0].code =
    "while(true){harvest();plant(Entities.Wheat);deposit();}";
  raw.claimed = ["first", "deposit", "routine", "explore"];
  const s = hydrateFarm(raw);
  assert.equal(s.progressionVersion, 1);
  assert.ok(s.unlocks.includes("loops"));
  assert.ok(s.unlocks.includes("wheat-base"));
  assert.equal(currentMission(s)?.id, "observe");
  assert.equal(s.robots[0].code, raw.robots[0].code);
  const modern = fresh();
  modern.depositedItems.Hay = 7;
  const loaded = hydrateFarm(JSON.parse(JSON.stringify(modern)));
  assert.equal(loaded.progressionVersion, 2);
  assert.equal(loaded.depositedItems.Hay, 7);
  assert.equal(loaded.unlocks.includes("loops"), false);
});
test("every modern mission example passes TypeScript diagnostics with the public API", () => {
  const files = new Map([
    ["/api.d.ts", declarations],
    [
      "/player.ts",
      missionsFor(fresh())
        .map((m) => `{\n${m.code ?? ""}\n}`)
        .join("\n"),
    ],
  ]);
  const host = ts.createCompilerHost({
    noEmit: true,
    target: ts.ScriptTarget.ES2020,
  });
  const originalRead = host.readFile,
    originalExists = host.fileExists;
  host.readFile = (p) => files.get(p) ?? originalRead(p);
  host.fileExists = (p) => files.has(p) || originalExists(p);
  const program = ts.createProgram(
    ["/api.d.ts", "/player.ts"],
    {
      noEmit: true,
      strict: true,
      target: ts.ScriptTarget.ES2020,
      types: [],
      skipLibCheck: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    host,
  );
  assert.deepEqual(
    ts
      .getPreEmitDiagnostics(program)
      .filter((d) => d.category === ts.DiagnosticCategory.Error)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")),
    [],
  );
  assert.deepEqual(research.find((r) => r.id === "loops")?.materials, {
    Hay: 5,
  });
});
