import * as THREE from "three";
export type LegendaryStyle = "angel" | "demon" | undefined;
/** Skin ornaments are static; only the small bounded aura animates. No limb animation. */
export function createLegendaryEffects(
  body: THREE.Group,
  headParent: THREE.Group,
) {
  const angel = new THREE.Group(),
    demon = new THREE.Group();
  angel.name = "Luma.legendary.angel";
  demon.name = "Luma.legendary.demon";
  body.add(angel, demon);
  const angelHead = new THREE.Group(),
    demonHead = new THREE.Group();
  angelHead.position.copy(headParent.position).multiplyScalar(-1);
  demonHead.position.copy(angelHead.position);
  headParent.add(angelHead, demonHead);
  const gold = new THREE.MeshBasicMaterial({
    color: 0xffda71,
    toneMapped: false,
  });
  const crimson = new THREE.MeshBasicMaterial({
    color: 0xff3856,
    toneMapped: false,
  });
  const goldGlow = new THREE.MeshBasicMaterial({
    color: 0xffc14a,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const redGlow = new THREE.MeshBasicMaterial({
    color: 0xff234c,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  function tube(
    parent: THREE.Group,
    points: number[][],
    core: THREE.Material,
    glow: THREE.Material,
    radius = 0.003,
  ) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      "centripetal",
    );
    parent.add(
      new THREE.Mesh(new THREE.TubeGeometry(curve, 40, radius, 5, false), core),
    );
    parent.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 40, radius * 3, 5, false),
        glow,
      ),
    );
  }
  const frame = [
    [-0.29, 0.54, 0.164],
    [-0.31, 0.58, 0.164],
    [-0.31, 0.96, 0.164],
    [-0.26, 1.015, 0.164],
    [0.26, 1.015, 0.164],
    [0.31, 0.96, 0.164],
    [0.31, 0.58, 0.164],
    [0.29, 0.54, 0.164],
  ];
  tube(angelHead, frame, gold, goldGlow, 0.0025);
  tube(demonHead, frame, crimson, redGlow, 0.0025);
  for (const [parent, material, radius] of [
    [angelHead, gold, 0.23],
    [angelHead, goldGlow, 0.238],
  ] as const) {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(radius, material === gold ? 0.004 : 0.014, 6, 48),
      material,
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 1.13, 0.02);
    parent.add(halo);
  }
  const hornMaterial = new THREE.MeshStandardMaterial({
    color: 0x251422,
    metalness: 0.5,
    roughness: 0.2,
    emissive: 0x7c122e,
    emissiveIntensity: 0.5,
  });
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.17, 10),
      hornMaterial,
    );
    horn.position.set(side * 0.235, 1.085, 0.02);
    horn.rotation.z = -side * 0.3;
    demonHead.add(horn);
    tube(
      demonHead,
      [
        [side * 0.22, 1.015, 0.05],
        [side * 0.25, 1.09, 0.05],
        [side * 0.26, 1.16, 0.02],
      ],
      crimson,
      redGlow,
      0.0025,
    );
    for (let feather = 0; feather < 3; feather++)
      tube(
        angel,
        [
          [side * 0.16, 0.46, -0.2],
          [side * (0.37 + feather * 0.025), 0.58, -0.25],
          [side * (0.43 + feather * 0.02), 0.82 - feather * 0.09, -0.23],
        ],
        gold,
        goldGlow,
        0.0025,
      );
  }
  const count = 28,
    positions = new Float32Array(count * 3),
    seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = i / count;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  const particleMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      color: { value: new THREE.Color(0xffd471) },
      time: { value: 0 },
    },
    vertexShader: `attribute float seed; varying float vSeed; void main(){vSeed=seed;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=3.0+seed*2.0;}`,
    fragmentShader: `uniform vec3 color;uniform float time;varying float vSeed;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;float a=pow(1.0-r*2.0,1.6)*(.6+.4*sin(time*2.0+vSeed*28.0));gl_FragColor=vec4(color,a);}`,
  });
  const particles = new THREE.Points(geometry, particleMaterial);
  particles.name = "Luma.legendary.particles";
  particles.frustumCulled = false;
  body.add(particles);
  let elapsed = 0;
  function update(style: LegendaryStyle, dt: number, reduced: boolean) {
    angel.visible = angelHead.visible = style === "angel";
    demon.visible = demonHead.visible = style === "demon";
    particles.visible = !!style && !reduced;
    if (!style) return;
    if (!reduced) elapsed += Math.max(0, Math.min(0.1, dt));
    particleMaterial.uniforms.color.value.set(
      style === "angel" ? 0xffd471 : 0xff3856,
    );
    particleMaterial.uniforms.time.value = elapsed;
    for (let i = 0; i < count; i++) {
      const phase = i * 2.39996 + elapsed * (style === "angel" ? 0.18 : -0.16),
        rise = (i / count + elapsed * 0.1) % 1;
      positions[i * 3] = Math.cos(phase) * (0.32 + (i % 3) * 0.045);
      positions[i * 3 + 1] = 0.09 + rise * 1.14;
      positions[i * 3 + 2] = Math.sin(phase) * 0.24 + 0.15;
    }
    geometry.attributes.position.needsUpdate = true;
  }
  update(undefined, 0, false);
  return {
    update,
    dispose() {
      const materials = new Set<THREE.Material>();
      for (const root of [angel, demon, angelHead, demonHead, particles]) {
        root.removeFromParent();
        root.traverse((o) => {
          if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
            o.geometry.dispose();
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material])
              materials.add(m);
          }
        });
      }
      materials.forEach((m) => m.dispose());
    },
  };
}
