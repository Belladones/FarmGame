export interface StickerSurface {
  /** Child-index path in the original GLB. Mesh-local coordinates follow head/body transforms. */
  mesh: string;
  position: [number, number, number];
  normal: [number, number, number];
}
export interface StickerPlacement {
  id: string;
  slot: number;
  rotation: number;
  surface?: StickerSurface;
  scale?: number;
}
/** Separate safe panels: lens and joints remain uncovered. Coordinates are in normalized body space. */
export const stickerMounts = [
  {
    part: "head",
    name: "Haut gauche",
    position: [-0.23, 0.88, 0.14],
    size: 0.13,
  },
  {
    part: "head",
    name: "Haut droit",
    position: [0.23, 0.88, 0.14],
    size: 0.13,
  },
  {
    part: "head",
    name: "Bas gauche",
    position: [-0.23, 0.59, 0.14],
    size: 0.11,
  },
  { part: "head", name: "Bas droit", position: [0.23, 0.59, 0.14], size: 0.11 },
  { part: "body", name: "Torse", position: [0, 0.35, 0.03], size: 0.11 },
] as const;
export const MAX_STICKERS = 3;
export function randomStickerPlacement(
  id: string,
  existing: readonly StickerPlacement[],
  random = Math.random,
): StickerPlacement | null {
  if (existing.length >= MAX_STICKERS) return null;
  const slots = stickerMounts
    .map((_, i) => i)
    .filter((i) => !existing.some((s) => s.slot === i));
  if (!slots.length) return null;
  return {
    id,
    slot: slots[
      Math.min(slots.length - 1, Math.floor(random() * slots.length))
    ],
    rotation: (random() - 0.5) * 0.45,
  };
}

export function validStickerSurface(value: unknown): value is StickerSurface {
  if (!value || typeof value !== "object") return false;
  const s = value as StickerSurface;
  const vector = (v: unknown, bound: number): v is [number, number, number] =>
    Array.isArray(v) &&
    v.length === 3 &&
    v.every(
      (n) =>
        typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= bound,
    );
  return (
    typeof s.mesh === "string" &&
    s.mesh.length <= 200 &&
    /^(root|[0-9]+(?:\/[0-9]+)*)$/.test(s.mesh) &&
    vector(s.position, 10000) &&
    vector(s.normal, 1.01) &&
    Math.abs(Math.hypot(...s.normal) - 1) < 0.02
  );
}
export function validStickerPlacement(
  value: unknown,
): value is StickerPlacement {
  if (!value || typeof value !== "object") return false;
  const s = value as StickerPlacement;
  return (
    typeof s.id === "string" &&
    s.id.length <= 64 &&
    Number.isInteger(s.slot) &&
    s.slot >= 0 &&
    s.slot < stickerMounts.length &&
    Number.isFinite(s.rotation) &&
    Math.abs(s.rotation) <= Math.PI &&
    (s.scale === undefined ||
      (Number.isFinite(s.scale) && s.scale >= 0.5 && s.scale <= 2)) &&
    (s.surface === undefined || validStickerSurface(s.surface))
  );
}
