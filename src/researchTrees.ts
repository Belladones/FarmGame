import { research, formatCost, type Research } from "./catalog";
export interface ResearchNode {
  id: string;
  title: string;
  symbol?: string;
  art?: "wheat" | "wood" | "carrot" | "water";
  x: number;
  y: number;
  parents: string[];
  research?: string;
  base?: boolean;
  detail: string;
  cost?: string;
  prerequisite?: string;
}
export interface ResearchTree {
  name: string;
  caption: string;
  nodes: ResearchNode[];
}
const byId = new Map(research.map((r) => [r.id, r]));
const depths = new Map<string, number>();
export function researchDepth(id: string, chain = new Set<string>()): number {
  if (chain.has(id))
    throw new Error(`Cycle de recherche : ${[...chain, id].join(" → ")}`);
  if (depths.has(id)) return depths.get(id)!;
  const r = byId.get(id);
  if (!r) throw new Error(`Recherche inconnue : ${id}`);
  const next = new Set(chain).add(id);
  const depth =
    1 + Math.max(0, ...r.prerequisites.map((p) => researchDepth(p, next)));
  depths.set(id, depth);
  return depth;
}
const definitions = [
  {
    name: "Agriculture",
    root: "wheat-base",
    title: "Blé de départ",
    symbol: "🌾",
    caption: "Cultures et parcelles, dans l’ordre réel de progression.",
    detail:
      "Le blé initial est gratuit. Déposez les récoltes pour financer les cultures suivantes.",
  },
  {
    name: "Programmation",
    root: "code-base",
    title: "Programme initial",
    symbol: "while",
    caption: "Comprendre, observer et automatiser votre ferme.",
    detail:
      "Les boucles et appels simples sont disponibles dès le départ. Seules les fonctionnalités réellement proposées apparaissent ici.",
  },
  {
    name: "Technologie",
    root: "technology-base",
    title: "Fermier initial",
    symbol: "f1",
    caption:
      "Équipements, stockage et industrie, selon leurs véritables prérequis.",
    detail:
      "Un fermier et un dépôt de 200 unités sont offerts. Augmentez le stockage avant les recherches coûteuses.",
  },
];
export const researchTrees: ResearchTree[] = definitions.map((def) => {
  const entries = research
    .filter((r) => r.category === def.name)
    .sort(
      (a, b) =>
        researchDepth(a.id) - researchDepth(b.id) ||
        total(a) - total(b) ||
        a.id.localeCompare(b.id),
    );
  const levels = [...new Set(entries.map((r) => researchDepth(r.id)))];
  const nodes: ResearchNode[] = [
    {
      id: def.root,
      title: def.title,
      symbol: def.symbol,
      art: def.name === "Agriculture" ? "wheat" : undefined,
      x: 315,
      y: 25,
      parents: [],
      base: true,
      detail: def.detail,
    },
  ];
  let y = 205;
  for (const level of levels) {
    const row = entries.filter((r) => researchDepth(r.id) === level);
    row.forEach((r, i) => {
      const local = r.prerequisites.filter(
        (id) => byId.get(id)?.category === def.name,
      );
      nodes.push({
        id: r.id,
        title: r.name,
        research: r.id,
        symbol: r.id.startsWith("extension")
          ? (r.name.split("·")[1]?.trim() ?? "3 × 1")
          : r.id.startsWith("storage")
            ? "▣"
            : r.id === "conditions"
              ? "if / else"
              : r.id === "functions"
                ? "function"
                : r.id === "variables"
                  ? "const / let"
                  : "⬡",
        art: r.id.startsWith("wheat")
          ? "wheat"
          : r.id.startsWith("bush") || r.id.startsWith("tree")
            ? "wood"
            : r.id.startsWith("carrot")
              ? "carrot"
              : undefined,
        x: row.length === 1 ? 315 : 45 + (i % 3) * 220,
        y: y + Math.floor(i / 3) * 180,
        parents: local.length ? local : [def.root],
        detail: r.detail,
        cost: formatCost(r.materials),
        prerequisite: r.prerequisites
          .map((id) => byId.get(id)!.name)
          .join(" + "),
      });
    });
    y += Math.ceil(row.length / 3) * 180;
  }
  return { name: def.name, caption: def.caption, nodes };
});
function total(r: Research) {
  return Object.values(r.materials).reduce((n, v) => n + (v ?? 0), 0);
}
