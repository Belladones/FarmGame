import * as THREE from "three";
/** Compact open maintenance bay: concrete deck, lift, gantry, tool cabinet and safety markings. */
export function createWorkshopModel() {
  const group = new THREE.Group();
  group.name = "Workshop.maintenance-bay";
  const materials: THREE.MeshStandardMaterial[] = [];
  const material = (color: number, emissive = 0) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.65,
      metalness: 0.25,
      emissive,
      emissiveIntensity: emissive ? 0.65 : 0,
    });
    materials.push(m);
    return m;
  };
  const concrete = material(0x83909a),
    frame = material(0x263d4b),
    panel = material(0xd3dce0),
    orange = material(0xf07829),
    steel = material(0x667e8c),
    dark = material(0x13232d),
    cyan = material(0x6ddddd, 0x31bdce),
    yellow = material(0xe1b74e);
  function box(
    name: string,
    m: THREE.Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  box("Concrete deck", concrete, 1.08, 0.08, 1.08, 0, 0.035, 0);
  box("Rear wall", panel, 0.94, 0.58, 0.065, 0, 0.35, -0.43);
  for (const side of [-1, 1]) {
    box("Steel column", frame, 0.075, 0.68, 0.075, side * 0.45, 0.4, 0.42);
    box("Side panel", panel, 0.055, 0.5, 0.9, side * 0.45, 0.3, 0);
    box("Gantry pillar", steel, 0.045, 0.46, 0.045, side * 0.32, 0.29, -0.02);
    box("Lift rail", steel, 0.11, 0.06, 0.61, side * 0.15, 0.11, 0.13);
  }
  box("Flat roof", frame, 1.02, 0.07, 1, 0, 0.74, 0);
  box("Roof service stripe", orange, 1.025, 0.035, 0.13, 0, 0.79, 0.23);
  box("Service sign", orange, 0.55, 0.12, 0.025, 0, 0.64, 0.475);
  box("Gantry beam", orange, 0.7, 0.07, 0.07, 0, 0.54, -0.02);
  box("Tool carriage", dark, 0.12, 0.09, 0.12, 0.08, 0.47, -0.02);
  box("Suspended tool", steel, 0.035, 0.14, 0.035, 0.08, 0.36, -0.02);
  box("Lift platform", frame, 0.58, 0.04, 0.64, 0, 0.15, 0.12);
  box("Lift center pad", dark, 0.35, 0.025, 0.39, 0, 0.18, 0.13);
  box("Tool cabinet", steel, 0.22, 0.27, 0.16, -0.28, 0.23, -0.29);
  for (let i = 0; i < 3; i++)
    box(
      "Cabinet drawer",
      orange,
      0.18,
      0.012,
      0.02,
      -0.28,
      0.15 + i * 0.065,
      -0.2,
    );
  box("Diagnostic console", frame, 0.17, 0.26, 0.14, 0.31, 0.22, -0.27);
  box("Diagnostic screen", cyan, 0.13, 0.075, 0.012, 0.31, 0.31, -0.19);
  box("Service indicator", cyan, 0.04, 0.055, 0.035, 0.39, 0.61, 0.46);
  for (let i = 0; i < 7; i++)
    box(
      "Entrance safety stripe",
      i % 2 ? dark : yellow,
      0.12,
      0.012,
      0.09,
      -0.36 + i * 0.12,
      0.083,
      0.48,
    );
  return { group, materials };
}
