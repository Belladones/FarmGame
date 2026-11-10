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
/** Project onto the actual head panels, then keep the decal in the head pivot's space. */
export function createRobotStickers(
  head: THREE.Object3D | undefined,
  parent: THREE.Group,
) {
  const stickers = new Map<string, THREE.Object3D>();
  if (!head) return stickers;
  parent.updateWorldMatrix(true, false);
  const position = parent.parent!.localToWorld(
    new THREE.Vector3(0.23, 0.88, 0.14),
  );
  const inverse = parent.matrixWorld.clone().invert();
  for (const id of ["ribbon", "flower", "halo"]) {
    const group = new THREE.Group();
    group.name = `Luma.sticker.${id}`;
    const material = new THREE.MeshStandardMaterial({
      map: stickerTexture(id),
      transparent: true,
      roughness: 0.8,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });
    head.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const geometry = new DecalGeometry(
        object,
        position,
        new THREE.Euler(),
        new THREE.Vector3(0.13, 0.13, 0.3),
      );
      if (!geometry.attributes.position.count) {
        geometry.dispose();
        return;
      }
      geometry.applyMatrix4(inverse);
      group.add(new THREE.Mesh(geometry, material));
    });
    if (!group.children.length) {
      material.map!.dispose();
      material.dispose();
      continue;
    }
    parent.add(group);
    stickers.set(id, group);
  }
  return stickers;
}
