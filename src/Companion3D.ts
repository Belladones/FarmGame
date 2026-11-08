import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { cosmetics, type Companion } from "./companion";
export function companionExpression(time: number, reduced = false) {
  if (reduced) return { height: 0.48, blink: 1, wave: 0, sway: 0 };
  const blinkPhase = time % 4.6;
  const blink =
    blinkPhase < 0.18 ? 1 - Math.sin((blinkPhase / 0.18) * Math.PI) * 0.94 : 1;
  const wavePhase = time % 13;
  const wave =
    wavePhase > 2 && wavePhase < 4.8
      ? Math.sin(((wavePhase - 2) / 2.8) * Math.PI)
      : 0;
  return {
    height: 0.48 + Math.sin(time * 1.7) * 0.065,
    blink,
    wave,
    sway: Math.sin(time * 1.1) * 0.055,
  };
}
/** Decorative, camera-facing companion. No ground or agricultural robot is created. */
export function createCompanion() {
  const group = new THREE.Group(),
    body = new THREE.Group();
  group.name = "Luma";
  group.add(body);
  const materials: THREE.MeshStandardMaterial[] = [];
  const material = (color: number, glow = false) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.43,
      metalness: 0.22,
      ...(glow ? { emissive: color, emissiveIntensity: 0.8 } : {}),
    });
    materials.push(m);
    return m;
  };
  const shell = material(0xeee7dc),
    accent = material(0xbc86ed, true),
    joint = material(0x283c45),
    screen = material(0x0b1924),
    eye = material(0x48e9ed, true),
    petal = material(0xf294a9),
    leaf = material(0x679e70),
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
    r = 0.05,
  ) => {
    const o = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 3, h / 3, d / 3)),
      m,
    );
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const orb = (
    parent: THREE.Object3D,
    m: THREE.Material,
    r: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const bloom = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    size: number,
  ) => {
    const f = new THREE.Group();
    f.position.set(x, y, z);
    f.scale.setScalar(size);
    parent.add(f);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const p = orb(
        f,
        petal,
        0.032,
        Math.cos(a) * 0.034,
        Math.sin(a) * 0.034,
        0,
      );
      p.scale.set(0.9, 1.3, 0.35);
      p.rotation.z = a - Math.PI / 2;
    }
    orb(f, gold, 0.018, 0, 0, 0.012);
    for (const side of [-1, 1]) {
      const l = orb(f, leaf, 0.04, side * 0.057, -0.028, -0.012);
      l.scale.set(0.55, 1.5, 0.2);
      l.rotation.z = -side * 0.7;
    }
    return f;
  };
  // A rounded visor, expressive cyan eyes and slender botanical antennae.
  const head = new THREE.Group();
  head.position.y = 1.13;
  body.add(head);
  rounded(head, joint, 0.48, 0.45, 0.33, 0, 0, 0, 0.1);
  rounded(head, shell, 0.5, 0.45, 0.3, 0, 0, 0.035, 0.1);
  rounded(head, accent, 0.435, 0.37, 0.035, 0, -0.005, 0.197, 0.08);
  rounded(head, screen, 0.405, 0.34, 0.045, 0, 0, 0.217, 0.09);
  const eyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const e = orb(head, eye, 0.063, side * 0.097, 0.008, 0.247);
    e.scale.set(0.78, 1.12, 0.22);
    eyes.push(e);
    orb(head, petal, 0.024, side * 0.14, -0.07, 0.242).scale.set(1, 0.3, 0.2);
    const antenna = new THREE.Mesh(
      new THREE.ConeGeometry(0.028, 0.22, 5),
      joint,
    );
    antenna.position.set(side * 0.2, 0.29, -0.01);
    antenna.rotation.z = side * -0.2;
    head.add(antenna);
  }
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.031, 0.005, 5, 16, Math.PI * 0.7),
    eye,
  );
  smile.position.set(0, -0.079, 0.247);
  smile.rotation.z = Math.PI * 1.15;
  head.add(smile);
  bloom(head, -0.23, -0.045, 0.18, 0.7);
  const sprig = orb(head, leaf, 0.046, 0.19, 0.23, 0.015);
  sprig.scale.set(0.45, 1.7, 0.25);
  sprig.rotation.z = -0.5;
  // Tapered chest, exposed waist and petal-shaped hip plates replace the skirt.
  rounded(body, joint, 0.075, 0.1, 0.08, 0, 0.87, 0);
  const chest = rounded(body, shell, 0.25, 0.29, 0.19, 0, 0.69, 0, 0.055);
  chest.rotation.z = -0.035;
  rounded(body, accent, 0.012, 0.23, 0.015, 0, 0.7, 0.1, 0.004);
  orb(body, joint, 0.093, 0, 0.475, 0).scale.set(1, 0.75, 0.9);
  for (const side of [-1, 1]) {
    const hip = rounded(body, shell, 0.1, 0.14, 0.14, side * 0.07, 0.39, 0);
    hip.rotation.z = side * -0.25;
  }
  bloom(body, 0.1, 0.43, 0.085, 0.5);
  const arms: THREE.Group[] = [],
    forearms: THREE.Group[] = [],
    legs: THREE.Group[] = [],
    knees: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.18, 0.8, 0);
    body.add(arm);
    arms.push(arm);
    orb(arm, joint, 0.046, 0, 0, 0);
    orb(arm, shell, 0.068, side * 0.012, 0, 0.01).scale.set(0.85, 1, 0.8);
    rounded(arm, shell, 0.066, 0.19, 0.075, side * 0.018, -0.145, 0);
    const forearm = new THREE.Group();
    forearm.position.set(side * 0.018, -0.25, 0);
    arm.add(forearm);
    forearms.push(forearm);
    orb(forearm, joint, 0.033, 0, 0, 0);
    rounded(forearm, shell, 0.09, 0.2, 0.075, 0, -0.135, 0);
    rounded(forearm, joint, 0.072, 0.028, 0.06, 0, -0.26, 0, 0.008);
    for (let i = 0; i < 3; i++)
      rounded(
        forearm,
        joint,
        0.015,
        0.055,
        0.018,
        (i - 1) * 0.023,
        -0.295,
        0.005,
        0.004,
      );
    const leg = new THREE.Group();
    leg.position.set(side * 0.068, 0.35, 0);
    body.add(leg);
    legs.push(leg);
    orb(leg, joint, 0.04, 0, 0, 0);
    const thigh = orb(leg, shell, 0.072, side * 0.012, -0.095, 0);
    thigh.scale.set(0.85, 1.8, 0.85);
    const knee = new THREE.Group();
    knee.position.set(side * 0.012, -0.2, 0);
    leg.add(knee);
    knees.push(knee);
    orb(knee, joint, 0.033, 0, 0, 0);
    rounded(knee, shell, 0.087, 0.2, 0.085, 0, -0.13, 0);
    rounded(knee, shell, 0.09, 0.07, 0.14, 0, -0.255, 0.025, 0.024);
  }
  const ribbon = new THREE.Group();
  head.add(ribbon);
  for (const side of [-1, 1]) {
    const bow = rounded(
      ribbon,
      accent,
      0.115,
      0.07,
      0.04,
      0.17 + side * 0.055,
      0.215,
      0.15,
      0.025,
    );
    bow.rotation.z = side * 0.4;
  }
  orb(ribbon, petal, 0.027, 0.17, 0.215, 0.18);
  const flower = bloom(head, 0.22, 0.14, 0.2, 1.3);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.012, 8, 40),
    accent,
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.39;
  head.add(halo);
  body.scale.setScalar(0.63);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let time = 0,
    lastSkin = "";
  body.position.set(0, 0.48, 0);
  function update(dt: number, appearance: Companion, camera: THREE.Vector3) {
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
    if (!reduced.matches) time += dt;
    const expression = companionExpression(time, reduced.matches);
    if (!reduced.matches || dt === 0) body.position.y = expression.height;
    // Position may travel in any direction; the face always follows the current camera.
    const dx = camera.x - body.position.x,
      dz = camera.z - body.position.z;
    body.rotation.y = Math.atan2(dx, dz);
    body.rotation.z = expression.sway;
    head.rotation.x = -Math.min(
      0.75,
      Math.atan2(
        camera.y - (body.position.y + 1.13 * 0.63),
        Math.hypot(dx, dz),
      ),
    );
    head.rotation.z = expression.sway * 0.6;
    eyes.forEach((e) => (e.scale.y = 1.12 * expression.blink));
    arms.forEach((arm, i) => {
      const side = i === 0 ? -1 : 1;
      arm.rotation.z =
        side * (0.16 + expression.sway) + (i === 1 ? expression.wave * 1.8 : 0);
      arm.rotation.x = -0.12;
    });
    forearms.forEach(
      (arm, i) =>
        (arm.rotation.x =
          -0.15 -
          (i === 1 ? expression.wave * (0.5 + Math.sin(time * 10) * 0.2) : 0)),
    );
    legs.forEach((leg, i) => {
      leg.rotation.x = i === 0 ? 0.18 : -0.15;
      leg.rotation.z = (i === 0 ? -0.08 : 0.08) + expression.sway * 0.5;
    });
    knees.forEach(
      (knee, i) =>
        (knee.rotation.x = (i === 0 ? 0.22 : 0.48) + expression.sway),
    );
    return {
      x: body.position.x,
      y: body.position.y,
      z: body.position.z,
      moving: false,
      facing: body.rotation.y,
      blink: expression.blink,
      wave: expression.wave,
    };
  }
  return {
    group,
    update,
    dispose: () => materials.forEach((m) => m.dispose()),
  };
}
