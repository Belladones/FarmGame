import { createAssetUpgradeService } from "../../equipment/application/upgradeService";
import {
  robotEquipment,
  type UpgradeLevels,
} from "../../equipment/domain/assetProgression";
import {
  freshCompanion,
  hydrateCompanion,
  type Companion,
} from "../../companion/domain/companion";
import { missions, missionsFor } from "../../missions/domain/missions";
import { storageCapacities } from "../../research/domain/researchBalance";
import {
  buildings,
  constructionSlots,
  recipes,
  type BuildingKind,
} from "../../construction/domain/catalog";
import { cropData } from "../domain/crops";
import {
  formatCost,
  itemNames,
  items,
  sum,
  type Inventory,
  type Item,
} from "../../../shared/domain/resources";
import { models, type Model } from "../../robots/domain/catalog";
import { research } from "../../research/domain/catalog";
import { salePrices, tradeOrders } from "../../commerce/domain/catalog";
export { research } from "../../research/domain/catalog";
import type { Farm, Tile, Crop } from "../domain/model";
import type { Robot } from "../../robots/domain/Robot";
import type { Building } from "../../construction/domain/Building";
export type { Farm, Tile, Crop } from "../domain/model";
export type { Robot } from "../../robots/domain/Robot";
export type { Building } from "../../construction/domain/Building";
import { TICK_SECONDS, DEFAULT_PROGRAM } from "../domain/constants";
export { TICK_SECONDS, DEFAULT_PROGRAM } from "../domain/constants";
import { tile, robot, building, fresh } from "../domain/factories";
export { fresh } from "../domain/factories";
export function hydrateFarm(raw: unknown, legacyCode?: string | null): Farm {
  if (!raw || typeof raw !== "object") return fresh();
  const v = raw as Partial<Farm>;
  if (
    !Number.isInteger(v.width) ||
    v.width! < 1 ||
    v.width! > 10 ||
    !Array.isArray(v.tiles) ||
    v.tiles.length !== v.width! * (v.height ?? 1)
  )
    return fresh();
  const s = {
    ...fresh(),
    ...v,
    researchRevision: v.researchRevision === 1 ? 1 : 2,
    legacyDepotCapacity:
      v.legacyDepotCapacity ??
      (v.researchRevision === undefined
        ? v.unlocks?.includes("storage4")
          ? 10000
          : v.unlocks?.includes("storage3")
            ? 2500
            : v.unlocks?.includes("storage2")
              ? 500
              : 200
        : 0),
    waterItems: v.waterItems ?? 0,
    waterRemainder: v.waterRemainder ?? 0,
    previousProgram:
      typeof v.previousProgram === "string" ? v.previousProgram : undefined,
    progressionVersion: v.progressionVersion === 2 ? 2 : 1,
    unlocks:
      v.progressionVersion === 2
        ? (v.unlocks ?? ["till"])
        : [...new Set([...(v.unlocks ?? []), "loops", "wheat-base"])],
    companion: hydrateCompanion(v.companion),
    height: v.height ?? 1,
    resources: v.resources ?? {},
    produced: v.produced ?? {},
    harvestedItems: v.harvestedItems ?? {},
    depositedItems: v.depositedItems ?? {},
    storedBuildings: v.storedBuildings ?? [],
    orderPeriods: v.orderPeriods ?? {},
    tiles: v.tiles.map((t) => ({
      ...tile(),
      ...t,
      entity: t.planted !== null ? (t.entity ?? "Wheat") : t.entity,
    })),
  } as Farm;
  if (v.researchRevision === undefined)
    s.unlocks = [...new Set([...s.unlocks, "plant", "move"])];
  if (!Array.isArray(v.robots) || !v.robots.length) {
    s.robots = [robot("f1", "Farmer", s.x, s.y)];
    s.robots[0].inventory.Wheat = s.cargo;
    s.robots[0].code = legacyCode || DEFAULT_PROGRAM;
  }
  if (
    !Array.isArray(v.buildings) ||
    (!v.buildings.length && !v.storedBuildings?.length)
  ) {
    s.buildings = [building("b1", "Depot", -1, 0)];
    s.buildings[0].inventory = { ...s.resources, Wheat: s.stock };
  }
  s.sites =
    v.sites ?? constructionSlots.slice(0, slotCount(s)).map((p) => ({ ...p }));
  s.robots = s.robots.map((r) => {
    const next = { ...r, deployed: !r.destroyed && (r.deployed ?? true) };
    if (!next.deployed) {
      delete next.moving;
      delete next.reservation;
      next.readyAt = s.time;
    }
    return next;
  });
  if (v.assetProgression !== 1) {
    const tier = (id: string, max = 10) => {
      let result = s.unlocks.includes(id) ? 1 : 0;
      for (let n = 2; n <= max; n++) if (s.unlocks.includes(id + n)) result = n;
      return result;
    };
    const oldStorage = Math.max(
      s.legacyDepotCapacity ?? 0,
      [
        200, 400, 2000, 10000, 50000, 250000, 1250000, 6250000, 31250000,
        156250000,
      ][Math.max(0, tier("storage") - 1)],
    );
    s.robots.forEach((r) => {
      r.baseCapacity ??=
        r.model === "Farmer" && s.researchRevision === 1
          ? 10
          : models[r.model].capacity;
      r.equipment = {
        ...Object.fromEntries(
          robotEquipment
            .filter((e) => e.models?.includes(r.model))
            .map((e) => [e.id, e.initial]),
        ),
        hold: 1 + tier("hold", 3),
        motor: Math.min(
          5,
          1 +
            Math.ceil(
              Math.log([1, 1.25, 1.5, 2][tier("motor", 3)]) / Math.log(1.25),
            ),
        ),
        tools: Math.min(
          5,
          1 +
            Math.ceil(
              Math.log(1 / [1, 0.8, 0.6, 0.4][tier("tools", 3)]) /
                Math.log(1.25),
            ),
        ),
        sensor: tier("sensor", 1),
        analysis: tier("analysis", 1),
        humidity: tier("humidity", 1),
        traffic: tier("traffic", 1),
        ...r.equipment,
      };
      r.actionFloor = [1, 0.8, 0.6, 0.4][tier("tools", 3)];
    });
    [...s.buildings, ...s.storedBuildings].forEach((b) => {
      b.upgrades = { ...b.upgrades };
      if (b.kind === "Depot") {
        b.upgrades.storage = Math.min(
          10,
          1 + Math.ceil(Math.log(oldStorage / 200) / Math.log(4)),
        );
        b.capacityFloor = Math.max(oldStorage, b.capacityFloor ?? 0);
      }
      if (recipes[b.kind]) {
        const oldRate =
          (b.kind === "Mill" || b.kind === "Oven"
            ? 2 **
              Math.max(0, tier(b.kind === "Mill" ? "milling" : "bakery", 5) - 1)
            : 1) *
          (s.unlocks.includes("mechanization2")
            ? 2
            : s.unlocks.includes("mechanization")
              ? 1 / 0.75
              : 1);
        b.productionFloor = Math.max(b.productionFloor ?? 1, oldRate);
        b.upgrades.production = Math.max(
          b.upgrades.production ?? 1,
          Math.min(5, 1 + Math.ceil(Math.log2(b.productionFloor))),
        );
      }
      if (b.kind === "Well" || b.kind === "Cistern") {
        b.waterCapacityFloor = Math.max(
          b.waterCapacityFloor ?? 0,
          (b.kind === "Well" ? 100 : 400) *
            (tier("reservoir", 5) >= 2
              ? 3 * 2 ** (tier("reservoir", 5) - 2)
              : 1),
        );
        if (b.kind === "Cistern")
          b.upgrades.waterStorage = Math.max(
            b.upgrades.waterStorage ?? 1,
            Math.min(
              5,
              1 + Math.ceil(Math.log(b.waterCapacityFloor / 400) / Math.log(4)),
            ),
          );
      }
    });
    for (const id of [
      "hold",
      "motor",
      "tools",
      "milling",
      "bakery",
      "reservoir",
    ])
      if (tier(id) > 0 && !s.unlocks.includes(id)) s.unlocks.push(id);
    if (
      s.unlocks.includes("maintenance") ||
      [...s.buildings, ...s.storedBuildings].some((b) => b.kind === "Workshop")
    )
      s.unlocks = [...new Set([...s.unlocks, "workshop"])];
    s.assetProgression = 1;
  }
  syncBefore(s);
  sync(s);
  return s;
}
import { level } from "../../research/domain/levels";
export { level } from "../../research/domain/levels";
import {
  activeRobot,
  equipmentLevel,
  tankCapacity,
  capacity,
  robotSpeed,
  actionDuration,
} from "../../robots/domain/statistics";
export {
  activeRobot,
  equipmentLevel,
  tankCapacity,
  capacity,
  robotSpeed,
  actionDuration,
} from "../../robots/domain/statistics";
import {
  depotCapacity,
  stockCapacity,
} from "../../construction/domain/capacities";
export {
  depotCapacity,
  stockCapacity,
} from "../../construction/domain/capacities";
export const getStock = (s: Farm, item: Item) =>
  item === "Wheat" ? s.stock : (s.resources[item] ?? 0);
