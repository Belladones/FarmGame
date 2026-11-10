import { buildGroupedTree, type ResearchNode } from "./researchTrees";
const definitions = [
  {
    name: "Soutes",
    root: "hold-base",
    title: "Soutes de base",
    symbol: "20 / 100 / 10",
    detail:
      "Fermier : 20 unités, transporteur : 100, drone : 10. Les améliorations de soute sont communes aux robots actuels et futurs.",
    ids: ["hold"],
  },
  {
    name: "Motorisation",
    root: "motor-base",
    title: "Vitesses de base",
    symbol: "1 / 0,75 / 2",
    detail:
      "Fermier : 1 case/s ; transporteur : 0,75 ; drone : 2. Le fermier de secours reste plus lent.",
    ids: ["motor"],
  },
  {
    name: "Outils et eau",
    root: "tools-base",
    title: "Équipement de départ",
    symbol: "f1",
    detail:
      "Le fermier plante, récolte et laboure. Le drone peut arroser et appliquer de l’engrais.",
    ids: [
      "till",
      "tools",
      "construction",
      "consumables",
      "tank",
      "fertilizer",
      "watering",
      "reservoir",
    ],
  },
  {
    name: "Capteurs et flotte",
    root: "fleet-base",
    title: "Robot fermier initial",
    symbol: "f1",
    detail:
      "Le premier fermier est offert. Les nouveaux robots doivent être achetés après leurs recherches.",
    ids: [
      "sensor",
      "position",
      "analysis",
      "traffic",
      "humidity",
      "fleet",
      "transporter",
      "drone",
    ],
  },
  {
    name: "Dépôts",
    root: "depot-base",
    title: "Dépôt initial",
    symbol: "200",
    detail:
      "200 unités au départ. Les améliorations de stockage concernent chaque dépôt et restent distinctes des soutes.",
    ids: ["construction", "storage2", "land"],
  },
];
export const robotTrees = definitions.map((def) =>
  buildGroupedTree(
    def.name,
    "Une carte par amélioration, avec son niveau et le prix du prochain palier.",
    {
      id: def.root,
      title: def.title,
      symbol: def.symbol,
      detail: def.detail,
      x: 315,
      y: 25,
      parents: [],
      base: true,
    } satisfies ResearchNode,
    def.ids,
  ),
);
