export interface StickerPlacement {
  id: string;
  slot: number;
  rotation: number;
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