export const totalStock = (s: Farm) => s.stock + sum(s.resources);
export const slotCount = (s: Farm) =>
  [1, 2, 4, 8, 16][level(s, "land", 4)] ?? 1;
export const at = (s: Farm, x: number, y: number) =>
  x >= 0 && y >= 0 && x < s.width && y < s.height
    ? s.tiles[y * s.width + x]
    : undefined;
const isItem = (value: unknown): value is Item =>
  typeof value === "string" && Object.hasOwn(itemNames, value);
const adjacent = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const ids = (s: Farm, prefix: string) => prefix + s.nextId++;
const depots = (s: Farm) => s.buildings.filter((b) => b.kind === "Depot");
// Legacy wheat fields are maintained for existing saves and the UI. Every transfer uses real depot inventories.
function syncBefore(s: Farm) {
  const ds = depots(s);
  if (ds[0])
    for (const item of items) {
      const aggregate = ds.reduce((n, b) => n + (b.inventory[item] ?? 0), 0),
        expected = getStock(s, item);
      if (expected !== aggregate)
        ds[0].inventory[item] = Math.max(
          0,
          (ds[0].inventory[item] ?? 0) + expected - aggregate,
        );
    }
  const r = s.robots.find((r) => r.id === s.activeRobotId && !r.destroyed);
  if (r) {
    r.x = s.x;
    r.y = s.y ?? 0;
    r.inventory.Wheat = s.cargo;
  }
}
function sync(s: Farm) {
  s.stock = 0;
  s.resources = {};
  for (const b of depots(s))
    for (const item of items) {
      if (item === "Wheat") s.stock += b.inventory[item] ?? 0;
      else
        s.resources[item] = (s.resources[item] ?? 0) + (b.inventory[item] ?? 0);
    }
  const r = activeRobot(s);
  if (r) {
    s.activeRobotId = r.id;
    s.x = r.x;
    s.y = r.y;
    s.cargo = r.inventory.Wheat ?? 0;
  }
}
export function selectRobot(s: Farm, id: string) {
  syncBefore(s);
  const r = s.robots.find((r) => r.id === id && !r.destroyed);
  if (!r) return false;
  s.activeRobotId = id;
  sync(s);
  return true;
}
function removeStock(s: Farm, item: Item, n: number) {
  for (const b of depots(s)) {
    const amount = Math.min(n, b.inventory[item] ?? 0);
    b.inventory[item] = (b.inventory[item] ?? 0) - amount;
    n -= amount;
    if (!n) break;
  }
}
function addStock(s: Farm, inventory: Inventory): boolean {
  const n = sum(inventory);
  if (totalStock(s) + n > stockCapacity(s)) return false;
  for (const item of items) {
    let left = inventory[item] ?? 0;
    for (const b of depots(s)) {
      const amount = Math.min(
        left,
        Math.max(0, depotCapacity(s, b) - sum(b.inventory)),
      );
      b.inventory[item] = (b.inventory[item] ?? 0) + amount;
      left -= amount;
      if (!left) break;
    }
  }
  sync(s);
  return true;
}
export function researchBlocker(s: Farm, id: string): string | null {
  const r = research.find((r) => r.id === id);
  if (!r) return "Recherche inconnue";
  if (s.assetProgression === 1 && r.localOnly)
    return "Cette amélioration se trouve désormais dans la fiche du robot ou du bâtiment.";
  if (s.unlocks.includes(id)) return "Compétence déjà acquise";
  const missing = r.prerequisites.filter(
    (p) =>
      !s.unlocks.includes(p) &&
      !(s.progressionVersion === 1 && (p === "loops" || p === "wheat-base")) &&
      !(s.researchRevision !== 2 && ["speed", "plant", "move"].includes(p)) &&
      !(p === "extension" && s.width >= 3),
  );
  if (missing.length)
    return (
      "Requis : " +
      missing.map((p) => research.find((r) => r.id === p)?.name ?? p).join(", ")
    );
  if ((r.goldCost ?? 0) > s.gold)
    return `Or insuffisant : ${r.goldCost!.toLocaleString("fr-FR")} or nécessaires.`;
  const expansion =
    id === "extension"
      ? [3, 1]
      : /^extension(?:[3-9]|10)$/.test(id)
        ? [Number(id.slice(9)), Number(id.slice(9))]
        : null;
  if (
    expansion &&
    (s.sites ?? []).some(
      (p) => p.x >= 0 && p.y >= 0 && p.x < expansion[0] && p.y < expansion[1],
    )
  )
    return "Déplacez les terrains constructibles qui occupent les futures parcelles avant cette expansion.";
  const required = sum(r.materials);
  if (required > stockCapacity(s))
    return `Capacité insuffisante : ${required} unités nécessaires, ${stockCapacity(s)} disponibles. Améliorez le stockage ou construisez des dépôts supplémentaires.`;
  if (Object.entries(r.materials).some(([i, n]) => getStock(s, i as Item) < n))
    return "Matériaux insuffisants : " + formatCost(r.materials);
  return null;
}
export function buy(s: Farm, id: string): boolean {
  syncBefore(s);
  if (researchBlocker(s, id)) return false;
  const r = research.find((r) => r.id === id)!;
  for (const [item, n] of Object.entries(r.materials))
    removeStock(s, item as Item, n);
  s.gold -= r.goldCost ?? 0;
  s.unlocks.push(id);
  if (id === "wheat") s.wheatLevel = 2;
  else if (/^wheat[3-5]$/.test(id)) s.wheatLevel = Number(id.slice(-1));
  if (id === "extension") resizeFarm(s, 3, 1);
  else if (/^extension(?:[3-9]|10)$/.test(id)) {
    const n = Number(id.slice("extension".length));
    resizeFarm(s, n, n);
  }
  sync(s);
  return true;
}
function resizeFarm(s: Farm, w: number, h: number) {
  const old = s.tiles,
    oldW = s.width,
    oldH = s.height;
  s.tiles = Array.from({ length: w * h }, (_, i) => {
    const x = i % w,
      y = Math.floor(i / w);
    return x < oldW && y < oldH
      ? old[y * oldW + x]
      : s.progressionVersion === 1
        ? { ...tile(), planted: null, entity: undefined }
        : { ...tile(s.time), yield: grassYield(s) };
  });
  s.width = w;
  s.height = h;
  s.visited = s.visited.map((i) => Math.floor(i / oldW) * w + (i % oldW));
}
function cropSpec(
  s: Farm,
  kind: Crop,
): {
  seconds: number;
  soil: string;
  cost: Inventory;
  yields: number[];
  resource: Item;
  unlock: string | null;
} {
  const spec = cropData[kind];
  if (s.researchRevision === 2) return spec;
  const old: Partial<Record<Crop, Partial<ReturnType<typeof cropSpec>>>> = {
    Grass: { yields: [1] },
    Bush: { seconds: 8, soil: "Grassland", yields: [1, 3, 8] },
    Carrot: {
      seconds: 10,
      cost: { Wheat: 2, Wood: 1 },
      yields: [2, 6, 15, 40],
    },
    Tree: {
      seconds: 20,
      soil: "Grassland",
      cost: { Wood: 1 },
      yields: [5, 15, 40, 100],
    },
    Pumpkin: { yields: [4, 12, 30] },
  };
  return { ...spec, ...old[kind] };
}
function grassYield(s: Farm) {
  return s.researchRevision === 2
    ? 2 ** Math.max(0, level(s, "grass", 10) - 1)
    : 1;
}
function growth(s: Farm, t: Tile, index: number) {
  if (t.planted === null && (t.ground ?? "Grassland") === "Grassland") {
    t.entity = "Grass";
    t.planted = t.emptySince ?? s.time;
    t.updatedAt = t.planted;
    t.progress = 0;
    t.yield = grassYield(s);
  }
  if (t.planted === null) return;
  const kind = t.entity ?? "Wheat";
  let duration = cropSpec(s, kind).seconds;
  if (s.researchRevision === 2 && ["Bush", "Carrot", "Tree"].includes(kind)) {
    // Stable variation per planting: save/reload never rerolls a crop.
    const fraction =
      Math.abs(
        Math.sin((t.planted + 1) * 12.9898 + index * 78.233) * 43758.5453,
      ) % 1;
    duration *= 0.8 + fraction * 0.4;
  }
  if (kind === "Tree") {
    const x = index % s.width,
      y = Math.floor(index / s.width);
    let neighbors = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (
        at(s, x + dx, y + dy)?.entity === "Tree" &&
        at(s, x + dx, y + dy)?.planted !== null
      )
        neighbors++;
    duration *= s.researchRevision === 2 ? 2 ** neighbors : 1 + 0.5 * neighbors;
  }
  const dt = Math.max(0, s.time - (t.updatedAt ?? t.planted));
  const bonus =
    s.researchRevision === 2
      ? 4
      : ([0, 0.25, 0.5, 1][level(s, "watering")] ?? 0);
  const moisture =
    s.researchRevision === 2 && dt > 0
      ? ((t.water ?? 0) * (1 - 0.99 ** dt)) / (-Math.log(0.99) * dt)
      : (t.water ?? 0);
  t.progress = Math.min(
    1,
    (t.progress ?? 0) + (dt / duration) * (1 + bonus * moisture),
  );
  t.updatedAt = s.time;
}
export const cropProgress = (s: Farm, t: Tile | undefined) =>
  !t || t.planted === null
    ? 0
    : Math.min(
        1,
        t.progress ??
          (s.time - t.planted) / cropData[t.entity ?? "Wheat"].seconds,
      );
