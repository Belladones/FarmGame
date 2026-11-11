import * as THREE from "three";
import type { StickerSurface } from "../../domain/stickerPlacements";
export function meshPath(root: THREE.Object3D, mesh: THREE.Object3D): string {
  if (mesh === root) return "root";
  const path: number[] = [];
  let item: THREE.Object3D | null = mesh;
  while (item && item !== root) {
    const parent: THREE.Object3D | null = item.parent;
    if (!parent) return "";
    path.unshift(parent.children.indexOf(item));
    item = parent;
  }
  return item === root ? path.join("/") : "";
}
export function surfaceMesh(
  root: THREE.Object3D,
  path: string,
): THREE.Mesh | undefined {
  let item: THREE.Object3D | undefined = root;
  if (path !== "root")
    for (const index of path.split("/")) item = item?.children[Number(index)];
  return item instanceof THREE.Mesh && !item.userData.lumaDecal
    ? item
    : undefined;
}
export function surfaceFromHit(
  root: THREE.Object3D,
  hit: THREE.Intersection,
): StickerSurface | undefined {
  if (!(hit.object instanceof THREE.Mesh) || !hit.face) return;
  const mesh = meshPath(root, hit.object);
  if (!mesh) return;
  return {
    mesh,
    position: hit.object.worldToLocal(hit.point.clone()).toArray() as [
      number,
      number,
      number,
    ],
    normal: hit.face.normal.clone().normalize().toArray() as [
      number,
      number,
      number,
    ],
  };
}
export function surfaceWorld(root: THREE.Object3D, surface: StickerSurface) {
  const mesh = surfaceMesh(root, surface.mesh);
  if (!mesh) return;
  mesh.updateWorldMatrix(true, false);
  return {
    mesh,
    point: mesh.localToWorld(new THREE.Vector3(...surface.position)),
    normal: new THREE.Vector3(...surface.normal)
      .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld))
      .normalize(),
  };
}
