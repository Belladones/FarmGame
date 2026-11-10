import { research, formatResearchCost } from "./catalog";
import {
  researchGroupFor,
  researchGroups,
  type ResearchGroup,
} from "./researchGroups";
export interface ResearchNode {
  id: string;
  title: string;
  symbol?: string;
  art?: "hay" | "wheat" | "wood" | "carrot" | "water";
  x: number;
  y: number;
  parents: string[];
  /** Previous card in the reading path; not an additional purchase prerequisite. */
  previous?: string;
  research?: string;
  group?: ResearchGroup;
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
    root: "grass-base",
    title: "Prairie et herbe",
    symbol: "🌾",
    caption: "Cultures et parcelles, dans l’ordre réel de progression.",
    detail:
      "L’herbe pousse seule en 0,5 seconde sur prairie. Récoltez du foin, déposez-le, puis débloquez les premières cultures.",
  },
  {
    name: "Programmation",
    root: "code-base",
    title: "Programme initial",
    symbol: "harvest()",
    caption: "Comprendre, observer et automatiser votre ferme.",
    detail:
      "Les appels simples sont disponibles au départ. Boucle while coûte 5 foins ; viennent ensuite les conditions, variables et fonctions.",
  },
  {
    name: "Technologie",
    root: "technology-base",
    title: "harvest() · Fermier initial",
    symbol: "f1",
    caption:
      "Équipements, stockage et industrie, selon leurs véritables prérequis.",
    detail:
      "harvest() est disponible au départ : récolte la plante sous le fermier (200 ticks si retrait, 1 sinon). Le fermier de 20 unités et le dépôt de 200 unités sont offerts. Le niveau 2 du dépôt s’achète sur ce bâtiment : 800 unités pour 500 or.",
  },
];
/** Layout uses the first tier only. Later tier requirements are shown in the
 * detail panel: merging every tier's edges would create false family cycles. */
export function buildGroupedTree(
  name: string,
  caption: string,
  root: ResearchNode,
  ids: string[],
): ResearchTree {
  const nodes = new Map<string, ResearchNode>([[root.id, root]]);
  for (const id of ids) {
    const r = byId.get(id)!;
    if (r.localOnly) continue;
    const group = researchGroupFor(id);
    const nodeId = group?.id ?? id;
    if (nodes.has(nodeId)) continue;
    const first = group ? byId.get(group.steps[0])! : r;
    nodes.set(nodeId, {
      id: nodeId,
      title: group?.title ?? r.name,
      group,
      research: first.id,
      x: 0,
      y: 0,
      parents: [],
      detail: first.detail,
      cost: formatResearchCost(first),
      symbol:
        (
          {
            for: "for",
            lists: "[ ]",
            dictionaries: "{ clé: valeur }",
            imports: "import",
          } as Record<string, string>
        )[nodeId] ??
        (nodeId === "extension"
          ? "▦"
          : nodeId.startsWith("storage")
            ? "▣"
            : nodeId === "loops"
              ? "while"
              : nodeId === "conditions"
                ? "if / else"
                : nodeId === "functions"
                  ? "function"
                  : nodeId === "variables"
                    ? "const / let"
                    : "⬡"),
      art:
        nodeId === "grass-base"
          ? "hay"
          : nodeId === "watering"
            ? "water"
            : nodeId.startsWith("wheat")
              ? "wheat"
              : ["bush", "tree"].includes(nodeId)
                ? "wood"
                : nodeId === "carrot"
                  ? "carrot"
                  : undefined,
    });
  }
  for (const node of nodes.values()) {
    if (node === root) continue;
    const first = byId.get(node.research!)!;
    const local = first.prerequisites
      .map((id) => researchGroupFor(id)?.id ?? id)
      .filter((id) => id !== node.id && nodes.has(id));
    node.parents = [...new Set(local.length ? local : [root.id])];
  }
  const depths = new Map<string, number>([[root.id, 0]]);
  function depth(id: string, chain = new Set<string>()): number {
    if (depths.has(id)) return depths.get(id)!;
    if (chain.has(id)) throw new Error(`Cycle de groupes : ${id}`);
    const d =
      1 +
      Math.max(
        0,
        ...nodes.get(id)!.parents.map((p) => depth(p, new Set(chain).add(id))),
      );
    depths.set(id, d);
    return d;
  }
  // A single topological reading path. Keep actual parents for the detail
  // panel and navigation; the visible line never invents an unlock requirement.
  const ordered = [...nodes.values()].filter((node) => node !== root);
  ordered.sort((a, b) => depth(a.id) - depth(b.id));
  const path = [root, ...ordered];
  path.forEach((node, index) => {
    node.x = 315;
    node.y = 25 + index * 180;
    node.previous = path[index - 1]?.id;
  });
  return { name, caption, nodes: path };
}
export const researchTrees: ResearchTree[] = definitions.map((def) =>
  buildGroupedTree(
    def.name,
    def.caption,
    {
      id: def.root,
      title: def.title,
      symbol: def.symbol,
      art: def.name === "Agriculture" ? "hay" : undefined,
      x: 315,
      y: 25,
      parents: [],
      base: true,
      detail: def.detail,
      group:
        def.name === "Agriculture"
          ? researchGroups.find((g) => g.id === "grass-base")
          : undefined,
    },
    research
      .filter((r) => r.category === def.name && !r.localOnly)
      .map((r) => r.id),
  ),
);