function allowed(s: Farm, x: number, y: number) {
  return !!at(s, x, y) || placedSites(s).some((p) => p.x === x && p.y === y);
}
function walkable(s: Farm, x: number, y: number) {
  return allowed(s, x, y) && !s.buildings.some((b) => b.x === x && b.y === y);
}
function spawn(s: Farm, model: Model, ignore?: string) {
  const medium = models[model].medium;
  const candidates = [
    ...Array.from({ length: s.width * s.height }, (_, i) => ({
      x: i % s.width,
      y: Math.floor(i / s.width),
    })),
    ...placedSites(s),
  ];
  return candidates.find(
    (p) =>
      walkable(s, p.x, p.y) &&
      !s.robots.some(
        (r) =>
          r.id !== ignore &&
          !r.destroyed &&
          r.deployed &&
          models[r.model].medium === medium &&
          ((r.x === p.x && r.y === p.y) ||
            (r.moving?.x === p.x && r.moving?.y === p.y)),
      ),
  );
}
export function deploymentPosition(
  s: Farm,
  id: string,
): { x: number; y: number } | undefined {
  const r = s.robots.find((r) => r.id === id && !r.destroyed);
  if (!r) return;
  const occupied = (x: number, y: number) =>
    s.robots.some(
      (other) =>
        other.id !== id &&
        !other.destroyed &&
        other.deployed &&
        models[other.model].medium === models[r.model].medium &&
        ((other.x === x && other.y === y) ||
          (other.moving?.x === x && other.moving?.y === y) ||
          (other.reservation &&
            other.reservation.expires > s.time &&
            other.reservation.x === x &&
            other.reservation.y === y)),
    );
  if (walkable(s, r.x, r.y) && !occupied(r.x, r.y)) return { x: r.x, y: r.y };
  const candidates = [
    ...Array.from({ length: s.width * s.height }, (_, i) => ({
      x: i % s.width,
      y: Math.floor(i / s.width),
    })),
    ...placedSites(s),
  ];
  return candidates.find((p) => walkable(s, p.x, p.y) && !occupied(p.x, p.y));
}
export function recallBlocker(s: Farm, id: string): string | null {
  const r = s.robots.find((r) => r.id === id);
  if (!r || r.destroyed) return "Robot détruit ou introuvable";
  if (!r.deployed) return "Ce robot est déjà au garage";
  if (r.moving || r.readyAt > s.time)
    return "Attendez la fin de l’action ou du déplacement";
  return null;
}
export function recallRobot(s: Farm, id: string): boolean {
  syncBefore(s);
  if (recallBlocker(s, id)) return false;
  const r = s.robots.find((r) => r.id === id)!;
  r.deployed = false;
  delete r.reservation;
  delete r.moving;
  r.readyAt = s.time;
  sync(s);
  return true;
}
export function deployRobot(
  s: Farm,
  id: string,
  site?: { x: number; y: number },
): boolean {
  syncBefore(s);
  const r = s.robots.find((r) => r.id === id && !r.destroyed && !r.deployed),
    p = site ?? deploymentPosition(s, id);
  if (!r || !p || !walkable(s, p.x, p.y) || robotSiteOccupied(s, r, p))
    return false;
  const loan = s.robots.find(
    (other) =>
      other.loan && !other.destroyed && r.model === "Farmer" && !r.loan,
  );
  if (
    loan &&
    (loan.moving ||
      loan.readyAt > s.time ||
      loan.water + r.water > tankCapacity(s, r))
  )
    return false;
  if (loan) {
    for (const [item, n] of Object.entries(loan.inventory))
      r.inventory[item as Item] = (r.inventory[item as Item] ?? 0) + (n ?? 0);
    r.water += loan.water;
    if (r.code === DEFAULT_PROGRAM) r.code = loan.code;
    s.robots = s.robots.filter((other) => other.id !== loan.id);
    if (s.activeRobotId === loan.id) s.activeRobotId = r.id;
  }
  r.x = p.x;
  r.y = p.y;
  r.deployed = true;
  r.readyAt = s.time;
  delete r.reservation;
  delete r.moving;
  if (at(s, p.x, p.y)) {
    const index = p.y * s.width + p.x;
    if (!s.visited.includes(index)) s.visited.push(index);
  }
  sync(s);
  return true;
}
export function freeSlots(s: Farm) {
  return placedSites(s).filter(
    (p) => !s.buildings.some((b) => sameCell(b, p)) && !siteOccupied(s, p),
  );
}
export function shopBlocker(
  s: Farm,
  kind: Model | BuildingKind | "Fertilizer",
  quantity = 1,
  site?: { x: number; y: number },
): string | null {
  if (!Number.isSafeInteger(quantity) || quantity <= 0)
    return "Choisissez une quantité entière positive";
  const spec =
    kind === "Fertilizer"
      ? { price: 25, research: "consumables" }
      : kind in models
        ? models[kind as Model]
        : buildings[kind as BuildingKind];
  if (!spec) return "Article inconnu";
  if (!s.unlocks.includes(spec.research))
    return (
      "Recherche requise : " +
      (research.find((r) => r.id === spec.research)?.name ?? spec.research)
    );
  if (quantity !== 1 && kind !== "Fertilizer")
    return "Un seul exemplaire par achat";
  if (s.gold < spec.price * quantity) return "Or insuffisant";
  if (kind === "Fertilizer" && totalStock(s) + quantity > stockCapacity(s))
    return "Dépôts pleins";
  if (kind in models) {
    const loan = s.robots.find(
      (r) => r.loan && !r.destroyed && kind === "Farmer",
    );
    if (!spawn(s, kind as Model, loan?.id))
      return "Aucune case de départ libre pour ce modèle";
  }
  if (kind in buildings) {
    const slots = freeSlots(s);
    if (!slots.length)
      return "Aménagez un bloc de béton libre depuis l’inventaire";
    if (site && !slots.some((p) => p.x === site.x && p.y === site.y))
      return "Emplacement inaccessible ou occupé";
  }
  return null;
}
export function purchase(
  s: Farm,
  kind: Model | BuildingKind | "Fertilizer",
  quantity = 1,
  site?: { x: number; y: number },
): boolean {
  syncBefore(s);
  if (shopBlocker(s, kind, quantity, site)) return false;
  if (kind === "Fertilizer") {
    s.gold -= 25 * quantity;
    addStock(s, { Fertilizer: quantity });
  } else if (kind in models) {
    const model = kind as Model;
    const loan = s.robots.find(
      (r) => r.loan && !r.destroyed && model === "Farmer",
    );
    const pos = spawn(s, model, loan?.id)!;
    const next = robot(ids(s, "f"), model, pos.x, pos.y, models[model].price);
    if (loan) {
      next.inventory = { ...loan.inventory };
      next.water = loan.water;
      next.code = loan.code;
      s.robots = s.robots.filter((r) => r.id !== loan.id);
      if (s.activeRobotId === loan.id) s.activeRobotId = next.id;
    }
    s.robots.push(next);
    s.gold -= models[model].price;
  } else {
    const type = kind as BuildingKind,
      pos = site ?? freeSlots(s)[0];
    s.buildings.push(
      building(ids(s, "b"), type, pos.x, pos.y, buildings[type].price),
    );
    s.gold -= buildings[type].price;
  }
  sync(s);
  return true;
}
function quantity(n: unknown): number {
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n <= 0)
    throw new Error("La quantité doit être un entier positif.");
  return n;
}
export function sellStock(s: Farm, item: Item, n: number): number {
  syncBefore(s);
  quantity(n);
  if (!isItem(item)) throw new Error("Cette ressource n’est pas vendable.");
  const amount = Math.min(n, getStock(s, item));
  removeStock(s, item, amount);
  s.gold += amount * salePrices[item];
  sync(s);
  return amount;
}
export function sell(s: Farm): boolean {
  if (s.stock < 10) return false;
  return sellStock(s, "Wheat", 10) === 10;
}
export function fulfillOrder(s: Farm, id: string): boolean {
  syncBefore(s);
  const o = tradeOrders.find((o) => o.id === id),
    period = Math.floor(s.time / 600);
  if (
    !o ||
    (o.unlock && !s.unlocks.includes(o.unlock)) ||
    s.orderPeriods[id] === period ||
    getStock(s, o.item) < o.quantity
  )
    return false;
  removeStock(s, o.item, o.quantity);
  s.gold += o.payment;
  s.orderPeriods[id] = period;
  sync(s);
  return true;
}
function ensureFarmer(s: Farm) {
  if (s.robots.some((r) => r.model === "Farmer" && !r.destroyed)) return;
  const pos = spawn(s, "Farmer");
  if (pos) {
    const loan = robot(ids(s, "f"), "Farmer", pos.x, pos.y, 0, true);
    s.robots.push(loan);
  }
}
export function assetBlocker(s: Farm, id: string): string | null {
  const r = s.robots.find((r) => r.id === id);
  if (r) {
    if (r.destroyed) return "Une carcasse ne peut pas être revendue";
    if (r.loan) return "Le fermier de secours est prêté et non vendable";
    if (sum(r.inventory) || r.water)
      return "Videz la soute et le réservoir avant revente";
    if (r.moving || r.readyAt > s.time) return "Attendez la fin de l’action";
    return null;
  }
  const b = s.buildings.find((b) => b.id === id);
  if (!b) return "Objet introuvable";
  if (b.id === "b1") return "Conservez le dépôt initial pour repartir";
  if (sum(b.inventory) || sum(b.input) || sum(b.output) || b.water || b.cycle)
    return "Videz le bâtiment et terminez son cycle";
  return null;
}
export function resellAsset(s: Farm, id: string): boolean {
  syncBefore(s);
  if (assetBlocker(s, id)) return false;
  const r = s.robots.find((r) => r.id === id),
    b = s.buildings.find((b) => b.id === id);
  s.gold += (r?.paid ?? b?.paid ?? 0) / 2;
  s.robots = s.robots.filter((r) => r.id !== id);
  s.buildings = s.buildings.filter((b) => b.id !== id);
  ensureFarmer(s);
  sync(s);
  return true;
}
export function repair(s: Farm, id: string): boolean {
  syncBefore(s);
  const r = s.robots.find((r) => r.id === id && r.destroyed);
  if (!r || !s.buildings.some((b) => b.kind === "Workshop")) return false;
  const loan = s.robots.find(
    (b) => b.loan && !b.destroyed && r.model === "Farmer",
  );
  const pos = spawn(s, r.model, loan?.id);
  const cost = models[r.model].price * 0.4;
  if (!pos || s.gold < cost) return false;
  s.gold -= cost;
  r.destroyed = false;
  r.deployed = true;
  delete r.lastError;
  r.x = pos.x;
  r.y = pos.y;
  r.inventory = loan ? { ...loan.inventory } : {};
  r.water = loan?.water ?? 0;
  r.readyAt = s.time;
  if (loan) {
    s.robots = s.robots.filter((b) => b.id !== loan.id);
    if (s.activeRobotId === loan.id) s.activeRobotId = r.id;
  }
  sync(s);
  return true;
}
export function relocateBuilding(
  s: Farm,
  id: string,
  site: { x: number; y: number },
  paused: boolean,
): boolean {
  syncBefore(s);
  const b = s.buildings.find((b) => b.id === id);
  if (
    !paused ||
    !b ||
    sum(b.inventory) ||
    sum(b.input) ||
    sum(b.output) ||
    b.water ||
    b.cycle ||
    !freeSlots(s).some((p) => p.x === site.x && p.y === site.y)
  )
    return false;
  b.x = site.x;
  b.y = site.y;
  return true;
}
function destroy(r: Robot) {
  r.destroyed = true;
  r.deployed = false;
  r.inventory = {};
  r.water = 0;
  delete r.moving;
  delete r.reservation;
}
export function releaseReservation(s: Farm, id: string) {
  const r = s.robots.find((r) => r.id === id);
  if (r) delete r.reservation;
}
function waterGroup(s: Farm, first: Building) {
  const group = [first];
  for (let i = 0; i < group.length; i++)
    for (const b of s.buildings)
      if (
        (b.kind === "Well" || b.kind === "Cistern") &&
        !group.includes(b) &&
        adjacent(group[i], b)
      )
        group.push(b);
  return group;
}
export const waterCapacity = (s: Farm, b: Building) =>
  s.assetProgression === 1
    ? Math.max(
        b.waterCapacityFloor ?? 0,
        b.kind === "Well"
          ? 100
          : 400 * 4 ** Math.max(0, (b.upgrades?.waterStorage ?? 1) - 1),
      )
    : (b.kind === "Well" ? 100 : 400) *
      (level(s, "reservoir", 5) >= 2
        ? 3 * 2 ** (level(s, "reservoir", 5) - 2)
        : 1);
