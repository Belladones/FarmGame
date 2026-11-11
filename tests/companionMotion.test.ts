import { test } from "node:test";
import assert from "node:assert/strict";
import {
  companionFlight,
  companionLife,
  companionGaze,
  restMotion,
} from "../src/modules/companion/domain/companionMotion";

test("flight accelerates gradually, brakes, arrives without overshooting and is frame-rate independent", () => {
  assert.ok(companionFlight(100, 0, 0.05).speed < 3);
  assert.ok(companionFlight(1, 38, 0.1).speed < 38);
  const travel = (dt: number) => {
    let remaining = 150,
      speed = 0;
    for (let t = 0; t < 8; t += dt) {
      const flight = companionFlight(remaining, speed, dt);
      assert.ok(flight.step <= remaining && flight.step >= 0);
      remaining -= flight.step;
      speed = flight.speed;
    }
    assert.ok(remaining < 0.5);
    assert.equal(companionFlight(remaining, speed, dt).speed, 0);
    return remaining;
  };
  assert.ok(Math.abs(travel(1 / 30) - travel(1 / 60)) < 0.5);
  assert.deepEqual(companionFlight(100, 30, 1, true), { speed: 0, step: 0 });
});
test("life reacts to travel and attention while reduced motion returns a stable resting pose", () => {
  const input = { vx: 38, vy: 20, gazeX: 1, gazeY: 1, attention: 1 };
  const pose = companionLife(1, input);
  assert.ok(
    pose.roll < 0 && pose.pitch > 0 && pose.headYaw > 0 && pose.headPitch > 0,
  );
  assert.ok(pose.bodyYaw > 0);
  assert.equal(pose.wave, 0);
  const left = companionLife(1, { ...input, gazeX: -1, gazeY: -1 });
  assert.ok(left.bodyYaw < 0 && left.headYaw < 0 && left.headPitch < 0);
  assert.notEqual(companionLife(1).height, companionLife(2).height);
  assert.deepEqual(
    companionLife(1, input, true),
    companionLife(9, restMotion, true),
  );
});

test("gaze follows distant pointers smoothly and maps screen Y to model pitch", () => {
  assert.deepEqual(companionGaze(0, 0), { gazeX: 0, gazeY: 0 });
  const near = companionGaze(200, 100),
    far = companionGaze(1000, 800);
  assert.ok(far.gazeX > near.gazeX && far.gazeX <= 1);
  assert.ok(far.gazeY > near.gazeY && far.gazeY <= 1);
  assert.equal(companionGaze(-200, -100).gazeX, -near.gazeX);
});
