import type { Farm, Tile } from "./model";
import type { Robot } from "../../robots/domain/Robot";
import type { Building } from "../../construction/domain/Building";
import type { Model } from "../../robots/domain/catalog";
import type { BuildingKind } from "../../construction/domain/catalog";
import { freshCompanion } from "../../companion/domain/companion";
import { DEFAULT_PROGRAM } from "./constants";
export const tile = (time = 0): Tile => ({
  planted: time,
  entity: "Grass",
  yield: 1,
  ground: "Grassland",
  water: 0,
  progress: 0,
});
export const robot = (
  id: string,
  model: Model,
  x = 0,
  y = 0,
  paid = 0,
  loan = false,
): Robot => ({
  id,
  model,
  x,
  y,
  paid,
  loan,
  inventory: {},
  water: 0,
  code: DEFAULT_PROGRAM,
  destroyed: false,
  deployed: true,
  readyAt: 0,
});
export const building = (
  id: string,
  kind: BuildingKind,
  x: number,
  y: number,
  paid = 0,
): Building => ({
  id,
  kind,
  x,
  y,
  paid,
  inventory: {},
  input: {},
  output: {},
  water: 0,
});
export const fresh = (): Farm => ({
  assetProgression: 1,
  researchRevision: 2,
  waterItems: 0,
  waterRemainder: 0,
  progressionVersion: 2,
  companion: freshCompanion(),
  time: 0,
  width: 1,
  height: 1,
  x: 0,
  y: 0,
  tiles: [{ ...tile(), progress: 1 }],
  cargo: 0,
  stock: 0,
  resources: {},
  gold: 0,
  harvestedItems: {},
  depositedItems: {},
  harvested: 0,
  deposited: 0,
  planted: 0,
  visited: [0],
  wheatLevel: 1,
  unlocks: ["till"],
  claimed: [],
  produced: {},
  robots: [robot("f1", "Farmer")],
  buildings: [building("b1", "Depot", -1, 0)],
  activeRobotId: "f1",
  nextId: 2,
  orderPeriods: {},
  sites: [{ x: -1, y: 0 }],
  storedBuildings: [],
});
