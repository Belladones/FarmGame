import { research, type Research } from "./catalog";
export interface ResearchGroup {
  id: string;
  title: string;
  steps: string[];
  initialLevel: number;
}
const tiers = (base: string, max: number) => [
  base,
  ...Array.from({ length: max - 1 }, (_, i) => base + (i + 2)),
];
const group = (
  id: string,
  title: string,
  steps: string[],
  initialLevel = 0,
): ResearchGroup => ({ id, title, steps, initialLevel });
/** Display groups only: persisted unlock IDs, costs and effects remain unchanged. */
export const researchGroups: ResearchGroup[] = [
  group(
    "grass-base",
    "Herbe",
    Array.from({ length: 9 }, (_, i) => "grass" + (i + 2)),
    1,
  ),
  group("wheat-base", "Blé", [
    "wheat-base",
    "wheat",
    "wheat3",
    "wheat4",
    "wheat5",
  ]),
  ...(
    [
      ["bush", "Buisson"],
      ["carrot", "Carottes"],
      ["tree", "Arbre"],
      ["pumpkin", "Citrouille"],
    ] as const
  ).map(([id, title]) => group(id, title, tiers(id, 10))),
  group("extension", "Expansion", [
    "extension",
    ...Array.from({ length: 8 }, (_, i) => "extension" + (i + 3)),
  ]),
  group("watering", "Eau", tiers("watering", 9)),
  group(
    "storage2",
    "Stockage",
    Array.from({ length: 9 }, (_, i) => "storage" + (i + 2)),
    1,
  ),
  ...(
    [
      ["fertilizer", "Engrais", 3],
      ["group", "Récolte groupée", 2],
      ["motor", "Motorisation", 3],
      ["hold", "Soute", 3],
      ["tools", "Outils agricoles", 3],
      ["land", "Terrain constructible", 4],
      ["reservoir", "Puits et citernes", 5],
      ["milling", "Moulin", 5],
      ["bakery", "Four", 5],
      ["mechanization", "Mécanisation", 2],
      ["traffic", "Circulation", 2],
    ] as const
  ).map(([id, title, max]) => group(id, title, tiers(id, max))),
];
const byResearch = new Map(
  researchGroups.flatMap((group) =>
    group.steps.map((id) => [id, group] as const),
  ),
);
const entries = new Map(research.map((r) => [r.id, r]));
export const researchGroupFor = (id: string) => byResearch.get(id);
export function groupProgress(
  group: ResearchGroup,
  unlocks: readonly string[],
) {
  // Older saves can contain only their highest acquired tier.
  const reached = group.steps.reduce(
    (highest, id, index) => (unlocks.includes(id) ? index + 1 : highest),
    0,
  );
  return {
    level: group.initialLevel + reached,
    max: group.initialLevel + group.steps.length,
    next: entries.get(group.steps[reached]) as Research | undefined,
    current: reached ? entries.get(group.steps[reached - 1]) : undefined,
  };
}
export function hasResearchLevel(
  unlocks: readonly string[],
  id: string,
): boolean {
  if (unlocks.includes(id)) return true;
  const group = researchGroupFor(id);
  return (
    !!group &&
    groupProgress(group, unlocks).level >=
      group.initialLevel + group.steps.indexOf(id) + 1
  );
}
