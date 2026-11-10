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
    assert.ok(
      material.color.equals(originalColor),
      "paint shader must preserve source material and textures",
    );
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

test("head and body track the pointer while limb joints stay in their original pose", () => {
  const previous = globalThis.matchMedia;
  let reducedMotion = false;
  globalThis.matchMedia = (query) => ({
    ...media(query),
    get matches() {
      return reducedMotion;
    },
  });
  const scene = new THREE.Group();
  const head = new THREE.Group();
  head.name = "LumaHeadJoint";
  head.position.y = 1;
  head.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1, 0.6),
      new THREE.MeshStandardMaterial(),
    ),
  );
  scene.add(head);
  const arm = new THREE.Group();
  arm.name = "LumaArmLeftJoint";
  scene.add(arm);
  const leg = new THREE.Group();
  leg.name = "LumaLegLeftJoint";
  scene.add(leg);
  const model = createCyberCompanion({ scene, animations: [] });
  try {
    for (let i = 0; i < 20; i++)
      model.update(0.05, freshCompanion(), new THREE.Vector3(0, 1.2, 6), {
        vx: 25,
        vy: 5,
        gazeX: 1,
        gazeY: -0.5,
        attention: 1,
      });
    assert.ok(head.rotation.y > 0.1);
    assert.ok(model.group.children[0].rotation.y > 0.2);
    assert.ok(head.rotation.x < 0);
    assert.deepEqual(arm.rotation.toArray(), [0, 0, 0, "XYZ"]);
    assert.deepEqual(leg.rotation.toArray(), [0, 0, 0, "XYZ"]);
    for (let i = 0; i < 20; i++)
      model.update(0.05, freshCompanion(), new THREE.Vector3(0, 1.2, 6), {
        vx: -25,
        vy: -5,
        gazeX: -1,
        gazeY: 0.5,
        attention: 1,
      });
    assert.ok(head.rotation.y < -0.2);
    assert.ok(model.group.children[0].rotation.y < -0.2);
    assert.equal(arm.rotation.z, 0);
    assert.equal(leg.rotation.x, 0);
    reducedMotion = true;
    const pose = model.update(
      0.05,
      freshCompanion(),
      new THREE.Vector3(0, 1.2, 6),
    );
    assert.equal(head.rotation.y, 0);
    assert.equal(arm.rotation.z, 0);
    assert.equal(leg.rotation.x, 0);
    assert.equal(pose.wave, 0);
  } finally {
    model.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    model.dispose();
    globalThis.matchMedia = previous;
  }
});
