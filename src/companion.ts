import { stickerLibrary } from "./stickerLibrary";
import {
  MAX_STICKERS,
  randomStickerPlacement,
  stickerMounts,
  type StickerPlacement,
} from "./stickerPlacements";
import { missionsFor } from "./missions";
import type { Farm } from "./engine";
export const cosmetics = [
  {
    id: "pearl",
    kind: "skin",
    name: "Jaune",
    missions: 0,
    color: "#d9ad38",
    accent: "#bc86ed",
    description: "La peinture jaune du modèle original.",
  },
  {
    id: "rose",
    kind: "skin",
    name: "Rose",
    missions: 1,
    color: "#ed87b1",
    accent: "#ed79b0",
    description: "Peinture rose, détails mécaniques et inscriptions préservés.",
  },
  {
    id: "mint",
    kind: "skin",
    name: "Rouge",
    missions: 3,
    color: "#c82d37",
    accent: "#49dfd1",
    description: "Peinture rouge sur les panneaux de la coque.",
  },
  {
    id: "cosmic",
    kind: "skin",
    name: "Noir",
    missions: 6,
    color: "#252932",
    accent: "#b69bff",
    description: "Coque noire avec ses reliefs et marquages conservés.",
  },
  {
    id: "legend-angel",
    kind: "skin",
    name: "Ange",
    missions: 10,
    color: "#f5f1e5",
    accent: "#ffd464",
    rarity: "legendary",
    legendary: "angel",
    description:
      "Coque blanc nacré et or, halo et plumes lumineuses, néons dorés et poussière de lumière.",
  },
  {
    id: "legend-demon",
    kind: "skin",
    name: "Démon",
    missions: 10,
    color: "#211421",
    accent: "#ff354f",
    rarity: "legendary",
    legendary: "demon",
    description:
      "Coque obsidienne et carmin, cornes, néons rouges et braises lumineuses.",
  },
  {
    id: "none",
    kind: "accessory",
    name: "Sans sticker",
    missions: 0,
    description: "La silhouette originale.",
  },
  {
    id: "ribbon",
    kind: "accessory",
    name: "Étoile",
    missions: 0,
    description: "Un autocollant étoilé sur la coque.",
  },
  {
    id: "flower",
    kind: "accessory",
    name: "Fleur",
    missions: 2,
    description: "Un sticker floral collé sur la tête.",
  },
  {
    id: "halo",
    kind: "accessory",
    name: "Circuit",
    missions: 5,
    description: "Un motif de circuit électronique sur la coque.",
  },
  {
    id: "lens-red",
    kind: "lens",
    name: "Rouge d’origine",
    missions: 0,
    color: "#ff3157",
    description: "La lentille rouge du robot original.",
  },
  {
    id: "lens-cyan",
    kind: "lens",
    name: "Cyan",
    missions: 1,
    color: "#36e3f5",
    description: "Un œil lumineux bleu cyan.",
  },
  {
    id: "lens-violet",
    kind: "lens",
    name: "Violet",
    missions: 3,
    color: "#a46bff",
    description: "Une lentille violette et ses reflets.",
  },
  {
    id: "lens-green",
    kind: "lens",
    name: "Vert",
    missions: 5,
    color: "#58ee92",
    description: "Un œil lumineux vert.",
  },
  ...stickerLibrary.map((sticker) => ({
    id: sticker.id,
    kind: "accessory" as const,
    name: sticker.name,
    missions: 0,
    description: "Autocollant à poser sur la coque de Luma.",
  })),
] as const;
export interface Companion {
  skin: string;
  accessory: string;
  lens?: string;
  stickers?: StickerPlacement[];
  unlocked: string[];
}
export const freshCompanion = (): Companion => ({
  skin: "pearl",
  accessory: "ribbon",
  lens: "lens-red",
  stickers: [{ id: "ribbon", slot: 1, rotation: 0 }],
  unlocked: [
    "pearl",
    "none",
    "ribbon",
    "lens-red",
    ...stickerLibrary.map((sticker) => sticker.id),
  ],
});
export function hydrateCompanion(raw: unknown): Companion {
  const base = freshCompanion();
  if (!raw || typeof raw !== "object") return base;
  const v = raw as Partial<Companion>;
  const unlocked = [
    ...new Set([
      ...base.unlocked,
      ...(Array.isArray(v.unlocked)
        ? v.unlocked.filter((id) => cosmetics.some((c) => c.id === id))
        : []),
    ]),
  ];
  const allowed = (id: unknown, kind: string) =>
    typeof id === "string" &&
    unlocked.includes(id) &&
    cosmetics.some((c) => c.id === id && c.kind === kind);
  const legacy = allowed(v.accessory, "accessory")
    ? v.accessory!
    : base.accessory;
  const stickers: StickerPlacement[] = [];
  if (Array.isArray(v.stickers)) {
    for (const entry of v.stickers) {
      if (
        !entry ||
        typeof entry !== "object" ||
        !allowed(entry.id, "accessory") ||
        entry.id === "none" ||
        !Number.isInteger(entry.slot) ||
        entry.slot < 0 ||
        entry.slot >= stickerMounts.length ||
        !Number.isFinite(entry.rotation) ||
        Math.abs(entry.rotation) > 0.3 ||
        stickers.some((s) => s.slot === entry.slot)
      )
        continue;
      stickers.push({
        id: entry.id,
        slot: entry.slot,
        rotation: entry.rotation,
      });
      if (stickers.length === MAX_STICKERS) break;
    }
  } else if (legacy !== "none")
    stickers.push({ id: legacy, slot: 1, rotation: 0 });
  return {
    skin: allowed(v.skin, "skin") ? v.skin! : base.skin,
    accessory: allowed(v.accessory, "accessory")
      ? v.accessory!
      : base.accessory,
    lens: allowed(v.lens, "lens") ? v.lens! : base.lens,
    stickers,
    unlocked,
  };
}
export const companionMissionCount = (farm: Farm) =>
  missionsFor(farm).filter((m) => farm.claimed.includes(m.id)).length;
export function customizeCompanion(farm: Farm, id: string): boolean {
  const c = farm.companion;
  c.stickers ??=
    c.accessory === "none" ? [] : [{ id: c.accessory, slot: 1, rotation: 0 }];
  if (id.startsWith("sticker:remove:")) {
    const slot = Number(id.slice("sticker:remove:".length));
    const index = c.stickers.findIndex((s) => s.slot === slot);
    if (index < 0) return false;
    c.stickers.splice(index, 1);
    c.accessory = c.stickers.at(-1)?.id ?? "none";
    return true;
  }
  if (id === "sticker:shuffle") {
    if (!c.stickers.length) return false;
    const placed: StickerPlacement[] = [];
    for (const sticker of c.stickers)
      placed.push(randomStickerPlacement(sticker.id, placed)!);
    c.stickers = placed;
    return true;
  }
  const item = cosmetics.find((c) => c.id === id);
  if (!item) return false;
  if (
    item.kind === "accessory" &&
    item.id !== "none" &&
    c.stickers.length >= MAX_STICKERS
  )
    return false;
  if (!c.unlocked.includes(id)) {
    if (companionMissionCount(farm) < item.missions) return false;
    c.unlocked.push(id);
  }
  if (item.kind === "accessory") {
    if (id === "none") c.stickers = [];
    else c.stickers.push(randomStickerPlacement(id, c.stickers)!);
  }
  c[item.kind] = id;
  return true;
}
