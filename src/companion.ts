import { missions } from "./missions";
import type { Farm } from "./engine";
export const cosmetics = [
  {
    id: "pearl",
    kind: "skin",
    name: "Perle",
    missions: 0,
    color: "#d7e7e8",
    accent: "#bc86ed",
    description: "Coque nacrée et lumière lilas.",
  },
  {
    id: "rose",
    kind: "skin",
    name: "Rosée",
    missions: 1,
    color: "#f2bfd4",
    accent: "#ed79b0",
    description: "Une touche de rose au jardin.",
  },
  {
    id: "mint",
    kind: "skin",
    name: "Menthe",
    missions: 3,
    color: "#bce5dd",
    accent: "#49dfd1",
    description: "Reflets turquoise et coque menthe.",
  },
  {
    id: "cosmic",
    kind: "skin",
    name: "Nébuleuse",
    missions: 6,
    color: "#424868",
    accent: "#b69bff",
    description: "Une tenue pour les nuits étoilées.",
  },
  {
    id: "none",
    kind: "accessory",
    name: "Sans accessoire",
    missions: 0,
    description: "La silhouette originale.",
  },
  {
    id: "ribbon",
    kind: "accessory",
    name: "Ruban",
    missions: 0,
    description: "Un petit nœud pastel.",
  },
  {
    id: "flower",
    kind: "accessory",
    name: "Fleur solaire",
    missions: 2,
    description: "Une fleur portée près de l’écran.",
  },
  {
    id: "halo",
    kind: "accessory",
    name: "Halo orbital",
    missions: 5,
    description: "Un anneau lumineux en suspension.",
  },
] as const;
export interface Companion {
  skin: string;
  accessory: string;
  unlocked: string[];
}
export const freshCompanion = (): Companion => ({
  skin: "pearl",
  accessory: "ribbon",
  unlocked: ["pearl", "none", "ribbon"],
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
    unlocked,
  };
}
export const companionMissionCount = (farm: Farm) =>
  missions.filter((m) => farm.claimed.includes(m.id)).length;
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
