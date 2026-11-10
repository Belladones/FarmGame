import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fresh,
  buy,
  hydrateFarm,
  recallRobot,
  deployRobot,
  command,
  advance,
  deploymentPosition,
  capacity,
  robotSpeed,
  actionDuration,
} from "./engine";
import { robotStatus, robotCapabilities } from "./fleet";
import { validFarm } from "../server/validation";

test("garage preserves cargo, code and equipment through save hydration", () => {
  const s = fresh(),
    r = s.robots[0];
  s.cargo = 7;
  r.code = "await harvest();";
  r.water = 4;
  assert.equal(recallRobot(s, r.id), true);
  assert.equal(r.inventory.Wheat, 7);
  assert.throws(() => command(s, "plant", ["Wheat"]), /garage/);
  advance(s, 5);
  assert.equal(s.robots.length, 1);
  const loaded = hydrateFarm(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.robots[0].deployed, false);
  assert.equal(loaded.robots[0].inventory.Wheat, 7);
  assert.equal(loaded.robots[0].water, 4);
  assert.equal(loaded.robots[0].code, r.code);
  assert.equal(validFarm(JSON.parse(JSON.stringify(loaded))), true);
  assert.equal(deployRobot(loaded, r.id), true);
  assert.equal(loaded.robots[0].deployed, true);
});
test("legacy snapshots deploy living robots and reject invalid deployment flags", () => {
  const raw = JSON.parse(JSON.stringify(fresh()));
  delete raw.robots[0].deployed;
  assert.equal(hydrateFarm(raw).robots[0].deployed, true);
  raw.robots[0].deployed = "yes";
  assert.equal(validFarm(raw), false);
});
test("busy robots cannot teleport to garage and deployment respects reservations", () => {
  const s = fresh(),
    r = s.robots[0];
  s.stock = 25;
  buy(s, "extension");
  r.readyAt = 1;
  assert.equal(recallRobot(s, r.id), false);
  advance(s, 1);
  assert.equal(recallRobot(s, r.id), true);
  const other = structuredClone(r);
  other.id = "f2";
  other.deployed = true;
  s.robots.push(other);
  const target = deploymentPosition(s, r.id);
  if (target) {
    other.reservation = { ...target, expires: s.time + 5 };
    assert.notDeepEqual(deploymentPosition(s, r.id), target);
  }
  assert.notDeepEqual(deploymentPosition(s, r.id), { x: other.x, y: other.y });
});
test("blueprints do not globally upgrade robots; statuses reflect each model and garage state", () => {
  const s = fresh(),
    r = s.robots[0];
  s.unlocks.push("hold", "motor", "tools");
  assert.equal(capacity(s, r), 20);
  assert.equal(robotSpeed(s, r), 1);
  assert.equal(actionDuration(s, r), 1);
  const transporter = { ...r, model: "Transporter" as const };
  assert.equal(capacity(s, transporter), 100);
  assert.equal(
    robotCapabilities(s, transporter).some((c) => c.name === "Planter"),
    false,
  );
  assert.equal(robotStatus(s, r, "running", true).tone, "paused");
  r.lastError = "Erreur TS";
  assert.equal(robotStatus(s, r, undefined, false).tone, "error");
  recallRobot(s, r.id);
  assert.equal(robotStatus(s, r, "running", false).tone, "garage");
});
