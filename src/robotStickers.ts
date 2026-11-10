import { stickerContourMask } from "./stickerContourMask";
import { stickerArt, stickerAtlas } from "./stickerLibrary";
import { stickerMounts, type StickerPlacement } from "./stickerPlacements";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
function stickerTexture(id: string) {
  const pixels = new Uint8Array(128 * 128 * 4);
  const star = Array.from({ length: 10 }, (_, i) => {
    const angle = (i * Math.PI) / 5 - Math.PI / 2,
      radius = i % 2 ? 22 : 48;
    return [64 + Math.cos(angle) * radius, 64 + Math.sin(angle) * radius];
  });
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const r = Math.hypot(x - 64, y - 64);
      if (r > 59) continue;
      let ink = false;
      if (id === "ribbon") {
        for (let i = 0, j = 9; i < 10; j = i++)
          if (
            star[i][1] > y !== star[j][1] > y &&
            x <
              ((star[j][0] - star[i][0]) * (y - star[i][1])) /
                (star[j][1] - star[i][1]) +
                star[i][0]
          )
            ink = !ink;
      } else if (id === "flower") {
        for (let i = 0; i < 5; i++)
          ink ||=
            Math.hypot(
              x - 64 - Math.cos((i * Math.PI * 2) / 5) * 27,
              y - 64 - Math.sin((i * Math.PI * 2) / 5) * 27,
            ) < 20;
        ink ||= r < 18;
      } else {
        ink =
          (Math.abs(x - 45) < 5 && y > 27 && y < 88) ||
          (Math.abs(y - 85) < 5 && x > 43 && x < 94) ||
          (Math.abs(y - 45) < 5 && x > 43 && x < 86);
        for (const [cx, cy] of [
          [45, 27],
          [85, 45],
          [94, 85],
        ])
          ink ||= Math.hypot(x - cx, y - cy) < 9;
      }
      const color = !ink
        ? [245, 248, 252]
        : id === "ribbon"
          ? [63, 122, 226]
          : id === "flower"
            ? [230, 86, 143]
            : [22, 151, 135];
      const offset = (y * 128 + x) * 4;
      pixels.set([...color, Math.min(255, Math.round((59 - r) * 255))], offset);
    }
  const texture = new THREE.DataTexture(pixels, 128, 128);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
/** Reproject only when saved placements change; no random choices happen while rendering. */
export function createRobotStickers(
  head: THREE.Object3D | undefined,
  headParent: THREE.Group,
  body: THREE.Group,
  asset: THREE.Object3D,
  atlas?: THREE.Texture,
) {
  let signature = "";
  const groups: THREE.Group[] = [],
    textures = new Map<string, THREE.Texture>(),
    masks = new Map<string, THREE.Texture>();
  const clear = () => {
    for (const group of groups) {
      group.removeFromParent();
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    }
    groups.length = 0;
  };
  return {
    update(placements: readonly StickerPlacement[]) {
      const key = JSON.stringify(placements);
      if (signature === key) return;
      signature = key;
      clear();
      body.updateWorldMatrix(true, true);
      for (const placement of placements.slice(0, 3)) {
        const mount = stickerMounts[placement.slot];
        const art = stickerArt(placement.id);
        if (
          !mount ||
          (!art && !["ribbon", "flower", "halo"].includes(placement.id)) ||
          (art && !atlas)
        )
          continue;
        const parent = mount.part === "head" ? headParent : body;
        const source = mount.part === "head" ? head : asset;
        if (!source) continue;
        const point = new THREE.Vector3(...mount.position);
        if (mount.part === "head") point.sub(headParent.position);
        const position = parent.localToWorld(point);
        const orientation = new THREE.Euler().setFromQuaternion(
          parent
            .getWorldQuaternion(new THREE.Quaternion())
            .multiply(
              new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 0, 1),
                placement.rotation,
              ),
            ),
        );
        const inverse = parent.matrixWorld.clone().invert();
        let texture = textures.get(placement.id);
        if (!texture) {
          if (art && atlas) {
            texture = atlas.clone();
            const [x, y, width, height] = art.rect;
            texture.repeat.set(
              width / stickerAtlas.width,
              height / stickerAtlas.height,
            );
            texture.offset.set(
              x / stickerAtlas.width,
              1 - (y + height) / stickerAtlas.height,
            );
            texture.needsUpdate = true;
          } else texture = stickerTexture(placement.id);
          textures.set(placement.id, texture);
        }
        let mask = masks.get(placement.id);
        if (!mask) {
          mask = stickerContourMask(placement.id);
          if (mask) masks.set(placement.id, mask);
        }
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          alphaMap: mask ?? null,
          transparent: true,
          roughness: 0.8,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
        });
        const group = new THREE.Group();
        group.name = `Luma.sticker.${placement.id}.${placement.slot}`;
        source.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const geometry = new DecalGeometry(
            object,
            position,
            orientation,
            new THREE.Vector3(
              mount.size * (art ? Math.min(1, art.rect[2] / art.rect[3]) : 1),
              mount.size * (art ? Math.min(1, art.rect[3] / art.rect[2]) : 1),
              0.3,
            ),
          );
          if (!geometry.attributes.position.count) {
            geometry.dispose();
            return;
          }
          geometry.applyMatrix4(inverse);
          group.add(new THREE.Mesh(geometry, material));
        });
        if (!group.children.length) {
          material.dispose();
          continue;
        }
        parent.add(group);
        groups.push(group);
      }
    },
    dispose() {
      clear();
      textures.forEach((t) => t.dispose());
      textures.clear();
      masks.forEach((mask) => mask.dispose());
      masks.clear();
    },
  };
}
