import { research, formatCost } from "./catalog";
export interface RobotSkillNode {
  id: string;
  title: string;
  symbol?: string;
  x: number;
  y: number;
  parents: string[];
  research?: string;
  base?: boolean;
  detail: string;
  cost?: string;
  prerequisite?: string;
}
const node = (
  id: string,
  x: number,
  y: number,
  parents: string[],
  symbol: string,
): RobotSkillNode => {
  const r = research.find((r) => r.id === id)!;
  return {
    id,
    title: r.name,
    symbol,
    x,
    y,
    parents,
    research: id,
    detail: r.detail,
    cost: formatCost(r.materials),
    prerequisite:
      r.prerequisites
        .map((p) => research.find((r) => r.id === p)?.name ?? p)
        .join(" + ") || undefined,
  };
};
const root = (
  id: string,
  title: string,
  symbol: string,
  detail: string,
): RobotSkillNode => ({
  id,
  title,
  symbol,
  detail,
  x: 315,
  y: 25,
  parents: [],
  base: true,
});
export const robotTrees = [
  {
    name: "Soutes",
    caption: "Capacité embarquée : améliorations communes à tous vos robots.",
    nodes: [
      root(
        "hold-base",
        "Soutes de base",
        "10 / 100",
        "Fermier et drone : 10 unités. Transporteur : 100. Les recherches Soute multiplient ces valeurs pour les robots actuels et futurs, sans modifier leurs spécialités.",
      ),
      node("hold", 315, 205, ["hold-base"], "×2"),
      node("hold2", 315, 385, ["hold"], "×4"),
      node("hold3", 315, 565, ["hold2"], "×8"),
    ],
  },
  {
    name: "Motorisation",
    caption:
      "Déplacements plus rapides, y compris pour vos robots déjà possédés.",
    nodes: [
      root(
        "motor-base",
        "Vitesses de base",
        "1 / 0,75 / 2",
        "Fermier : 1 case/s ; transporteur : 0,75 ; drone : 2. Le fermier de secours reste deux fois plus lent. Une amélioration de vitesse ne protège pas des collisions.",
      ),
      node("motor", 315, 205, ["motor-base"], "×1,25"),
      node("motor2", 315, 385, ["motor"], "×1,5"),
      node("motor3", 315, 565, ["motor2"], "×2"),
    ],
  },
  {
    name: "Outils et eau",
    caption:
      "Nouvelles actions et équipements, selon les capacités de chaque modèle.",
    nodes: [
      root(
        "tools-base",
        "Équipement de départ",
        "f1",
        "Seul le fermier peut planter, récolter et labourer. Le drone peut arroser et appliquer de l’engrais ; le transporteur se limite aux transferts.",
      ),
      node("till", 45, 205, ["tools-base"], "till()"),
      node("tools", 315, 205, ["tools-base"], "×0,8"),
      node("construction", 585, 205, ["tools-base"], "⌂"),
      node("consumables", 45, 385, ["tools-base"], "use_item()"),
      node("tools2", 315, 385, ["tools"], "×0,6"),
      node("tank", 585, 385, ["construction"], "10 eau"),
      node("fertilizer", 45, 565, ["consumables"], "+20 %"),
      node("tools3", 315, 565, ["tools2"], "×0,4"),
      node("watering", 585, 565, ["tank"], "watering()"),
      node("fertilizer2", 45, 745, ["fertilizer"], "+35 %"),
      node("reservoir", 315, 745, ["construction"], "Puits"),
      node("watering2", 585, 745, ["watering"], "×1,5"),
      node("fertilizer3", 45, 925, ["fertilizer2"], "+50 %"),
      node("reservoir2", 315, 925, ["reservoir"], "×3"),
      node("watering3", 585, 925, ["watering2"], "×2"),
    ],
  },
  {
    name: "Capteurs et flotte",
    caption: "Observer, coordonner et débloquer de nouveaux modèles au shop.",
    nodes: [
      root(
        "fleet-base",
        "Robot fermier initial",
        "f1",
        "Le premier fermier est offert. La recherche Flotte autorise les fermiers supplémentaires, qui restent à acheter dans le shop avec de l’or.",
      ),
      node("sensor", 180, 205, ["fleet-base"], "can_harvest()"),
      node("position", 455, 205, ["fleet-base"], "(x, y)"),
      node("analysis", 45, 385, ["sensor"], "Analyser"),
      node("traffic", 315, 385, ["sensor"], "is_occupied()"),
      node("humidity", 45, 565, ["analysis"], "get_water()"),
      node("traffic2", 315, 565, ["traffic"], "reserve()"),
      node("fleet", 585, 565, ["traffic"], "+ robots"),
      node("transporter", 455, 745, ["fleet"], "100 unités"),
      node("drone", 625, 745, ["fleet"], "Drone"),
    ],
  },
  {
    name: "Dépôts",
    caption: "Stockage de la ferme, distinct des soutes embarquées des robots.",
    nodes: [
      root(
        "depot-base",
        "Dépôt initial",
        "200",
        "200 unités au total dans le dépôt initial. Les recherches Stockage augmentent la capacité de chaque dépôt ; les emplacements constructibles permettent d’en acheter davantage.",
      ),
      node("construction", 315, 205, ["depot-base"], "⌂"),
      node("storage2", 180, 385, ["construction"], "500"),
      node("land", 455, 385, ["construction"], "2 sites"),
      node("storage3", 180, 565, ["storage2"], "2 500"),
      node("land2", 455, 565, ["land"], "4 sites"),
      node("storage4", 180, 745, ["storage3"], "10 000"),
      node("land3", 455, 745, ["land2"], "8 sites"),
      node("land4", 455, 925, ["land3"], "16 sites"),
    ],
  },
];
