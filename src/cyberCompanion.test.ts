import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCyberCompanion } from "./CyberCompanion";
import { freshCompanion } from "./companion";
const media = (query: string): MediaQueryList => ({
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
test("imported Luma is normalized without rewriting source geometry, UVs or transforms", () => {
  const previous = globalThis.matchMedia;
  globalThis.matchMedia = media;
  const scene = new THREE.Group(),
    geometry = new THREE.BoxGeometry(0.6, 2, 0.4),
    texture = new THREE.Texture(),
    material = new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      map: texture,
    }),
    mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(1, 2, 0);
  scene.position.set(4, 8, -3);
  scene.scale.setScalar(2);
  scene.add(mesh);
  const positions = geometry.attributes.position.array.slice(),
    uvs = geometry.attributes.uv.array.slice(),
    originalColor = material.color.clone(),
    originalPosition = scene.position.clone();
  const controller = createCyberCompanion({
    scene,
    animations: [],
    parser: { json: { extras: { missingTextures: ["Image_0.jpg"] } } },
  });
  let disposed = 0;
  texture.addEventListener("dispose", () => disposed++);
  try {
    controller.update(0, freshCompanion(), new THREE.Vector3(0, 1.2, 6));
    controller.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(mesh),
      size = bounds.getSize(new THREE.Vector3()),
      center = bounds.getCenter(new THREE.Vector3());
    assert.ok(Math.abs(size.y - 1.05) < 1e-6);
    assert.ok(Math.abs(center.x) < 1e-6);
    assert.ok(bounds.min.y > 0.1);
    assert.deepEqual(geometry.attributes.position.array, positions);
    assert.deepEqual(geometry.attributes.uv.array, uvs);
    assert.deepEqual(scene.position, originalPosition);
    assert.deepEqual(controller.missingTextures, ["Image_0.jpg"]);
    controller.update(
      0.1,
      { ...freshCompanion(), skin: "rose" },
      new THREE.Vector3(0, 1.2, 6),
    );
    assert.ok(!material.color.equals(originalColor));
    assert.equal(material.map, texture);
    controller.update(0.1, freshCompanion(), new THREE.Vector3(0, 1.2, 6));
    assert.ok(material.color.equals(originalColor));
    const y = controller.group.children[0].position.y;
    const state = controller.update(
      10,
      freshCompanion(),
      new THREE.Vector3(0, 1.2, 6),
    );
    assert.equal(state.y, y);
    assert.equal(state.blink, 1);
    assert.equal(state.wave, 0);
  } finally {
    controller.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    controller.dispose();
    globalThis.matchMedia = previous;
  }
  assert.equal(disposed, 1);
});
test("empty imported scenes are rejected so the GUI can keep its fallback", () => {
  assert.throws(
    () => createCyberCompanion({ scene: new THREE.Group(), animations: [] }),
    /géométrie visible/,
  );
});
