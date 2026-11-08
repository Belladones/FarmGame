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
      roughness: 0.3,
      metalness: 0.32,
      ...(glow ? { emissive: color, emissiveIntensity: 0.8 } : {}),
    });
    materials.push(m);
    return m;
  };
  const shell = material(0xeee7dc),
    accent = material(0xbc86ed, true),
    joint = material(0x283c45),
    face = material(0xf4f4fc),
    hair = material(0xfafaff),
    hairShadow = material(0xc2c2e8),
    violet = material(0x6966d9),
    iris = material(0x1784e3, true),
    white = material(0xffffff),
    eye = material(0x48e9ed, true),
    petal = material(0xf294a9),
    leaf = material(0x679e70),
    gold = material(0xffd16c, true);
  face.metalness = 0.02;
  face.roughness = 0.75;
  hair.metalness = 0.12;
  hair.roughness = 0.4;
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
  // Solid face and sculpted bob; each hair lock is a tapered 3D ribbon.
  function lock(
    parent: THREE.Object3D,
    points: number[][],
    width: number,
    depth: number,
    m: THREE.Material = hair,
  ) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    );
    const positions: number[] = [],
      indices: number[] = [],
      steps = 14,
      sides = 8;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps,
        p = curve.getPoint(t),
        tangent = curve.getTangent(t);
      const across = new THREE.Vector3(0, 0, 1).cross(tangent).normalize();
      if (across.lengthSq() < 0.01) across.set(1, 0, 0);
      const normal = new THREE.Vector3()
        .crossVectors(tangent, across)
        .normalize();
      const taper = Math.max(0.005, Math.pow(1 - t, 0.55));
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        const v = p
          .clone()
          .addScaledVector(across, Math.cos(a) * width * taper)
          .addScaledVector(normal, Math.sin(a) * depth * taper);
        positions.push(v.x, v.y, v.z);
      }
      if (i < steps)
        for (let j = 0; j < sides; j++) {
          const a = i * sides + j,
            b = i * sides + ((j + 1) % sides);
          indices.push(a, b, a + sides, b, b + sides, a + sides);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, m);
    mesh.name = m === hair || m === hairShadow ? "Luma.hair-lock" : "Luma.trim";
    parent.add(mesh);
    return mesh;
  }
  const head = new THREE.Group();
  head.position.y = 1.13;
  head.scale.setScalar(0.86);
  body.add(head);
  orb(head, hairShadow, 0.259, 0, 0.015, -0.035).scale.set(1, 1.07, 0.8);
  const faceMesh = orb(head, face, 0.226, 0, -0.01, 0.098);
  faceMesh.scale.set(0.91, 1.08, 0.62);
  faceMesh.name = "Luma.face";
  // Back and side locks wrap around the cheeks and flare at the bob's tips.
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * 0.18 + (i / 10) * Math.PI * 1.64,
      x = Math.cos(a) * 0.235,
      z = -0.035 - Math.sin(a) * 0.14;
    lock(
      head,
      [
        [x * 0.25, 0.26, z * 0.35],
        [x * 0.85, 0.15, z],
        [x, -0.09, z + 0.012],
        [x * 1.12, -0.24, z + 0.035],
      ],
      0.062,
      0.022,
      i % 3 === 0 ? hairShadow : hair,
    );
  }
  const eyes: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(side * 0.084, -0.005, 0.232);
    head.add(e);
    e.name = `Luma.eye.${side}`;
    eyes.push(e);
    orb(e, white, 0.062, 0, 0, 0).scale.set(1.03, 1, 0.12);
    orb(e, iris, 0.045, side * 0.004, -0.002, 0.012).scale.set(
      0.88,
      1.05,
      0.19,
    );
    orb(e, iris, 0.028, side * 0.004, -0.002, 0.019).scale.set(
      0.88,
      1.12,
      0.13,
    );
    orb(e, joint, 0.017, side * 0.004, -0.002, 0.024).scale.set(0.7, 1.1, 0.12);
    orb(e, white, 0.012, -0.014, 0.02, 0.027).scale.z = 0.2;
    orb(e, white, 0.005, 0.015, -0.02, 0.028).scale.z = 0.2;
    lock(
      e,
      [
        [-0.055, 0.027, 0.011],
        [-0.032, 0.058, 0.012],
        [0.013, 0.064, 0.012],
        [0.052, 0.035, 0.01],
      ],
      0.008,
      0.006,
      joint,
    );
    const lash = rounded(
      e,
      joint,
      0.034,
      0.009,
      0.008,
      side * 0.052,
      0.035,
      0.013,
      0.003,
    );
    lash.rotation.z = side * 0.45;
    lock(
      head,
      [
        [side * 0.04, 0.095, 0.222],
        [side * 0.09, 0.105, 0.22],
        [side * 0.14, 0.08, 0.217],
      ],
      0.006,
      0.004,
      hairShadow,
    );
    orb(head, petal, 0.022, side * 0.13, -0.083, 0.211).scale.set(
      1.3,
      0.32,
      0.15,
    );
  }
  orb(head, face, 0.018, 0, -0.051, 0.239).scale.set(0.6, 1, 1);
  lock(
    head,
    [
      [-0.022, -0.12, 0.216],
      [0, -0.126, 0.22],
      [0.024, -0.118, 0.215],
    ],
    0.0035,
    0.003,
    petal,
  );
  // Swept, overlapping bangs stop above the irises rather than covering the eyes.
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.052,
      endY = i === 3 ? 0.035 : 0.075 + Math.abs(i - 3) * 0.006;
    lock(
      head,
      [
        [x * 0.45, 0.276, 0.035],
        [x * 0.8, 0.22, 0.19],
        [x, 0.155, 0.25],
        [x + 0.018, endY, 0.258],
      ],
      0.044,
      0.014,
    );
  }
  for (const side of [-1, 1])
    lock(
      head,
      [
        [side * 0.15, 0.22, 0.08],
        [side * 0.23, 0.12, 0.16],
        [side * 0.238, -0.12, 0.15],
        [side * 0.2, -0.245, 0.16],
      ],
      0.041,
      0.018,
    );
  // The cyan ear module and white ornamental bow echo the reference silhouette.
  orb(head, joint, 0.082, -0.246, 0.12, 0.01).scale.set(0.65, 1, 1);
  const earRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.057, 0.012, 8, 24),
    eye,
  );
  earRing.position.set(-0.25, 0.12, 0.064);
  head.add(earRing);
  orb(head, iris, 0.04, -0.25, 0.12, 0.06).scale.z = 0.4;
  // Tapered chest, exposed waist and petal-shaped hip plates replace the skirt.
  rounded(body, joint, 0.075, 0.1, 0.08, 0, 0.87, 0);
  const torsoProfile = [
    [0, 0.39],
    [0.1, 0.4],
    [0.125, 0.44],
    [0.095, 0.49],
    [0.072, 0.56],
    [0.079, 0.62],
    [0.115, 0.68],
    [0.151, 0.74],
    [0.143, 0.8],
    [0.1, 0.84],
    [0, 0.845],
  ];
  const torso = new THREE.Mesh(
    new THREE.LatheGeometry(
      torsoProfile.map(([r, y]) => new THREE.Vector2(r, y)),
      32,
    ),
    shell,
  );
  torso.scale.z = 0.72;
  torso.name = "Luma.armor";
  body.add(torso);
  for (const side of [-1, 1]) {
    orb(body, shell, 0.086, side * 0.075, 0.745, 0.075).scale.set(
      1,
      0.88,
      0.95,
    );
    const hip = orb(body, shell, 0.077, side * 0.074, 0.405, 0);
    hip.scale.set(1, 1.25, 0.9);
    hip.rotation.z = side * -0.16;
  }
  lock(
    body,
    [
      [0, 0.66, 0.069],
      [0.008, 0.57, 0.055],
      [0.033, 0.46, 0.087],
    ],
    0.003,
    0.0025,
    violet,
  );
  const reactorRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.043, 0.011, 8, 28),
    joint,
  );
  reactorRing.name = "Luma.reactor";
  reactorRing.position.set(-0.015, 0.765, 0.163);
  reactorRing.rotation.y = -0.15;
  body.add(reactorRing);
  orb(body, iris, 0.033, -0.015, 0.765, 0.167).scale.z = 0.3;
  orb(body, eye, 0.019, -0.015, 0.765, 0.18).scale.z = 0.3;
  for (const side of [-1, 1])
    lock(
      body,
      [
        [side * 0.055, 0.83, 0.09],
        [side * 0.13, 0.78, 0.13],
        [side * 0.105, 0.64, 0.09],
      ],
      0.004,
      0.003,
      violet,
    );
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
    const sleeve = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          [0, -0.25],
          [0.047, -0.24],
          [0.053, -0.2],
          [0.038, -0.05],
          [0.032, -0.025],
          [0, -0.02],
        ].map(([r, y]) => new THREE.Vector2(r, y)),
        20,
      ),
      side < 0 ? violet : shell,
    );
    sleeve.scale.z = 0.85;
    forearm.add(sleeve);
    rounded(forearm, accent, 0.012, 0.14, 0.01, 0.025, -0.13, 0.04, 0.003);
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
    const thigh = orb(leg, shell, 0.086, side * 0.012, -0.14, 0);
    thigh.scale.set(0.95, 2, 0.9);
    const knee = new THREE.Group();
    knee.position.set(side * 0.012, -0.29, 0);
    leg.add(knee);
    knees.push(knee);
    orb(knee, joint, 0.033, 0, 0, 0);
    const shin = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          [0, -0.33],
          [0.055, -0.325],
          [0.052, -0.28],
          [0.04, -0.11],
          [0.032, -0.045],
          [0, -0.04],
        ].map(([r, y]) => new THREE.Vector2(r, y)),
        20,
      ),
      shell,
    );
    shin.scale.z = 0.85;
    knee.add(shin);
    orb(knee, violet, 0.049, 0, -0.015, 0.035).scale.set(0.85, 1, 0.4);
    rounded(
      knee,
      accent,
      0.011,
      0.19,
      0.009,
      side * 0.025,
      -0.19,
      0.045,
      0.003,
    );
    rounded(knee, shell, 0.09, 0.07, 0.14, 0, -0.355, 0.025, 0.024);
  }
  const ribbon = new THREE.Group();
  head.add(ribbon);
  for (const side of [-1, 1]) {
    const petal = orb(ribbon, hair, 0.06, -0.21 + side * 0.043, 0.225, 0.115);
    petal.scale.set(0.65, 1.55, 0.32);
    petal.rotation.z = side * 0.75;
  }
  orb(ribbon, shell, 0.024, -0.21, 0.225, 0.14);
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
    body.rotation.z = -0.09 + expression.sway;
    head.rotation.x = -Math.min(
      0.75,
      Math.atan2(
        camera.y - (body.position.y + 1.13 * 0.63),
        Math.hypot(dx, dz),
      ),
    );
    head.rotation.z = expression.sway * 0.6 - 0.045;
    eyes.forEach((e) => (e.scale.y = expression.blink));
    arms.forEach((arm, i) => {
      const side = i === 0 ? -1 : 1;
      arm.rotation.z =
        side * (0.16 + expression.sway) +
        (i === 1 ? 0.4 + expression.wave * 1.35 : 0);
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