export const machineRate = (b: Building) =>
  Math.max(
    b.productionFloor ?? 1,
    2 ** Math.max(0, (b.upgrades?.production ?? 1) - 1),
  );
function setWater(s: Farm, group: Building[], n: number) {
  for (const b of group) {
    b.water = Math.min(n, waterCapacity(s, b));
    n -= b.water;
  }
}
export function buildingStatus(
  b: Building,
): "working" | "missing_input" | "output_full" | "idle" | null {
  const recipe = recipes[b.kind];
  if (!recipe) return null;
  if (b.cycle) return "working";
  if (sum(b.output) + sum(recipe.output) > 50) return "output_full";
  return sum(b.input) || sum(b.output) ? "missing_input" : "idle";
}
function machine(s: Farm, b: Building, cursor: number) {
  const recipe = recipes[b.kind];
  if (!recipe) return;
  let loops = 0;
  while (loops++ < 1000) {
    if (b.cycle) {
      if (b.cycle.ends > s.time) return;
      for (const [item, n] of Object.entries(recipe.output)) {
        b.output[item as Item] = (b.output[item as Item] ?? 0) + n;
        s.produced[item as Item] = (s.produced[item as Item] ?? 0) + n;
      }
      cursor = b.cycle.ends;
      delete b.cycle;
    }
    if (
      sum(b.output) + sum(recipe.output) > 50 ||
      Object.entries(recipe.input).some(
        ([i, n]) => (b.input[i as Item] ?? 0) < n,
      )
    )
      return;
    for (const [i, n] of Object.entries(recipe.input))
      b.input[i as Item] = (b.input[i as Item] ?? 0) - n;
    const multiplier = s.unlocks.includes("mechanization2")
      ? 0.5
      : s.unlocks.includes("mechanization")
        ? 0.75
        : 1;
    const machineLevel =
      b.kind === "Mill"
        ? level(s, "milling", 5)
        : b.kind === "Oven"
          ? level(s, "bakery", 5)
          : 1;
    b.cycle = {
      ends:
        cursor +
        (s.assetProgression === 1
          ? recipe.duration / machineRate(b)
          : (recipe.duration * multiplier) /
            2 ** Math.max(0, machineLevel - 1)),
    };
    if (b.cycle.ends > s.time) return;
  }
}
export function advance(s: Farm, delta: number) {
  syncBefore(s);
  const previous = s.time;
  s.time += Math.max(0, delta);
  if (s.researchRevision === 2 && s.unlocks.includes("watering")) {
    const produced =
      (s.waterRemainder ?? 0) +
      Math.max(0, delta) * 0.1 * 2 ** Math.max(0, level(s, "watering", 9) - 1);
    const whole = Math.floor(produced + 1e-9);
    s.waterItems =
      s.assetProgression === 1
        ? Math.max(s.waterItems ?? 0, Math.min(10, (s.waterItems ?? 0) + whole))
        : (s.waterItems ?? 0) + whole;
    s.waterRemainder = Math.max(0, produced - whole);
  }
  for (let i = 0; i < s.tiles.length; i++) {
    growth(s, s.tiles[i], i);
    s.tiles[i].water = Math.max(
      0,
      s.researchRevision === 2
        ? (s.tiles[i].water ?? 0) * 0.99 ** Math.max(0, delta)
        : (s.tiles[i].water ?? 0) - Math.max(0, delta) * 0.01,
    );
  }
  const live = s.robots.filter((r) => !r.destroyed && r.deployed),
    arriving = live.filter((r) => r.moving && r.moving.ends <= s.time),
    crashed = new Set<Robot>();
  for (const r of arriving) {
    const m = r.moving!;
    for (const other of live) {
      if (other === r || models[r.model].medium !== models[other.model].medium)
        continue;
      const om = other.moving;
      if (
        om &&
        om.x === m.fromX &&
        om.y === m.fromY &&
        om.fromX === m.x &&
        om.fromY === m.y &&
        Math.max(om.started, m.started) <= Math.min(om.ends, m.ends)
      ) {
        crashed.add(r);
        crashed.add(other);
      }
    }
    r.x = m.x;
    r.y = m.y;
    delete r.moving;
    delete r.reservation;
    if (at(s, r.x, r.y)) {
      const index = r.y * s.width + r.x;
      if (!s.visited.includes(index)) s.visited.push(index);
    }
  }
  for (let i = 0; i < live.length; i++)
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i],
        b = live[j];
      if (
        a.x === b.x &&
        a.y === b.y &&
        models[a.model].medium === models[b.model].medium
      ) {
        crashed.add(a);
        crashed.add(b);
      }
    }
  for (const r of crashed) destroy(r);
  for (const r of live)
    if (r.reservation && r.reservation.expires <= s.time) delete r.reservation;
  const seen = new Set<string>();
  for (const b of s.buildings) {
    machine(s, b, previous);
    if ((b.kind === "Well" || b.kind === "Cistern") && !seen.has(b.id)) {
      const g = waterGroup(s, b);
      g.forEach((b) => seen.add(b.id));
      const amount =
        g.reduce((n, b) => n + b.water, 0) +
        g
          .filter((b) => b.kind === "Well")
          .reduce(
            (n, b) =>
              n +
              (s.assetProgression === 1
                ? 2 ** Math.max(0, (b.upgrades?.waterRate ?? 1) - 1)
                : 1),
            0,
          ) *
          Math.max(0, delta);
      setWater(
        s,
        g,
        Math.min(
          amount,
          g.reduce((n, b) => n + waterCapacity(s, b), 0),
        ),
      );
    }
  }
  ensureFarmer(s);
  sync(s);
}
const offsets: Record<string, [number, number]> = {
  North: [0, 1],
  South: [0, -1],
  East: [1, 0],
  West: [-1, 0],
};
export function command(
  s: Farm,
  name: string,
  args: unknown[],
  robotId = s.activeRobotId,
): unknown {
  syncBefore(s);
  const r = s.robots.find((r) => r.id === robotId && !r.destroyed);
  if (!r) throw new Error("Ce robot est détruit ou indisponible.");
  if (!r.deployed)
    throw new Error("Ce robot est au garage. Déployez-le depuis la flotte.");
  const requireUnlock = (id: string) => {
    if (!s.unlocks.includes(id))
      throw new Error(
        `Recherchez « ${research.find((r) => r.id === id)?.name ?? id} » avant cet appel.`,
      );
  };
  const current = at(s, r.x, r.y),
    index = r.y * s.width + r.x;
  if (current) growth(s, current, index);
  const ready =
    !!current && current.planted !== null && (current.progress ?? 0) >= 1;
  const direction = (value: unknown, wrap = false) => {
    const d = offsets[String(value)];
    if (!d) throw new Error("Direction invalide.");
    const p = { x: r.x + d[0], y: r.y + d[1] };
    if (
      wrap &&
      s.researchRevision === 2 &&
      at(s, r.x, r.y) &&
      !walkable(s, p.x, p.y)
    ) {
      p.x = (p.x + s.width) % s.width;
      p.y = (p.y + s.height) % s.height;
    }
    return p;
  };
  const targetBuilding = (value: unknown) => {
    const p = direction(value);
    return s.buildings.find((b) => b.x === p.x && b.y === p.y);
  };
  const getItem = (value: unknown) => {
    if (!isItem(value)) throw new Error("Ressource ou consommable inconnu.");
    return value;
  };
  const farmerOnly = () => r.model === "Farmer";
  const consumeTime = () => {
    if (name === "move") return 1 / robotSpeed(s, r);
    if (
      s.assetProgression === 1 &&
      ["deposit", "load", "deliver", "collect"].includes(name)
    )
      return (
        ((r.loan ? 2 : 1) * (s.unlocks.includes("speed") ? 0.5 : 1)) /
        2 ** Math.max(0, equipmentLevel(s, r, "handling") - 1)
      );
    const movement = [
      "plant",
      "harvest",
      "till",
      "watering",
      "use_item",
      "harvest_group",
    ].includes(name)
      ? actionDuration(s, r)
      : (r.loan ? 2 : 1) * (s.unlocks.includes("speed") ? 0.5 : 1);
    return movement;
  };
  const actions = [
    "plant",
    "harvest",
    "deposit",
    "load",
    "move",
    "till",
    "watering",
    "use_item",
    "harvest_group",
    "refill_water",
    "deliver",
    "collect",
    "sell",
  ];
  if (actions.includes(name)) r.readyAt = s.time + consumeTime();
  let result: unknown;
  switch (name) {
    case "plant": {
      const kind = args[0] as Crop;
      if (!Object.hasOwn(cropData, String(kind)))
        throw new Error("Culture inconnue.");
      if (s.researchRevision === 2) requireUnlock("plant");
      const spec = cropSpec(s, kind);
      if (
        spec.unlock &&
        !(s.progressionVersion === 1 && spec.unlock === "wheat-base")
      )
        requireUnlock(spec.unlock);
      if (
        !farmerOnly() ||
        !current ||
        (current.planted !== null && current.entity !== "Grass") ||
        (spec.soil !== "Any" &&
          (current.ground ?? "Grassland") !== spec.soil) ||
        Object.entries(spec.cost).some(
          ([i, n]) => (r.inventory[i as Item] ?? 0) < n,
        )
      ) {
        result = false;
        break;
      }
      for (const [i, n] of Object.entries(spec.cost))
        r.inventory[i as Item] = (r.inventory[i as Item] ?? 0) - n;
      const base =
        kind === "Wheat"
          ? s.wheatLevel
          : level(s, kind.toLowerCase(), spec.yields.length);
      current.planted = s.time;
      current.entity = kind;
      current.progress = 0;
      current.updatedAt = s.time;
      current.level = Math.max(1, base);
      current.yield = spec.yields[Math.max(0, base - 1)] ?? spec.yields[0];
      current.grouped = false;
      s.planted++;
      if (s.researchRevision === 2) r.readyAt = s.time + actionDuration(s, r);
      result = true;
      break;
    }
    case "harvest": {
      if (s.progressionVersion === 2) r.readyAt = s.time + TICK_SECONDS;
      if (
        farmerOnly() &&
        current &&
        current.planted !== null &&
        !ready &&
        s.progressionVersion === 2
      ) {
        current.planted = null;
        current.emptySince = s.time;
        delete current.entity;
        current.progress = 0;
        r.readyAt = s.time + 200 * TICK_SECONDS * actionDuration(s, r);
        result = true;
        break;
      }
      if (!farmerOnly() || !ready || !current) {
        result = false;
        break;
      }
      const n = Math.min(
        current.yield,
        Math.max(0, capacity(s, r) - sum(r.inventory)),
      );
      if (n <= 0) {
        result = false;
        break;
      }
      const item = cropData[current.entity ?? "Wheat"].resource;
      r.inventory[item] = (r.inventory[item] ?? 0) + n;
      if (s.progressionVersion === 2)
        r.readyAt = s.time + 200 * TICK_SECONDS * actionDuration(s, r);
      s.harvestedItems[item] = (s.harvestedItems[item] ?? 0) + n;
      s.harvested += n;
      current.yield -= n;
      if (!current.yield) {
        current.planted = null;
        current.emptySince = s.time;
        delete current.entity;
        current.progress = 0;
      }
      result = true;
      break;
    }
    case "deposit": {
      let total = 0;
      for (const b of depots(s).filter((b) => adjacent(r, b))) {
        for (const item of items) {
          const n = Math.min(
            r.inventory[item] ?? 0,
            Math.max(0, depotCapacity(s, b) - sum(b.inventory)),
          );
          b.inventory[item] = (b.inventory[item] ?? 0) + n;
          r.inventory[item] = (r.inventory[item] ?? 0) - n;
          s.depositedItems[item] = (s.depositedItems[item] ?? 0) + n;
          total += n;
        }
      }
      s.deposited += total;
      result = total;
      break;
    }
    case "load": {
      const item = getItem(args[0]);
      const requirement: Partial<Record<Item, string>> = {
        Wood: "bush",
        Carrot: "carrot",
        Pumpkin: "pumpkin",
        Flour: "milling",
        Bread: "bakery",
        Plank: "sawmill",
        Fertilizer: "consumables",
      };
      if (requirement[item]) requireUnlock(requirement[item]!);
      let remaining = quantity(args[1]),
        total = 0;
      for (const b of depots(s).filter((b) => adjacent(r, b))) {
        const n = Math.min(
          remaining,
          b.inventory[item] ?? 0,
          Math.max(0, capacity(s, r) - sum(r.inventory)),
        );
        b.inventory[item] = (b.inventory[item] ?? 0) - n;
        r.inventory[item] = (r.inventory[item] ?? 0) + n;
        remaining -= n;
        total += n;
      }
      result = total;
      break;
    }
    case "move": {
      if (s.researchRevision === 2) requireUnlock("move");
      const p = direction(args[0], true);
      const reserved = s.robots.some(
        (other) =>
          other.id !== r.id &&
          !other.destroyed &&
          other.deployed &&
          models[other.model].medium === models[r.model].medium &&
          other.reservation &&
          other.reservation.expires > s.time &&
          other.reservation.x === p.x &&
          other.reservation.y === p.y,
      );
      if (!walkable(s, p.x, p.y) || reserved || r.moving) {
        result = false;
        break;
      }
      r.moving = {
        ...p,
        fromX: r.x,
        fromY: r.y,
        started: s.time,
        ends: r.readyAt,
      };
      result = true;
      break;
    }
    case "till":
      requireUnlock("till");
      if (
        !farmerOnly() ||
        !current ||
        (current.planted !== null && current.entity !== "Grass")
      ) {
        result = false;
        break;
      }
      current.planted = null;
      current.emptySince = s.time;
      delete current.entity;
      current.progress = 0;
      current.ground = current.ground === "Soil" ? "Grassland" : "Soil";
      result = true;
      break;
    case "watering":
      requireUnlock("watering");
      if (s.researchRevision === 2) {
        const waterCost =
          s.assetProgression === 1
            ? 0.8 ** Math.max(0, equipmentLevel(s, r, "application") - 1)
            : 1;
        if (
          r.model === "Transporter" ||
          !current ||
          (current.water ?? 0) >= 1 ||
          ((s.waterItems ?? 0) < 1 && r.water <= 0)
        ) {
          result = false;
          break;
        }
        if (r.water > 0) {
          const drawn = Math.min(r.water, waterCost);
          r.water -= drawn;
          if (r.water < 1e-9) r.water = 0;
          current.water = Math.min(
            1,
            (current.water ?? 0) + (0.25 * drawn) / waterCost,
          );
        } else {
          s.waterItems!--;
          current.water = Math.min(1, (current.water ?? 0) + 0.25 / waterCost);
        }
        result = true;
        break;
      }
      requireUnlock("tank");
      if (
        r.model === "Transporter" ||
        !current ||
        r.water < 1 ||
        (current.water ?? 0) >= 1
      ) {
        result = false;
        break;
      }
      r.water--;
      current.water = Math.min(1, (current.water ?? 0) + 0.25);
      result = true;
      break;
    case "use_item": {
      requireUnlock("consumables");
      if (args[0] === "Water") {
        requireUnlock("watering");
        const n = args[1] === undefined ? 1 : Number(args[1]);
        if (!Number.isSafeInteger(n) || n < 1)
          throw new Error("La quantité doit être un entier positif.");
        const amount = Math.min(
          n,
          Math.ceil(
            (1 - (current?.water ?? 0)) *
              4 *
              (s.assetProgression === 1
                ? 0.8 ** Math.max(0, equipmentLevel(s, r, "application") - 1)
                : 1),
          ),
          s.waterItems ?? 0,
        );
        if (r.model === "Transporter" || !current || amount < 1) {
          result = false;
          break;
        }
        s.waterItems! -= amount;
        current.water = Math.min(
          1,
          (current.water ?? 0) +
            (amount * 0.25) /
              (s.assetProgression === 1
                ? 0.8 ** Math.max(0, equipmentLevel(s, r, "application") - 1)
                : 1),
        );
        result = true;
        break;
      }
      requireUnlock("fertilizer");
      if (args[0] !== "Fertilizer")
        throw new Error("Utilisez Items.Fertilizer.");
      if (
        r.model === "Transporter" ||
        !current ||
        current.planted === null ||
        ready ||
        (r.inventory.Fertilizer ?? 0) < 1
      ) {
        result = false;
        break;
      }
      const n = args[1] === undefined ? 1 : Number(args[1]);
      if (!Number.isSafeInteger(n) || n < 1)
        throw new Error("La quantité doit être un entier positif.");
      const gain = [0, 0.2, 0.35, 0.5][level(s, "fertilizer")] ?? 0.2;
      const amount = Math.min(
        n,
        Math.ceil((1 - (current.progress ?? 0)) / gain),
        r.inventory.Fertilizer!,
      );
      r.inventory.Fertilizer! -= amount;
      current.progress = Math.min(1, (current.progress ?? 0) + gain * amount);
      result = true;
      break;
    }
    case "harvest_group": {
      requireUnlock("group");
      const square = [
        at(s, r.x, r.y),
        at(s, r.x + 1, r.y),
        at(s, r.x, r.y + 1),
        at(s, r.x + 1, r.y + 1),
      ];
      square.forEach((t, i) => {
        if (t)
          growth(s, t, (r.y + Math.floor(i / 2)) * s.width + r.x + (i % 2));
      });
      if (
        !farmerOnly() ||
        square.some(
          (t) =>
            !t ||
            t.entity !== "Pumpkin" ||
            t.planted === null ||
            (t.progress ?? 0) < 1 ||
            t.grouped ||
            t.level !== square[0]?.level,
        )
      ) {
        result = false;
        break;
      }
      for (const t of square) {
        t!.yield = Math.floor(
          t!.yield * (s.unlocks.includes("group2") ? 2 : 1.5),
        );
        t!.grouped = true;
      }
      result = command(s, "harvest", [], r.id);
      break;
    }
    case "refill_water": {
      requireUnlock("tank");
      const b = s.buildings.find(
        (b) => (b.kind === "Well" || b.kind === "Cistern") && adjacent(r, b),
      );
      if (!b || r.model === "Transporter" || r.water >= tankCapacity(s, r)) {
        result = false;
        break;
      }
      const g = waterGroup(s, b),
        available = g.reduce((n, b) => n + b.water, 0),
        n = Math.min(tankCapacity(s, r) - r.water, available);
      r.water += n;
      setWater(s, g, available - n);
      result = n > 0;
      break;
    }
    case "can_harvest":
      requireUnlock("sensor");
      if (s.assetProgression === 1 && equipmentLevel(s, r, "sensor") < 1)
        throw new Error(
          `Installez un capteur de maturité sur ${r.id} dans Atelier → Améliorer un robot.`,
        );
      result = ready;
      break;
    case "get_entity_type":
      requireUnlock("analysis");
      if (s.assetProgression === 1 && equipmentLevel(s, r, "analysis") < 1)
        throw new Error(
          "Équipez ce robot du capteur correspondant dans Atelier → Améliorer un robot.",
        );
      result = current?.planted !== null ? (current?.entity ?? null) : null;
      break;
    case "get_ground_type":
      requireUnlock("analysis");
      if (s.assetProgression === 1 && equipmentLevel(s, r, "analysis") < 1)
        throw new Error(
          "Équipez ce robot du capteur correspondant dans Atelier → Améliorer un robot.",
        );
      result = current?.ground ?? null;
      break;
    case "get_water":
      requireUnlock("humidity");
      if (s.assetProgression === 1 && equipmentLevel(s, r, "humidity") < 1)
        throw new Error(
          "Équipez ce robot du capteur correspondant dans Atelier → Améliorer un robot.",
        );
      result = current?.water ?? 0;
      break;
    case "get_pos_x":
      requireUnlock("position");
      result = r.x;
      break;
    case "get_pos_y":
      requireUnlock("position");
      result = r.y;
      break;
    case "get_world_size":
      requireUnlock("position");
      result = { width: s.width, height: s.height };
      break;
    case "get_inventory":
      result =
        args[0] === "Water"
          ? (s.waterItems ?? 0)
          : (r.inventory[getItem(args[0])] ?? 0);
      break;
    case "get_stock":
      result = getStock(s, getItem(args[0]));
      break;
    case "get_capacity":
      result = capacity(s, r);
      break;
    case "get_gold":
      result = s.gold;
      break;
    case "print":
      requireUnlock("print");
      result = null;
      break;
    case "is_occupied":
    case "reserve": {
      requireUnlock(name === "reserve" ? "traffic2" : "traffic");
      if (s.assetProgression === 1 && equipmentLevel(s, r, "traffic") < 1)
        throw new Error("Installez la détection d’obstacles sur ce robot.");
      const p = direction(args[0], true);
      const occupied = s.robots.some(
        (other) =>
          other.id !== r.id &&
          !other.destroyed &&
          other.deployed &&
          models[other.model].medium === models[r.model].medium &&
          ((other.x === p.x && other.y === p.y) ||
            (other.moving?.x === p.x && other.moving?.y === p.y)),
      );
      if (name === "is_occupied") {
        result = occupied;
        break;
      }
      const reserved = s.robots.some(
        (o) =>
          o.id !== r.id &&
          o.deployed &&
          !o.destroyed &&
          o.reservation &&
          o.reservation.expires > s.time &&
          models[o.model].medium === models[r.model].medium &&
          o.reservation.x === p.x &&
          o.reservation.y === p.y,
      );
      if (occupied || reserved || !walkable(s, p.x, p.y)) {
        result = false;
        break;
      }
      r.reservation = { ...p, expires: s.time + 5 };
      result = true;
      break;
    }
    case "release":
      requireUnlock("traffic2");
      result = !!r.reservation;
      delete r.reservation;
      break;
    case "deliver":
    case "collect": {
      requireUnlock("construction");
      const b = targetBuilding(args[0]),
        item = getItem(args[1]),
        n = quantity(args[2]);
      if (!b || !recipes[b.kind]) {
        result = 0;
        break;
      }
      if (name === "deliver") {
        requireUnlock(buildings[b.kind].research);
        if (!Object.hasOwn(recipes[b.kind]!.input, item)) {
          result = 0;
          break;
        }
        const amount = Math.min(
          n,
          r.inventory[item] ?? 0,
          Math.max(0, 50 - sum(b.input)),
        );
        r.inventory[item] = (r.inventory[item] ?? 0) - amount;
        b.input[item] = (b.input[item] ?? 0) + amount;
        machine(s, b, s.time);
        result = amount;
      } else {
        const amount = Math.min(
          n,
          b.output[item] ?? 0,
          Math.max(0, capacity(s, r) - sum(r.inventory)),
        );
        b.output[item] = (b.output[item] ?? 0) - amount;
        r.inventory[item] = (r.inventory[item] ?? 0) + amount;
        result = amount;
      }
      break;
    }
    case "get_building_stock": {
      requireUnlock("construction");
      const b = targetBuilding(args[0]),
        item = getItem(args[1]);
      result = b ? (b.input[item] ?? 0) + (b.output[item] ?? 0) : 0;
      break;
    }
    case "get_building_status": {
      requireUnlock("construction");
      const b = targetBuilding(args[0]);
      result = b ? buildingStatus(b) : null;
      break;
    }
    case "sell":
      requireUnlock("commerce");
      result = sellStock(s, getItem(args[0]), quantity(args[1]));
      break;
    default:
      throw new Error(`Commande inconnue : ${name}`);
  }
  sync(s);
  if (
    s.researchRevision === 2 &&
    (!actions.includes(name) ||
      (["plant", "move", "use_item", "watering"].includes(name) &&
        result === false))
  )
    r.readyAt = s.time + TICK_SECONDS;
  return result;
}
export { missions } from "../../missions/domain/missions";
export function missionBlocker(s: Farm, id: string): string | null {
  const sequence = missionsFor(s);
  const index = sequence.findIndex((m) => m.id === id),
    m = sequence[index];
  if (!m) return "Mission introuvable";
  if (s.claimed.includes(id)) return "Récompense déjà récupérée";
  if (
    sequence
      .slice(0, index)
      .some((previous) => !s.claimed.includes(previous.id))
  )
    return "Terminez les missions précédentes";
  if (m.progress(s) < m.target) return "Objectif en cours";
  if (m.reward && totalStock(s) + m.reward > stockCapacity(s))
    return "Dépôt plein : vendez ou utilisez des ressources pour récupérer les blés";
  return null;
}
export function claim(s: Farm, id: string): boolean {
  syncBefore(s);
  const m = missionsFor(s).find((m) => m.id === id);
  if (!m || missionBlocker(s, id)) return false;
  if (m.reward) addStock(s, { Wheat: m.reward });
  s.gold += m.gold;
  s.claimed.push(id);
  return true;
}

