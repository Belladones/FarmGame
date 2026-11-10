import { research, formatResearchCost } from "../../domain/catalog";
import {
  researchGroupFor,
  researchGroups,
  type ResearchGroup,
} from "../../domain/researchGroups";
export interface ResearchNode {
  id: string;
  title: string;
  symbol?: string;
  art?: "hay" | "wheat" | "wood" | "carrot" | "water";
  x: number;
  y: number;
  parents: string[];
  /** Main thematic prerequisite drawn on the map; all others stay in parents. */
  branchParent?: string;
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
  width: number;
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
  // Choose one real prerequisite per card to form a readable thematic tree.
  // Secondary requirements are still enforced and linked in the detail panel.
  const preferred: Record<string, string> = {
    tree: "bush",
    pumpkin: "tree",
    "wheat-base": "carrot",
    watering: "carrot",
    fertilizer: "carrot",
    group: "pumpkin",
    for: "conditions",
    variables: "conditions",
    functions: "variables",
    lists: "for",
    dictionaries: "lists",
    imports: "dictionaries",
    commerce: "functions",
    land: "construction",
    workshop: "construction",
    reservoir: "land",
    milling: "land",
    sawmill: "land",
    bakery: "milling",
    composting: "land",
    tank: "workshop",
    motor: "workshop",
    hold: "workshop",
    tools: "workshop",
    handling: "workshop",
    plant: "speed",
    move: "speed",
    sensor: "plant",
    position: "sensor",
    analysis: "position",
    traffic: "sensor",
    fleet: "traffic",
    transporter: "fleet",
    drone: "fleet",
    consumables: "plant",
    humidity: "consumables",
  };
  const children = new Map<string, ResearchNode[]>();
  for (const node of nodes.values()) {
    if (node === root) continue;
    const parent = node.parents.includes(preferred[node.id])
      ? preferred[node.id]
      : [...node.parents].sort((a, b) => depth(b) - depth(a))[0];
    node.branchParent = parent;
    children.set(parent, [...(children.get(parent) ?? []), node]);
  }
  // Reserve a disjoint horizontal interval for every subtree. No branch can
  // intrude into a sibling's interval, even when secondary requirements add tiers.
  const widths = new Map<string, number>();
  const measure = (node: ResearchNode): number => {
    const width = Math.max(
      170,
      (children.get(node.id) ?? []).reduce(
        (total, child) => total + measure(child),
        0,
      ),
    );
    widths.set(node.id, width);
    return width;
  };
  const contentWidth = measure(root),
    width = Math.max(740, contentWidth + 80);
  const place = (node: ResearchNode, left: number) => {
    node.x = left + widths.get(node.id)! / 2 - 57;
    node.y = 25 + depth(node.id) * 180;
    let offset = left;
    for (const child of children.get(node.id) ?? []) {
      place(child, offset);
      offset += widths.get(child.id)!;
    }
  };
  place(root, (width - contentWidth) / 2);
  return { name, caption, width, nodes: [...nodes.values()] };
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
