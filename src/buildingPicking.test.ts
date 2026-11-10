import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { attachBuildingPicking } from "./scene/buildingPicking";
function setup(occluded = false) {
  const canvas = Object.assign(new EventTarget(), {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }),
  }) as unknown as HTMLCanvasElement;
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 100);
  camera.position.z = 5;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  const root = new THREE.Group(),
    workshop = new THREE.Group();
  workshop.userData.workshopId = "b2";
  root.add(workshop);
  const material = new THREE.MeshBasicMaterial(),
    geometry = new THREE.BoxGeometry(1, 1, 1);
  workshop.add(new THREE.Mesh(geometry, material));
  if (occluded) {
    const blocker = new THREE.Mesh(geometry, material);
    blocker.position.z = 2;
    root.add(blocker);
  }
  const opened: string[] = [];
  const dispose = attachBuildingPicking(canvas, camera, root, (id) =>
    opened.push(id),
  );
  const event = (type: string, x = 100, y = 100, primary = true) => {
    const e = new Event(type);
    Object.assign(e, { clientX: x, clientY: y, isPrimary: primary, button: 0 });
    canvas.dispatchEvent(e);
  };
  return {
    opened,
    event,
    dispose: () => {
      dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
test("building taps open the workshop; drags, cancelled gestures and disposed listeners do not", () => {
  const t = setup();
  try {
    t.event("pointerdown");
    t.event("pointerup");
    assert.deepEqual(t.opened, ["b2"]);
    t.event("pointerdown");
    t.event("pointermove", 140);
    t.event("pointermove", 100);
    t.event("pointerup");
    t.event("pointerdown");
    t.event("pointercancel");
    t.event("pointerup");
    t.event("pointerdown");
    t.event("pointerdown", 100, 100, false);
    t.event("pointerup");
    assert.equal(t.opened.length, 1);
    t.dispose();
    t.event("pointerdown");
    t.event("pointerup");
    assert.equal(t.opened.length, 1);
  } finally {
    t.dispose();
  }
});
test("a workshop cannot be clicked through an opaque building in front", () => {
  const t = setup(true);
  try {
    t.event("pointerdown");
    t.event("pointerup");
    assert.deepEqual(t.opened, []);
  } finally {
    t.dispose();
  }
});
