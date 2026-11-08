import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCompanion, companionExpression } from "./Companion3D";
import { freshCompanion } from "./companion";
test("the companion floats without ground and faces cameras on every side", () => {
  const previous = globalThis.matchMedia;
  globalThis.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return true;
    },
  });
  const companion = createCompanion(-2, 2, -2, 2);
  try {
    const appearance = freshCompanion(),
      body = companion.group.children[0];
    assert.equal(companion.group.children.length, 1);
    for (const [x, z] of [
      [8, 8],
      [-8, 8],
      [-8, -8],
      [8, -8],
    ]) {
      const camera = new THREE.Vector3(x, 12, z);
      companion.update(0.1, appearance, camera);
      const facing = body.getWorldDirection(new THREE.Vector3());
      facing.y = 0;
      facing.normalize();
      const toward = camera.clone().sub(body.position);
      toward.y = 0;
      toward.normalize();
      assert.ok(facing.dot(toward) > 0.99999);
      const bounds = new THREE.Box3().setFromObject(companion.group);
      assert.ok(bounds.min.y > 0.1, "all geometry floats above ground level");
    }
  } finally {
    companion.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    companion.dispose();
    globalThis.matchMedia = previous;
  }
});
test("hover, blinking and waves animate independently from travelling and respect reduced motion", () => {
  assert.notEqual(companionExpression(1).height, companionExpression(2).height);
  assert.ok(companionExpression(0.09).blink < 0.1);
  assert.equal(companionExpression(1).blink, 1);
  assert.ok(companionExpression(3.4).wave > 0.9);
  assert.equal(companionExpression(8).wave, 0);
  assert.deepEqual(companionExpression(3.4, true), {
    height: 0.48,
    blink: 1,
    wave: 0,
    sway: 0,
  });
});