export type Site = { x: number; y: number };
const sameCell = (a: Site, b: Site) => a.x === b.x && a.y === b.y;
export function placedSites(s: Farm): Site[] {
  return s.sites ?? constructionSlots.slice(0, slotCount(s));
}
export const siteCandidates: Site[] = Array.from(
  { length: 12 * 12 },
  (_, i) => ({
    x: (i % 12) - 1,
    y: Math.floor(i / 12) - 1,
  }),
).filter((p) => p.x === -1 || p.x === 10 || p.y === -1 || p.y === 10);
function siteOccupied(s: Farm, p: Site) {
  return s.robots.some(
    (r) =>
      !r.destroyed &&
      r.deployed &&
      (sameCell(r, p) ||
        (r.moving && sameCell(r.moving, p)) ||
        (r.reservation &&
          r.reservation.expires > s.time &&
          sameCell(r.reservation, p))),
  );
}
function robotSiteOccupied(s: Farm, r: Robot, p: Site) {
  return s.robots.some(
    (other) =>
      other.id !== r.id &&
      !other.destroyed &&
      other.deployed &&
      models[r.model].medium === models[other.model].medium &&
      (sameCell(other, p) ||
        (other.moving && sameCell(other.moving, p)) ||
        (other.reservation &&
          other.reservation.expires > s.time &&
          sameCell(other.reservation, p))),
  );
}
function connectedSites(s: Farm, sites: Site[]) {
  const reached = new Set<string>(),
    key = (p: Site) => `${p.x},${p.y}`;
  let added = true;
  while (added) {
    added = false;
    for (const p of sites)
      if (
        !reached.has(key(p)) &&
        [
          { x: p.x + 1, y: p.y },
          { x: p.x - 1, y: p.y },
          { x: p.x, y: p.y + 1 },
          { x: p.x, y: p.y - 1 },
        ].some((n) => !!at(s, n.x, n.y) || reached.has(key(n)))
      ) {
        reached.add(key(p));
        added = true;
      }
  }
  return reached.size === sites.length;
}
export function siteBlocker(s: Farm, p: Site, remove = false): string | null {
  if (
    !Number.isInteger(p.x) ||
    !Number.isInteger(p.y) ||
    (!siteCandidates.some((c) => sameCell(c, p)) &&
      !(remove && placedSites(s).some((c) => sameCell(c, p))))
  )
    return "Choisissez une case du pourtour, hors des futures parcelles agricoles.";
  const sites = placedSites(s),
    exists = sites.some((c) => sameCell(c, p));
  if (siteOccupied(s, p))
    return "La case est occupée ou réservée par un robot. Attendez la fin de son déplacement.";
  if (remove) {
    if (!exists) return "Aucun terrain à retirer ici.";
    if (s.buildings.some((b) => sameCell(b, p)))
      return "Rangez d’abord le bâtiment dans l’inventaire.";
    if (
      !connectedSites(
        s,
        sites.filter((c) => !sameCell(c, p)),
      )
    )
      return "Ce bloc relie d’autres terrains. Retirez d’abord les blocs qui en dépendent.";
  } else {
    if (exists) return "Un bloc de béton existe déjà ici.";
    if (sites.length >= slotCount(s))
      return "Tous vos terrains sont posés. Retirez un bloc libre ou débloquez un emplacement supplémentaire.";
    if (!connectedSites(s, [...sites, p]))
      return "Le nouveau bloc doit toucher votre ferme ou un terrain déjà posé.";
  }
  return null;
}
export function configureSite(
  s: Farm,
  p: Site,
  remove: boolean,
  paused: boolean,
): boolean {
  if (!paused || siteBlocker(s, p, remove)) return false;
  s.sites = remove
    ? placedSites(s).filter((c) => !sameCell(c, p))
    : [...placedSites(s), { ...p }];
  return true;
}
export function storeBuildingBlocker(s: Farm, id: string): string | null {
  const b = s.buildings.find((b) => b.id === id);
  if (!b) return "Bâtiment introuvable ou déjà rangé.";
  if (sum(b.inventory) || sum(b.input) || sum(b.output) || b.water || b.cycle)
    return "Videz les ressources, l’eau et les tampons, puis terminez le cycle avant de ranger ce bâtiment.";
  if (siteOccupied(s, b)) return "Un robot se déplace sur cette case.";
  return null;
}
export function storeBuilding(s: Farm, id: string, paused: boolean): boolean {
  syncBefore(s);
  if (!paused || storeBuildingBlocker(s, id)) return false;
  const b = s.buildings.find((b) => b.id === id)!;
  s.buildings = s.buildings.filter((b) => b.id !== id);
  s.storedBuildings.push(b);
  sync(s);
  return true;
}
export function buildingPlacementBlocker(
  s: Farm,
  id: string,
  p: Site,
): string | null {
  if (!s.storedBuildings.some((b) => b.id === id))
    return "Ce bâtiment n’est pas dans votre inventaire.";
  if (!freeSlots(s).some((c) => sameCell(c, p)))
    return "Choisissez un bloc de béton libre, sans robot ni réservation.";
  return null;
}
export function placeBuilding(
  s: Farm,
  id: string,
  p: Site,
  paused: boolean,
): boolean {
  syncBefore(s);
  if (!paused || buildingPlacementBlocker(s, id, p)) return false;
  const b = s.storedBuildings.find((b) => b.id === id)!;
  b.x = p.x;
  b.y = p.y;
  s.storedBuildings = s.storedBuildings.filter((b) => b.id !== id);
  s.buildings.push(b);
  sync(s);
  return true;
}
export function inventoryPurchaseBlocker(
  s: Farm,
  kind: Model | BuildingKind,
): string | null {
  const spec =
    kind in models ? models[kind as Model] : buildings[kind as BuildingKind];
  if (!spec) return "Article inconnu.";
  if (!s.unlocks.includes(spec.research))
    return `Recherche requise : ${research.find((r) => r.id === spec.research)?.name ?? spec.research}`;
  if (s.gold < spec.price) return "Or insuffisant.";
  if (
    kind in models
      ? s.robots.length >= 256
      : s.buildings.length + s.storedBuildings.length >= 256
  )
    return "Inventaire complet.";
  return null;
}
export function purchaseForInventory(
  s: Farm,
  kind: Model | BuildingKind,
): boolean {
  syncBefore(s);
  if (inventoryPurchaseBlocker(s, kind)) return false;
  if (kind in models) {
    const r = robot(
      ids(s, "f"),
      kind as Model,
      0,
      0,
      models[kind as Model].price,
    );
    r.deployed = false;
    s.robots.push(r);
    s.gold -= r.paid;
  } else {
    const b = building(
      ids(s, "b"),
      kind as BuildingKind,
      0,
      0,
      buildings[kind as BuildingKind].price,
    );
    s.storedBuildings.push(b);
    s.gold -= b.paid;
  }
  sync(s);
  return true;
}

export function robotPlacementBlocker(
  s: Farm,
  id: string,
  p: Site,
): string | null {
  const r = s.robots.find((r) => r.id === id && !r.destroyed && !r.deployed);
  if (!r) return "Ce robot n’est pas disponible dans l’inventaire.";
  if (!walkable(s, p.x, p.y) || robotSiteOccupied(s, r, p))
    return "Choisissez une case accessible et libre pour ce robot.";
  const loan = s.robots.find(
    (other) =>
      other.loan && !other.destroyed && r.model === "Farmer" && !r.loan,
  );
  if (
    loan &&
    (loan.moving ||
      loan.readyAt > s.time ||
      loan.water + r.water > tankCapacity(s, r))
  )
    return "Terminez l’action du fermier de secours et videz son réservoir si nécessaire.";
  return null;
}

export const { assetUpgradeSpec, assetUpgradeBlocker, upgradeAsset } =
  createAssetUpgradeService({
    syncBefore,
    sync,
    getStock,
    stockCapacity,
    removeStock,
  });
