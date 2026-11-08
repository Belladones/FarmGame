import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { fresh, claim, hydrateFarm, missionBlocker, advance } from "./engine";
import {
  missions,
  chapters,
  currentMission,
  career,
  completedMissions,
} from "./missions";
import { declarations } from "./api";
import { validFarm } from "../server/validation";

test("campaign rewards are ordered, atomic, and XP cannot count unknown or duplicate IDs", () => {
  const s = fresh();
  s.harvested = 1;
  s.deposited = 20;
  assert.equal(claim(s, "routine"), false);
  assert.equal(claim(s, "first"), true);
  assert.equal(claim(s, "first"), false);
  assert.equal(s.stock, 4);
  assert.equal(career(s).xp, 25);
  s.claimed.push("unknown", "first");
  assert.equal(completedMissions(s), 1);
  assert.equal(career(s).xp, 25);
  assert.equal(currentMission(s)?.id, "deposit");
});
test("full deposits block wheat rewards without losing them, but not gold rewards", () => {
  const s = fresh();
  s.stock = 200;
  s.harvested = 1;
  assert.match(missionBlocker(s, "first")!, /Dépôt plein/);
  assert.equal(claim(s, "first"), false);
  assert.equal(s.claimed.length, 0);
  s.claimed = missions.slice(0, 4).map((m) => m.id);
  s.unlocks.push("conditions", "sensor");
  const before = s.gold;
  assert.equal(claim(s, "observe"), true);
  assert.equal(s.gold, before + 25);
  assert.equal(s.stock, 200);
});
test("legacy progression and production counts survive migration and spending", () => {
  const raw = JSON.parse(JSON.stringify(fresh()));
  delete raw.produced;
  raw.claimed = ["first", "deposit", "routine", "explore"];
  const s = hydrateFarm(raw);
  assert.deepEqual(s.produced, {});
  assert.equal(currentMission(s)?.id, "observe");
  assert.equal(career(s).level, 2);
  s.produced.Flour = 5;
  const flour = missions.find((m) => m.id === "flour")!;
  assert.equal(flour.progress(s), 5);
  const loaded = hydrateFarm(JSON.parse(JSON.stringify(s)));
  assert.equal(flour.progress(loaded), 5);
  assert.equal(loaded.resources.Flour ?? 0, 0);
});
test("real machine cycles advance the production objective exactly once", () => {
  const s = fresh();
  s.unlocks.push("milling");
  s.buildings.push({
    ...structuredClone(s.buildings[0]),
    id: "mill",
    kind: "Mill",
    x: 0,
    y: -1,
    input: { Wheat: 25 },
    output: {},
    inventory: {},
  });
  advance(s, 1);
  advance(s, 100);
  assert.equal(s.produced.Flour, 5);
  advance(s, 100);
  assert.equal(s.produced.Flour, 5);
});
test("campaign objectives cover every chapter and examples typecheck against real game API", () => {
  assert.equal(new Set(missions.map((m) => m.id)).size, missions.length);
  for (let i = 0; i < chapters.length; i++)
    assert.ok(missions.some((m) => m.chapter === i));
  const examples = missions
    .filter((m) => m.code)
    .map((m, i) => `namespace Example${i} {\n${m.code}\n}`)
    .join("\n");
  const file = "/mission-examples.ts";
  const source = declarations + "\n" + examples;
  const host = ts.createCompilerHost({ strict: true, noEmit: true });
  const originalRead = host.readFile.bind(host),
    originalExists = host.fileExists.bind(host);
  host.readFile = (p) => (p === file ? source : originalRead(p));
  host.fileExists = (p) => p === file || originalExists(p);
  const program = ts.createProgram(
    [file],
    { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, types: [] },
    host,
  );
  assert.deepEqual(
    ts
      .getPreEmitDiagnostics(program)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")),
    [],
  );
});

test("finished campaigns award their final rank and reject repeated final rewards", () => {
  const s = fresh();
  s.claimed = missions.slice(0, -1).map((m) => m.id);
  s.deposited = 1000;
  const before = s.gold;
  assert.equal(claim(s, "thousand"), true);
  assert.equal(s.gold, before + 500);
  assert.equal(currentMission(s), undefined);
  assert.equal(career(s).level, 5);
  assert.equal(claim(s, "thousand"), false);
  assert.equal(s.gold, before + 500);
  const snapshot = JSON.parse(JSON.stringify(s));
  assert.equal(validFarm(snapshot), true);
  snapshot.produced = { Flour: -1 };
  assert.equal(validFarm(snapshot), false);
});
