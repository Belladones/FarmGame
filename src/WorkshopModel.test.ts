import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createWorkshopModel } from "./modules/equipment/adapters/three/WorkshopModel";
import { fresh, assetUpgradeBlocker, upgradeAsset } from "./modules/farm/application/engine";
import { research } from "./modules/research/domain/catalog";
test("workshop has an open service bay and fits its square concrete building slot", () => {
  const model = createWorkshopModel();
  const bounds = new THREE.Box3().setFromObject(model.group),
    size = bounds.getSize(new THREE.Vector3());
  assert.ok(size.x <= 1.1 && size.z <= 1.1 && size.y < 1);
  for (const name of [
    "Concrete deck",
    "Lift platform",
    "Tool carriage",
    "Diagnostic screen",
    "Entrance safety stripe",
  ])
    assert.ok(model.group.getObjectByName(name));
  model.group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
  model.materials.forEach((m) => m.dispose());
});
test("selected workshop gates robot upgrades using its own level", () => {
  const f = fresh();
  f.unlocks = research.filter((r) => !r.localOnly).map((r) => r.id);
  f.buildings[0].upgrades = { storage: 4 };
  f.resources = { Wood: 10000, Hay: 10000 };
  f.robots[0].equipment = { hold: 2 };
  const base = {
    ...structuredClone(f.buildings[0]),
    kind: "Workshop" as const,
    inventory: {},
    upgrades: { workshop: 1 },
  };
  f.buildings.push(
    { ...base, id: "small" },
    { ...structuredClone(base), id: "large", upgrades: { workshop: 3 } },
  );
  assert.match(
    assetUpgradeBlocker(f, "robot", "f1", "hold", "small")!,
    /atelier/,
  );
  assert.equal(upgradeAsset(f, "robot", "f1", "hold", "small"), false);
  assert.equal(assetUpgradeBlocker(f, "robot", "f1", "hold", "large"), null);
  assert.equal(upgradeAsset(f, "robot", "f1", "hold", "large"), true);
  assert.equal(f.robots[0].equipment!.hold, 3);
  assert.equal(upgradeAsset(f, "robot", "f1", "hold", "missing"), false);
});
