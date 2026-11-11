import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { StickerPlacement } from "../../domain/stickerPlacements";
import { surfaceFromHit, surfaceWorld } from "./stickerSurface";
import type { loadCyberCompanion } from "./CyberCompanion";
export type ProfileMode = "orbit" | "move" | "rotate";
export interface ProfileInteractionState {
  mode: ProfileMode;
  selected?: StickerPlacement;
  onPreview: (placement: StickerPlacement | null) => void;
  onCommit: (placement: StickerPlacement) => void;
  onSelect: (slot: number) => void;
}
export function attachProfileInteraction(
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  controls: OrbitControls,
  model: Awaited<ReturnType<typeof loadCyberCompanion>>,
  state: () => ProfileInteractionState,
) {
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  let gesture: {
    id: number;
    start: StickerPlacement;
    draft: StickerPlacement;
    angle: number;
    center: THREE.Vector2;
  } | null = null;
  function aim(event: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      (-(event.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    model.group.updateWorldMatrix(true, true);
  }
  function hitSurface(event: PointerEvent) {
    aim(event);
    const hit = ray.intersectObjects(model.surfaceMeshes, false)[0];
    return hit ? surfaceFromHit(model.asset, hit) : undefined;
  }
  function selectedCenter(placement: StickerPlacement, event: PointerEvent) {
    const anchor = placement.surface
      ? surfaceWorld(model.asset, placement.surface)
      : undefined;
    if (anchor) {
      const p = anchor.point.project(camera),
        r = canvas.getBoundingClientRect();
      return new THREE.Vector2(
        r.left + ((p.x + 1) * r.width) / 2,
        r.top + ((1 - p.y) * r.height) / 2,
      );
    }
    aim(event);
    const hit = ray
      .intersectObjects(model.stickerMeshes(), false)
      .find((h) => h.object.userData.stickerSlot === placement.slot);
    if (hit) {
      const p = hit.point.project(camera),
        r = canvas.getBoundingClientRect();
      return new THREE.Vector2(
        r.left + ((p.x + 1) * r.width) / 2,
        r.top + ((1 - p.y) * r.height) / 2,
      );
    }
    return new THREE.Vector2(event.clientX, event.clientY - 40);
  }
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const s = state();
    if (s.mode === "orbit") return;
    if (gesture) {
      cancel();
      return;
    }
    let selected = s.selected;
    aim(event);
    const bodyHit = ray.intersectObjects(model.surfaceMeshes, false)[0];
    const stickerHit = ray.intersectObjects(model.stickerMeshes(), false)[0];
    if (
      stickerHit &&
      (!bodyHit || stickerHit.distance <= bodyHit.distance + 0.015) &&
      stickerHit.object.userData.stickerSlot !== selected?.slot
    ) {
      s.onSelect(stickerHit.object.userData.stickerSlot);
      return;
    }
    // An explicit loadout selection determines which sticker is edited.
    if (!selected) return;
    const surface = hitSurface(event);
    if (s.mode === "move" && !surface) return;
    const center = selectedCenter(selected, event),
      draft = {
        ...structuredClone(selected),
        ...(s.mode === "move" ? { surface } : {}),
      };
    gesture = {
      id: event.pointerId,
      start: structuredClone(selected),
      draft,
      center,
      angle: Math.atan2(event.clientY - center.y, event.clientX - center.x),
    };
    controls.enabled = false;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
    s.onPreview(draft);
  };
  const move = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (state().mode === "move") {
      const surface = hitSurface(event);
      if (surface) gesture.draft = { ...gesture.draft, surface };
    } else {
      const angle = Math.atan2(
        event.clientY - gesture.center.y,
        event.clientX - gesture.center.x,
      );
      gesture.draft = {
        ...gesture.draft,
        rotation: Math.atan2(
          Math.sin(gesture.start.rotation + angle - gesture.angle),
          Math.cos(gesture.start.rotation + angle - gesture.angle),
        ),
      };
    }
    state().onPreview(gesture.draft);
    event.preventDefault();
  };
  const up = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const finished = gesture.draft;
    gesture = null;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    state().onCommit(finished);
    state().onPreview(null);
    controls.enabled = state().mode === "orbit";
  };
  function cancel() {
    if (!gesture) return;
    const id = gesture.id;
    gesture = null;
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    state().onPreview(null);
    controls.enabled = state().mode === "orbit";
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", cancel);
  return () => {
    cancel();
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("pointercancel", cancel);
  };
}
