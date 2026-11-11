import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { fresh, hydrateFarm } from "../src/modules/farm/application/engine";
import { editCompanionSticker } from "../src/modules/companion/domain/companion";
import { validFarm } from "../server/validation";
import {
  surfaceFromHit,
  surfaceWorld,
} from "../src/modules/companion/adapters/three/stickerSurface";
test("free sticker transforms survive hydration and server validation without allowing new stickers", () => {
  const farm = fresh();
  const original = structuredClone(farm.companion.stickers![0]);
  const edited = {
    ...original,
    rotation: Math.PI,
    scale: 1.5,
    surface: {
      mesh: "0/1",
      position: [2, 3, 4] as [number, number, number],
      normal: [0, 0, 1] as [number, number, number],
    },
  };
  assert.equal(editCompanionSticker(farm, edited), true);
  assert.equal(validFarm(farm), true);
  assert.deepEqual(
    hydrateFarm(JSON.parse(JSON.stringify(farm))).companion,
    farm.companion,
  );
  const before = structuredClone(farm.companion);
  for (const invalid of [
    { ...edited, slot: 4 },
    { ...edited, id: "locked" },
    { ...edited, rotation: Infinity },
    { ...edited, scale: 3 },
    {
      ...edited,
      surface: {
        ...edited.surface,
        normal: [0, 0, 0] as [number, number, number],
      },
    },
  ]) {
    assert.equal(editCompanionSticker(farm, invalid), false);
    assert.deepEqual(farm.companion, before);
  }
  assert.equal(editCompanionSticker(farm, { ...original, rotation: 0 }), true);
  assert.equal(farm.companion.stickers![0].surface, undefined);
});
test("surface anchors follow translated, rotated and scaled mesh transforms", () => {
  const root = new THREE.Group(),
    group = new THREE.Group(),
    mesh = new THREE.Mesh(new THREE.BoxGeometry());
  root.add(group);
  group.add(mesh);
  group.position.set(4, 5, 6);
  group.rotation.y = Math.PI / 2;
  group.scale.setScalar(0.1);
  root.updateMatrixWorld(true);
  const local = new THREE.Vector3(1, 2, 3);
  const world = mesh.localToWorld(local.clone());
  const surface = surfaceFromHit(root, {
    object: mesh,
    point: world,
    face: { normal: new THREE.Vector3(0, 0, 1) },
  } as THREE.Intersection)!;
  assert.equal(surface.mesh, "0/0");
  assert.ok(new THREE.Vector3(...surface.position).distanceTo(local) < 1e-10);
  const resolved = surfaceWorld(root, surface)!;
  assert.ok(resolved.point.distanceTo(world) < 1e-10);
  assert.ok(resolved.normal.distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-10);
  mesh.add(new THREE.Group());
  group.position.x += 2;
  assert.ok(
    surfaceWorld(root, surface)!.point.distanceTo(
      world.clone().add(new THREE.Vector3(2, 0, 0)),
    ) < 1e-10,
  );
  mesh.geometry.dispose();
});

test("free decals attach to their mesh, remain visible after rotation and replace only the edited sticker", async () => {
  const { createRobotStickers } =
    await import("../src/modules/companion/adapters/three/robotStickers");
  const root = new THREE.Group(),
    parent = new THREE.Group(),
    mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  root.add(mesh);
  parent.add(root);
  parent.updateMatrixWorld(true);
  const controller = createRobotStickers(mesh, parent, parent, root);
  const placement = {
    id: "ribbon",
    slot: 0,
    rotation: 0,
    surface: {
      mesh: "0",
      position: [0, 0, 0.5] as [number, number, number],
      normal: [0, 0, 1] as [number, number, number],
    },
  };
  controller.update([placement]);
  const first = controller.meshes()[0];
  assert.ok(first.geometry.attributes.position.count > 0);
  assert.equal(first.parent!.parent, mesh);
  const center = new THREE.Box3()
    .setFromObject(first)
    .getCenter(new THREE.Vector3());
  mesh.position.x = 3;
  mesh.rotation.y = Math.PI;
  parent.updateMatrixWorld(true);
  const moved = new THREE.Box3()
    .setFromObject(first)
    .getCenter(new THREE.Vector3());
  assert.ok(Math.abs(moved.x - center.x - 3) < 1e-6);
  assert.ok(moved.z < 0);
  controller.update([placement]);
  assert.equal(controller.meshes()[0], first);
  controller.update([{ ...placement, rotation: Math.PI / 2 }]);
  assert.notEqual(controller.meshes()[0], first);
  assert.equal(controller.meshes().length, 1);
  controller.dispose();
  assert.equal(controller.meshes().length, 0);
  mesh.geometry.dispose();
});
