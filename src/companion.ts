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
] as const;
export interface Companion {
  skin: string;
  accessory: string;
  lens?: string;
  unlocked: string[];
}
export const freshCompanion = (): Companion => ({
  skin: "pearl",
  accessory: "ribbon",
  lens: "lens-red",
  unlocked: ["pearl", "none", "ribbon", "lens-red"],
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
  return {
    skin: allowed(v.skin, "skin") ? v.skin! : base.skin,
    accessory: allowed(v.accessory, "accessory")
      ? v.accessory!
      : base.accessory,
    lens: allowed(v.lens, "lens") ? v.lens! : base.lens,
    unlocked,
  };
}
export const companionMissionCount = (farm: Farm) =>
  missionsFor(farm).filter((m) => farm.claimed.includes(m.id)).length;
export function customizeCompanion(farm: Farm, id: string): boolean {
  const item = cosmetics.find((c) => c.id === id);
  if (!item) return false;
  const c = farm.companion;
  if (!c.unlocked.includes(id)) {
    if (companionMissionCount(farm) < item.missions) return false;
    c.unlocked.push(id);
  }
  c[item.kind] = id;
  return true;
}
