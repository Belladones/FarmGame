export type Crop = "Wheat";
export interface Tile {
  planted: number | null;
  yield: number;
}
export interface Farm {
  time: number;
  width: number;
  x: number;
  tiles: Tile[];
  cargo: number;
  stock: number;
  gold: number;
  harvested: number;
  deposited: number;
  planted: number;
  visited: number[];
  wheatLevel: number;
  unlocks: string[];
  claimed: string[];
}
export const fresh = (): Farm => ({
  time: 0,
  width: 1,
  x: 0,
  tiles: [{ planted: null, yield: 1 }],
  cargo: 0,
  stock: 0,
  gold: 0,
  harvested: 0,
  deposited: 0,
  planted: 0,
  visited: [0],
  wheatLevel: 1,
  unlocks: [],
  claimed: [],
});
export const research = [
  {
    id: "wheat",
    name: "Blé · niveau 2",
    cost: 20,
    detail: "5 blés par nouvelle plantation",
  },
  {
    id: "sensor",
    name: "Capteur de maturité",
    cost: 10,
    detail: "Débloque can_harvest()",
  },
  {
    id: "conditions",
    name: "Conditions",
    cost: 10,
    detail: "Apprendre if et else",
  },
  { id: "print", name: "Journal", cost: 5, detail: "Débloque print()" },
  {
    id: "extension",
    name: "Trois parcelles",
    cost: 25,
    detail: "Étend la ferme à 3 × 1",
  },
  {
    id: "position",
    name: "Positionnement",
    cost: 20,
    detail: "Coordonnées et dimensions · exige 3 parcelles",
  },
];
export function buy(s: Farm, id: string): boolean {
  const r = research.find((r) => r.id === id);
  if (
    !r ||
    s.unlocks.includes(id) ||
    s.stock < r.cost ||
    (id === "position" && s.width < 3)
  )
    return false;
  s.stock -= r.cost;
  s.unlocks.push(id);
  if (id === "wheat") s.wheatLevel = 2;
  if (id === "extension") {
    s.width = 3;
    s.tiles.push({ planted: null, yield: 1 }, { planted: null, yield: 1 });
  }
  return true;
}
export function command(s: Farm, name: string, args: unknown[]): unknown {
  const tile = s.tiles[s.x];
  const ready = tile.planted !== null && s.time - tile.planted >= 5;
  const requireUnlock = (id: string) => {
    if (!s.unlocks.includes(id))
      throw new Error(
        `Recherchez « ${research.find((r) => r.id === id)?.name} » avant cet appel.`,
      );
  };
  switch (name) {
    case "plant":
      if (args[0] !== "Wheat") throw new Error("Utilisez Entities.Wheat.");
      if (tile.planted !== null) return false;
      tile.planted = s.time;
      tile.yield = s.wheatLevel === 2 ? 5 : 1;
      s.planted++;
      return true;
    case "harvest": {
      if (!ready || s.cargo >= 20) return false;
      const n = Math.min(tile.yield, 20 - s.cargo);
      s.cargo += n;
      s.harvested += n;
      tile.yield -= n;
      if (!tile.yield) tile.planted = null;
      return true;
    }
    case "deposit": {
      if (s.x !== 0) return 0;
      const n = Math.min(s.cargo, 200 - s.stock);
      s.stock += n;
      s.cargo -= n;
      s.deposited += n;
      return n;
    }
    case "move": {
      const d = args[0];
      if (!["East", "West", "North", "South"].includes(String(d)))
        throw new Error("Direction invalide.");
      const x = s.x + (d === "East" ? 1 : d === "West" ? -1 : 0);
      if (d === "North" || d === "South" || x < 0 || x >= s.width) return false;
      s.x = x;
      if (!s.visited.includes(x)) s.visited.push(x);
      return true;
    }
    case "can_harvest":
      requireUnlock("sensor");
      return ready;
    case "get_pos_x":
      requireUnlock("position");
      return s.x;
    case "get_pos_y":
      requireUnlock("position");
      return 0;
    case "get_world_size":
      requireUnlock("position");
      return { width: s.width, height: 1 };
    case "get_inventory":
      if (args[0] !== "Wheat") throw new Error("Utilisez Resources.Wheat.");
      return s.cargo;
    case "get_stock":
      if (args[0] !== "Wheat") throw new Error("Utilisez Resources.Wheat.");
      return s.stock;
    case "get_capacity":
      return 20;
    case "print":
      requireUnlock("print");
      return null;
    default:
      throw new Error(`Commande inconnue : ${name}`);
  }
}
export const missions = [
  {
    id: "first",
    title: "Première pousse",
    text: "Plantez et récoltez votre premier blé.",
    target: 1,
    progress: (s: Farm) => s.harvested,
    reward: 4,
  },
  {
    id: "deposit",
    title: "À l’abri dans le dépôt",
    text: "Déposez 5 blés. Le dépôt est voisin de (0, 0).",
    target: 5,
    progress: (s: Farm) => s.deposited,
    reward: 8,
  },
  {
    id: "routine",
    title: "Une ferme qui travaille",
    text: "Déposez 20 blés au total avec votre programme.",
    target: 20,
    progress: (s: Farm) => s.deposited,
    reward: 10,
  },
  {
    id: "explore",
    title: "Voyez plus grand",
    text: "Débloquez trois cases et visitez-les toutes.",
    target: 3,
    progress: (s: Farm) => s.visited.length,
    reward: 20,
  },
];
export function claim(s: Farm, id: string): boolean {
  const index = missions.findIndex((m) => m.id === id),
    m = missions[index];
  if (
    !m ||
    s.claimed.includes(id) ||
    (index > 0 && !s.claimed.includes(missions[index - 1].id)) ||
    m.progress(s) < m.target ||
    s.stock + m.reward > 200
  )
    return false;
  s.stock += m.reward;
  s.claimed.push(id);
  return true;
}
export function sell(s: Farm): boolean {
  if (s.stock < 10) return false;
  s.stock -= 10;
  s.gold += 10;
  return true;
}
