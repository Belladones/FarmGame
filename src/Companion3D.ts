import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { cosmetics, perimeterPoint, type Companion } from "./companion";
/** An ornamental walker on a separate perimeter; never enters the farming simulation. */
export function createCompanion(
  left: number,
  right: number,
  back: number,
  front: number,
) {
  const group = new THREE.Group(),
    walker = new THREE.Group();
  group.add(walker);
  const materials: THREE.Material[] = [];
  const material = (color: number, glow = false) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.18,
      ...(glow ? { emissive: color, emissiveIntensity: 0.7 } : {}),
    });
    materials.push(m);
    return m;
  };
  const shell = material(0xeee7dc),
    accent = material(0xbc86ed, true),
    joint = material(0x3c4557),
    screen = material(0x101824),
    eye = material(0xe9ffff, true),
    pink = material(0xef9ec8, true),
    gold = material(0xffd16c, true);
  const rounded = (
    parent: THREE.Object3D,
    m: THREE.Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    r = 0.055,
  ) => {
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 3, h / 3, d / 3)),
      m,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const orb = (
    parent: THREE.Object3D,
    m: THREE.Material,
    r: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  // Rounded head, layered visor and glowing eyes, facing local +Z.
  const head = new THREE.Group();
  head.position.y = 0.86;
  walker.add(head);
  rounded(head, joint, 0.5, 0.54, 0.4, 0, 0, 0, 0.1);
  rounded(head, shell, 0.53, 0.53, 0.36, 0, 0, 0.04, 0.1);
  rounded(head, accent, 0.44, 0.45, 0.05, 0, 0, 0.232, 0.07);
  rounded(head, screen, 0.37, 0.38, 0.04, 0, 0, 0.264, 0.06);
  for (const x of [-0.085, 0.085]) {
    const e = orb(head, eye, 0.035, x, 0.01, 0.291);
    e.scale.set(0.7, 1.2, 0.4);
    const lash = rounded(
      head,
      eye,
      0.052,
      0.012,
      0.014,
      x + Math.sign(x) * 0.014,
      0.06,
      0.288,
      0.004,
    );
    lash.rotation.z = -Math.sign(x) * 0.5;
    orb(head, pink, 0.017, x * 1.3, -0.065, 0.287).scale.set(1.4, 0.5, 0.3);
  }
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.043, 0.006, 5, 16, Math.PI * 0.7),
    accent,
  );
  smile.position.set(0, -0.065, 0.29);
  smile.rotation.z = Math.PI * 1.15;
  head.add(smile);
  for (const x of [-0.29, 0.29])
    orb(head, joint, 0.063, x, 0, 0).scale.set(0.45, 1, 1);
  rounded(walker, shell, 0.27, 0.25, 0.23, 0, 0.51, 0, 0.06);
  rounded(walker, joint, 0.19, 0.07, 0.17, 0, 0.355, 0);
  // Flared hip shell and small articulated boots.
  const tunic = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.18, 0.16, 8),
    shell,
  );
  tunic.position.y = 0.3;
  walker.add(tunic);
  for (const x of [-0.04, 0, 0.04])
    orb(walker, x === 0 ? eye : accent, 0.013, x, 0.52, 0.122);
  const arms: THREE.Group[] = [],
    legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.18, 0.61, 0);
    walker.add(arm);
    arms.push(arm);
    orb(arm, joint, 0.052, 0, 0, 0);
    rounded(arm, shell, 0.085, 0.24, 0.09, side * 0.025, -0.15, 0);
    orb(arm, joint, 0.035, side * 0.03, -0.29, 0);
    const leg = new THREE.Group();
    leg.position.set(side * 0.09, 0.235, 0);
    walker.add(leg);
    legs.push(leg);
    rounded(leg, joint, 0.055, 0.12, 0.06, 0, -0.07, 0);
    rounded(leg, shell, 0.09, 0.1, 0.11, 0, -0.145, 0);
    rounded(leg, shell, 0.12, 0.06, 0.19, 0, -0.205, 0.035, 0.02);
  }
  const ribbon = new THREE.Group();
  head.add(ribbon);
  for (const side of [-1, 1]) {
    const bow = rounded(
      ribbon,
      accent,
      0.14,
      0.08,
      0.05,
      0.16 + side * 0.065,
      0.245,
      0.16,
      0.025,
    );
    bow.rotation.z = side * 0.4;
  }
  orb(ribbon, pink, 0.036, 0.16, 0.245, 0.19);
  const flower = new THREE.Group();
  head.add(flower);
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    orb(
      flower,
      gold,
      0.039,
      0.23 + Math.cos(a) * 0.052,
      0.2 + Math.sin(a) * 0.052,
      0.22,
    );
  }
  orb(flower, shell, 0.032, 0.23, 0.2, 0.247);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.014, 8, 40),
    accent,
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.37;
  head.add(halo);
  walker.scale.setScalar(0.64);
  // A narrow maintenance walkway supports her feet outside every placed building.
  const path = material(0x304754),
    trim = material(0x6c8592);
  const w = right - left,
    h = front - back;
  for (const z of [back, front]) {
    rounded(group, path, w + 0.3, 0.1, 0.3, (left + right) / 2, -0.06, z, 0.02);
    rounded(
      group,
      trim,
      w + 0.3,
      0.015,
      0.025,
      (left + right) / 2,
      -0.002,
      z + 0.13,
      0.004,
    );
  }
  for (const x of [left, right])
    rounded(group, path, 0.3, 0.1, h, x, -0.06, (back + front) / 2, 0.02);
  const perimeter = 2 * (w + h);
  let distance = w * 0.6,
    direction = 1,
    remaining = 0,
    wait = 0.5,
    phase = 0,
    lastSkin = "";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function update(dt: number, appearance: Companion) {
    if (appearance.skin !== lastSkin) {
      const c = cosmetics.find(
        (c) => c.kind === "skin" && c.id === appearance.skin,
      );
      if (c && "color" in c) {
        shell.color.set(c.color);
        accent.color.set(c.accent);
        accent.emissive.set(c.accent);
      }
      lastSkin = appearance.skin;
    }
    ribbon.visible = appearance.accessory === "ribbon";
    flower.visible = appearance.accessory === "flower";
    halo.visible = appearance.accessory === "halo";
    let moving = false;
    if (!reduced.matches) {
      if (wait > 0) wait -= dt;
      else {
        if (remaining <= 0) {
          direction = Math.random() < 0.5 ? -1 : 1;
          remaining = 0.8 + Math.random() * perimeter * 0.55;
        }
        const step = Math.min(remaining, dt * 0.38);
        distance += direction * step;
        remaining -= step;
        moving = true;
        phase += dt * 8;
        if (remaining <= 0) wait = 1 + Math.random() * 3;
      }
    }
    const p = perimeterPoint(distance, left, right, back, front);
    walker.position.set(
      p.x,
      moving ? Math.abs(Math.sin(phase)) * 0.012 : 0,
      p.z,
    );
    const facing = p.heading + (direction < 0 ? Math.PI : 0);
    walker.rotation.y +=
      Math.atan2(
        Math.sin(facing - walker.rotation.y),
        Math.cos(facing - walker.rotation.y),
      ) * Math.min(1, dt * 7);
    arms.forEach(
      (a, i) =>
        (a.rotation.x = moving ? Math.sin(phase + i * Math.PI) * 0.4 : 0),
    );
    legs.forEach(
      (a, i) =>
        (a.rotation.x = moving ? Math.sin(phase + i * Math.PI) * 0.28 : 0),
    );
    head.rotation.z = reduced.matches ? 0 : Math.sin(phase * 0.15) * 0.035;
    return { x: p.x, z: p.z, moving };
  }
  return {
    group,
    update,
    dispose: () => materials.forEach((m) => m.dispose()),
  };
}
