import * as THREE from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { cosmetics, type Companion } from "./companion";
export async function loadCyberCompanion(
  url = "/models/luma/utility-robot.glb",
) {
  return createCyberCompanion(await new GLTFLoader().loadAsync(url));
}
/** Uses the supplied geometry unchanged; transforms and cosmetics stay separate. */
export function createCyberCompanion(
  gltf: Pick<GLTF, "scene" | "animations"> & {
    parser?: Pick<GLTF["parser"], "json">;
  },
) {
  const group = new THREE.Group(),
    body = new THREE.Group(),
    asset = gltf.scene;
  group.name = "Luma.utility-robot";
  group.add(body);
  const normalized = new THREE.Group();
  body.add(normalized);
  normalized.add(asset);
  const bounds = new THREE.Box3().setFromObject(asset),
    size = bounds.getSize(new THREE.Vector3()),
    center = bounds.getCenter(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0)
    throw new Error("Le modèle de Luma ne contient aucune géométrie visible.");
  const scale = 1.05 / size.y;
  normalized.scale.setScalar(scale);
  normalized.position.set(
    -center.x * scale,
    -bounds.min.y * scale,
    -center.z * scale,
  );
  const originals = new Map<THREE.MeshStandardMaterial, THREE.Color>();
  asset.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.name ||= "Luma.cyber.mesh";
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (m instanceof THREE.MeshStandardMaterial)
          originals.set(m, m.color.clone());
    }
  });
  const accent = new THREE.MeshStandardMaterial({
      color: 0xa68aff,
      emissive: 0x665590,
      emissiveIntensity: 0.3,
      roughness: 0.4,
    }),
    white = new THREE.MeshStandardMaterial({ color: 0xf2f0ff, roughness: 0.4 }),
    gold = new THREE.MeshStandardMaterial({
      color: 0xf4c664,
      emissive: 0xd99430,
      emissiveIntensity: 0.2,
    });
  const accessories = new Map<string, THREE.Object3D>();
  const ribbon = new THREE.Group();
  ribbon.position.set(-0.22, 1.01, 0.26);
  body.add(ribbon);
  for (const side of [-1, 1]) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), white);
    petal.scale.set(0.65, 1.5, 0.3);
    petal.position.x = side * 0.03;
    petal.rotation.z = -side * 0.65;
    ribbon.add(petal);
  }
  accessories.set("ribbon", ribbon);
  const flower = new THREE.Group();
  flower.position.set(0.24, 0.96, 0.26);
  body.add(flower);
  for (let i = 0; i < 5; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), gold),
      a = (i * Math.PI * 2) / 5;
    petal.position.set(Math.cos(a) * 0.025, Math.sin(a) * 0.025, 0);
    petal.scale.z = 0.3;
    flower.add(petal);
  }
  accessories.set("flower", flower);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.008, 8, 32),
    accent,
  );
  halo.position.y = 1.09;
  halo.rotation.x = Math.PI / 2;
  body.add(halo);
  accessories.set("halo", halo);
  const mixer = new THREE.AnimationMixer(asset),
    clip =
      gltf.animations.find((c) => /idle|hover|float/i.test(c.name)) ??
      gltf.animations[0];
  if (clip) mixer.clipAction(clip).play();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let time = 0,
    lastSkin = "";
  body.position.y = 0.29;
  function update(dt: number, appearance: Companion, camera: THREE.Vector3) {
    if (appearance.skin !== lastSkin) {
      const palette = cosmetics.find(
          (c) => c.kind === "skin" && c.id === appearance.skin,
        ),
        tint = new THREE.Color(0xffffff);
      if (appearance.skin !== "pearl" && palette && "color" in palette)
        tint.lerp(new THREE.Color(palette.color), 0.32);
      for (const [m, base] of originals) m.color.copy(base).multiply(tint);
      if (palette && "accent" in palette) accent.color.set(palette.accent);
      lastSkin = appearance.skin;
    }
    for (const [id, o] of accessories) o.visible = id === appearance.accessory;
    if (!reduced.matches) {
      time += dt;
      mixer.update(dt);
      body.position.y = 0.29 + Math.sin(time * 1.7) * 0.04;
    }
    body.rotation.y = Math.atan2(
      camera.x - body.position.x,
      camera.z - body.position.z,
    );
    body.rotation.z = reduced.matches ? 0 : Math.sin(time * 1.1) * 0.035;
    return {
      x: body.position.x,
      y: body.position.y,
      z: body.position.z,
      moving: false,
      facing: body.rotation.y,
      blink: 1,
      wave: 0,
    };
  }
  return {
    group,
    update,
    missingTextures: (gltf.parser?.json?.extras?.missingTextures ??
      []) as string[],
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(asset);
      const materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      group.traverse((o) => {
        if (o instanceof THREE.Mesh)
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            materials.add(m);
            for (const value of Object.values(m))
              if (value instanceof THREE.Texture) textures.add(value);
          }
      });
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
