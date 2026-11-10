import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createLegendaryEffects } from "./legendaryEffects";
import { createCyberCompanion } from "./CyberCompanion";
import { fresh, hydrateFarm } from "./engine";
import { customizeCompanion, freshCompanion } from "./companion";
import { missionsFor } from "./missions";
test("legendary styles share an attainable milestone and preserve lens and stickers", () => {
  const farm = fresh();
  assert.equal(customizeCompanion(farm, "legend-angel"), false);
  farm.claimed = missionsFor(farm)
    .slice(0, 10)
    .map((m) => m.id);
  const stickers = structuredClone(farm.companion.stickers);
  assert.ok(customizeCompanion(farm, "lens-cyan"));
  assert.ok(customizeCompanion(farm, "legend-angel"));
  assert.ok(customizeCompanion(farm, "legend-demon"));
  assert.equal(farm.companion.lens, "lens-cyan");
  assert.deepEqual(farm.companion.stickers, stickers);
  assert.deepEqual(
    hydrateFarm(JSON.parse(JSON.stringify(farm))).companion,
    farm.companion,
  );
});
test("only the selected ornaments are visible, particles animate and reduced motion stops them", () => {
  const body = new THREE.Group(),
    head = new THREE.Group();
  body.add(head);
  const effect = createLegendaryEffects(body, head);
  try {
    effect.update("angel", 0.1, false);
    assert.ok(body.getObjectByName("Luma.legendary.angel")!.visible);
    assert.equal(body.getObjectByName("Luma.legendary.demon")!.visible, false);
    const particles = body.getObjectByName(
      "Luma.legendary.particles",
    ) as THREE.Points;
    assert.ok(particles.visible);
    assert.equal(particles.geometry.attributes.position.count, 28);
    const first = Array.from(particles.geometry.attributes.position.array);
    effect.update("angel", 0.1, false);
    assert.notDeepEqual(
      Array.from(particles.geometry.attributes.position.array),
      first,
    );
    effect.update("demon", 0.1, false);
    assert.equal(body.getObjectByName("Luma.legendary.angel")!.visible, false);
    assert.ok(body.getObjectByName("Luma.legendary.demon")!.visible);
    const still = Array.from(particles.geometry.attributes.position.array);
    effect.update("demon", 0.1, true);
    assert.equal(particles.visible, false);
    assert.deepEqual(
      Array.from(particles.geometry.attributes.position.array),
      still,
    );
    effect.update(undefined, 0.1, false);
    assert.equal(body.getObjectByName("Luma.legendary.demon")!.visible, false);
  } finally {
    effect.dispose();
  }
  assert.deepEqual(body.children, [head]);
  assert.equal(head.children.length, 0);
});
test("legendary gloss resets when returning to a normal paint", () => {
  const previous = globalThis.matchMedia;
  globalThis.matchMedia = (query) => ({
    matches: true,
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
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.63,
    metalness: 0.12,
  });
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), material));
  const model = createCyberCompanion({ scene, animations: [] });
  try {
    model.update(
      0,
      { ...freshCompanion(), skin: "legend-angel" },
      new THREE.Vector3(0, 1, 6),
    );
    assert.equal(material.roughness, 0.18);
    assert.equal(material.metalness, 0.22);
    model.update(
      0,
      { ...freshCompanion(), skin: "legend-demon" },
      new THREE.Vector3(0, 1, 6),
    );
    assert.equal(material.metalness, 0.5);
    model.update(0, freshCompanion(), new THREE.Vector3(0, 1, 6));
    assert.equal(material.roughness, 0.63);
    assert.equal(material.metalness, 0.12);
  } finally {
    model.dispose();
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    globalThis.matchMedia = previous;
  }
});
