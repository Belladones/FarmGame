import bootstrap from "../../../shared/domain/bootstrap.json";
import { stickerLibrary } from "./stickerLibrary";
import {
  MAX_STICKERS,
  randomStickerPlacement,
  stickerMounts,
  type StickerPlacement,
} from "./stickerPlacements";
import { missionsFor } from "../../missions/domain/missions";
import type { Farm } from "../../farm/domain/model";
export type Cosmetic = {
  id: string;
  name: string;
  description: string;
  missions: number;
} & (
  | {
      kind: "skin";
      color: string;
      accent: string;
      rarity?: "legendary";
      legendary?: "angel" | "demon";
    }
  | { kind: "lens"; color: string }
  | { kind: "accessory" }
);
export const cosmetics = structuredClone(
  bootstrap.definitions.cosmetics,
) as Cosmetic[];
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
