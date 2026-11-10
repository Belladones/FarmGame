import * as THREE from "three";
/** Keep picking independent of React. A dragged/cancelled gesture never opens a building. */
export function attachBuildingPicking(
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  root: THREE.Object3D,
  onWorkshop: (id: string) => void,
) {
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  let press: { x: number; y: number; drag: boolean } | undefined;
  const down = (event: PointerEvent) => {
    press =
      event.isPrimary && event.button === 0
        ? { x: event.clientX, y: event.clientY, drag: false }
        : undefined;
  };
  const move = (event: PointerEvent) => {
    if (
      press &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6
    )
      press.drag = true;
  };
  const cancel = () => {
    press = undefined;
  };
  const up = (event: PointerEvent) => {
    const tap = press;
    press = undefined;
    if (!tap || tap.drag) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    camera.updateMatrixWorld();
    root.updateWorldMatrix(true, true);
    raycaster.setFromCamera(pointer, camera);
    let hit: THREE.Object3D | undefined = raycaster.intersectObject(
      root,
      true,
    )[0]?.object;
    while (hit && !hit.userData.workshopId) hit = hit.parent ?? undefined;
    if (hit) onWorkshop(hit.userData.workshopId);
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", cancel);
  return () => {
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("pointercancel", cancel);
  };
}
