import { createLegendaryEffects } from "./legendaryEffects";
import { loadStickerAtlas } from "./stickerAtlasTexture";
import { robotPaint } from "./robotPaint";
import { createRobotStickers } from "./robotStickers";
import {
  companionLife,
  restMotion,
  type CompanionMotion,
} from "../../domain/companionMotion";
import * as THREE from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { cosmetics, type Companion } from "../../domain/companion";
export async function loadCyberCompanion(
  url = "/models/luma/utility-robot.glb",
) {
  const [gltf, atlas] = await Promise.all([
    new GLTFLoader().loadAsync(url),
    loadStickerAtlas(),
  ]);
  return createCyberCompanion(gltf, atlas);
}
/** Uses the supplied geometry unchanged; transforms and cosmetics stay separate. */
export function createCyberCompanion(
  gltf: Pick<GLTF, "scene" | "animations"> & {
    parser?: Pick<GLTF["parser"], "json">;
  },
  atlas?: THREE.Texture,
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
  const head = asset.getObjectByName("LumaHeadJoint");
  const finishes = new Map<
    THREE.MeshStandardMaterial,
    { roughness: number; metalness: number }
  >();
  const glowLevels = new Map<THREE.MeshStandardMaterial, number>();
  const paints = new Map<
    THREE.MeshStandardMaterial,
    ReturnType<typeof robotPaint>
  >();
  asset.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.name ||= "Luma.cyber.mesh";
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (m instanceof THREE.MeshStandardMaterial) {
          if (!paints.has(m)) paints.set(m, robotPaint(m));
          glowLevels.set(m, m.emissiveIntensity);
          finishes.set(m, { roughness: m.roughness, metalness: m.metalness });
        }
    }
  });
  const headAccessories = new THREE.Group();
  body.add(headAccessories);
  if (head) {
    group.updateMatrixWorld(true);
    headAccessories.position.copy(
      body.worldToLocal(head.getWorldPosition(new THREE.Vector3())),
    );
  }
  const effects = createLegendaryEffects(body, headAccessories);
  const accessories = createRobotStickers(
    head,
    headAccessories,
    body,
    asset,
    atlas,
  );
  const mixer = new THREE.AnimationMixer(asset),
    clip =
      gltf.animations.find((c) => /idle|hover|float/i.test(c.name)) ??
      gltf.animations[0];
  if (clip) mixer.clipAction(clip).play();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let time = 0;
  body.position.y = 0.29;
  function update(
    dt: number,
    appearance: Companion,
    camera: THREE.Vector3,
    motion: CompanionMotion = restMotion,
  ) {
    const skin = cosmetics.find(
      (c) => c.kind === "skin" && c.id === appearance.skin,
    );
    const lens = cosmetics.find(
      (c) => c.kind === "lens" && c.id === appearance.lens,
    );
    const legendary = skin && "legendary" in skin ? skin.legendary : undefined;
    for (const [material, base] of finishes) {
      material.roughness = legendary ? 0.18 : base.roughness;
      material.metalness =
        legendary === "angel"
          ? 0.22
          : legendary === "demon"
            ? 0.5
            : base.metalness;
    }
    for (const uniforms of paints.values()) {
      uniforms.lumaLegendary.value =
        legendary === "angel" ? 1 : legendary === "demon" ? 2 : 0;
      uniforms.lumaTime.value = time;
      uniforms.lumaShimmer.value = legendary && !reduced.matches ? 1 : 0;
      uniforms.lumaLegendAccent.value.set(
        legendary === "angel" ? "#ffd464" : "#ff354f",
      );
      uniforms.lumaPaintEnabled.value = appearance.skin === "pearl" ? 0 : 1;
      if (skin && "color" in skin) uniforms.lumaPaint.value.set(skin.color);
      uniforms.lumaLensEnabled.value = lens && lens.id !== "lens-red" ? 1 : 0;
      if (lens && "color" in lens) uniforms.lumaLens.value.set(lens.color);
    }
    accessories.update(
      appearance.stickers ??
        (appearance.accessory === "none"
          ? []
          : [{ id: appearance.accessory, slot: 1, rotation: 0 }]),
    );
    const delta = Math.max(0, Math.min(dt, 0.1));
    if (!reduced.matches) {
      time += delta;
      mixer.update(delta);
    }
    effects.update(legendary, delta, reduced.matches);
    const life = companionLife(time, motion, reduced.matches);
    const easing = reduced.matches ? 1 : 1 - Math.exp(-6 * delta);
    body.position.y = life.height;
    const facing = Math.atan2(
      camera.x - body.position.x,
      camera.z - body.position.z,
    );
    const targetYaw = facing + life.bodyYaw;
    // Shortest arc avoids spinning when a camera direction crosses -π / +π.
    const yawDelta = Math.atan2(
      Math.sin(targetYaw - body.rotation.y),
      Math.cos(targetYaw - body.rotation.y),
    );
    body.rotation.y +=
      yawDelta * (reduced.matches ? 1 : 1 - Math.exp(-4 * delta));
    body.rotation.z += (life.roll - body.rotation.z) * easing;
    body.rotation.x += (life.pitch - body.rotation.x) * easing;
    if (head) {
      const gazeEasing = reduced.matches ? 1 : 1 - Math.exp(-12 * delta);
      head.rotation.y += (life.headYaw - head.rotation.y) * gazeEasing;
      head.rotation.x += (life.headPitch - head.rotation.x) * gazeEasing;
      headAccessories.rotation.copy(head.rotation);
    }
    for (const [material, base] of glowLevels)
      material.emissiveIntensity = base * life.glow;
    return {
      x: body.position.x,
      y: body.position.y,
      z: body.position.z,
      moving: !reduced.matches && Math.hypot(motion.vx, motion.vy) > 0.5,
      facing: body.rotation.y,
      blink: 1,
      wave: life.wave,
    };
  }
  return {
    group,
    update,
    missingTextures: (gltf.parser?.json?.extras?.missingTextures ??
      []) as string[],
    dispose() {
      effects.dispose();
      accessories.dispose();
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
