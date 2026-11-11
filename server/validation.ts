import { validStickerPlacement } from "../src/modules/companion/domain/stickerPlacements.js";
type RecordValue = Record<string, unknown>;
const record = (v: unknown): v is RecordValue =>
  !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
function safeTree(value: unknown, depth = 0): boolean {
  if (depth > 20) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number")
    return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
  if (typeof value === "string") return value.length <= 100000;
  if (Array.isArray(value))
    return value.length <= 10000 && value.every((v) => safeTree(v, depth + 1));
  if (record(value))
    return (
      Object.keys(value).length <= 512 &&
      Object.entries(value).every(
        ([k, v]) =>
          k !== "__proto__" &&
          k !== "constructor" &&
          k !== "prototype" &&
          safeTree(v, depth + 1),
      )
    );
  return false;
}
const robotLimits: Record<string, [number, number]> = {
  hold: [1, 5],
  motor: [1, 5],
  tools: [1, 5],
  handling: [1, 5],
  tank: [1, 5],
  application: [1, 5],
  sensor: [0, 1],
  analysis: [0, 1],
  humidity: [0, 1],
  traffic: [0, 1],
};
const buildingLimits: Record<string, [number, number]> = {
  storage: [1, 10],
  workshop: [1, 3],
  waterRate: [1, 5],
  waterStorage: [1, 5],
  production: [1, 5],
};
function validLevels(value: unknown, limits: Record<string, [number, number]>) {
  return (
    value === undefined ||
    (record(value) &&
      Object.entries(value).every(
        ([id, n]) => Object.hasOwn(limits, id) && integer(n, ...limits[id]),
      ))
  );
}
export function validFarm(value: unknown): value is RecordValue {
  if (!record(value) || !safeTree(value)) return false;
  const f = value;
  if (f.assetProgression !== undefined && f.assetProgression !== 1)
    return false;
  if (f.previousProgram !== undefined && typeof f.previousProgram !== "string")
    return false;
  if (
    f.progressionVersion !== undefined &&
    f.progressionVersion !== 1 &&
    f.progressionVersion !== 2
  )
    return false;
  if (
    f.researchRevision !== undefined &&
    f.researchRevision !== 1 &&
    f.researchRevision !== 2
  )
    return false;
  if (
    f.legacyDepotCapacity !== undefined &&
    !integer(f.legacyDepotCapacity, 0, 10000)
  )
    return false;
  if (
    f.waterItems !== undefined &&
    !integer(f.waterItems, 0, Number.MAX_SAFE_INTEGER)
  )
    return false;
  if (
    f.waterRemainder !== undefined &&
    (typeof f.waterRemainder !== "number" ||
      f.waterRemainder < 0 ||
      f.waterRemainder >= 1.000000001)
  )
    return false;
  if (f.companion !== undefined) {
    const c = f.companion;
    if (
      !record(c) ||
      typeof c.skin !== "string" ||
      typeof c.accessory !== "string" ||
      (c.lens !== undefined &&
        !["lens-red", "lens-cyan", "lens-violet", "lens-green"].includes(
          c.lens as string,
        )) ||
      (c.stickers !== undefined &&
        (!Array.isArray(c.stickers) ||
          c.stickers.length > 3 ||
          !c.stickers.every(validStickerPlacement) ||
          new Set(c.stickers.map((s) => s.slot)).size !== c.stickers.length)) ||
      !Array.isArray(c.unlocked) ||
      c.unlocked.length > 64 ||
      !c.unlocked.every((id) => typeof id === "string")
    )
      return false;
  }
  if (
    !integer(f.width, 1, 10) ||
    !integer(f.height, 1, 10) ||
    !Array.isArray(f.tiles) ||
    f.tiles.length !== (f.width as number) * (f.height as number)
  )
    return false;
  if (
    !Array.isArray(f.robots) ||
    !f.robots.length ||
    f.robots.length > 256 ||
    !Array.isArray(f.buildings) ||
    (!f.buildings.length &&
      (!Array.isArray(f.storedBuildings) || !f.storedBuildings.length)) ||
    f.buildings.length > 16
  )
    return false;
  if (
    !Array.isArray(f.unlocks) ||
    f.unlocks.length > 256 ||
    !f.unlocks.every((v) => typeof v === "string") ||
    !Array.isArray(f.claimed) ||
    !Array.isArray(f.visited)
  )
    return false;
  for (const key of [
    "time",
    "stock",
    "cargo",
    "gold",
    "harvested",
    "deposited",
    "planted",
  ])
    if (typeof f[key] !== "number" || (f[key] as number) < 0) return false;
  if (
    !integer(f.x, -1, 10) ||
    !integer(f.y, -1, 10) ||
    !integer(f.nextId, 1, Number.MAX_SAFE_INTEGER) ||
    !integer(f.wheatLevel, 1, 5) ||
    !record(f.resources) ||
    !record(f.orderPeriods)
  )
    return false;
  const inventory = (v: unknown) =>
    record(v) && Object.values(v).every((n) => typeof n === "number" && n >= 0);
  if (
    (f.harvestedItems !== undefined && !inventory(f.harvestedItems)) ||
    (f.depositedItems !== undefined && !inventory(f.depositedItems)) ||
    !inventory(f.resources) ||
    (f.produced !== undefined && !inventory(f.produced))
  )
    return false;
  const ids = new Set<string>();
  for (const r of f.robots) {
    if (
      !record(r) ||
      typeof r.id !== "string" ||
      !r.id ||
      ids.has(r.id) ||
      !["Farmer", "Transporter", "Drone"].includes(String(r.model)) ||
      !integer(r.x, -1, 10) ||
      !integer(r.y, -1, 10) ||
      !validLevels(r.equipment, robotLimits) ||
      (r.baseCapacity !== undefined && !integer(r.baseCapacity, 1, 100)) ||
      (r.actionFloor !== undefined &&
        (typeof r.actionFloor !== "number" ||
          r.actionFloor <= 0 ||
          r.actionFloor > 1)) ||
      !inventory(r.inventory) ||
      typeof r.code !== "string" ||
      typeof r.destroyed !== "boolean" ||
      (r.deployed !== undefined && typeof r.deployed !== "boolean") ||
      (r.lastError !== undefined && typeof r.lastError !== "string") ||
      typeof r.loan !== "boolean" ||
      typeof r.water !== "number" ||
      r.water < 0 ||
      typeof r.readyAt !== "number" ||
      typeof r.paid !== "number"
    )
      return false;
    ids.add(r.id);
  }
  if (
    typeof f.activeRobotId !== "string" ||
    !f.robots.some((r) => record(r) && r.id === f.activeRobotId && !r.destroyed)
  )
    return false;
  if (
    f.storedBuildings !== undefined &&
    (!Array.isArray(f.storedBuildings) ||
      f.storedBuildings.length + f.buildings.length > 256)
  )
    return false;
  if (f.sites !== undefined) {
    if (!Array.isArray(f.sites) || f.sites.length > 16) return false;
    const cells = new Set<string>();
    for (const p of f.sites) {
      if (
        !record(p) ||
        !integer(p.x, -1, 10) ||
        !integer(p.y, -1, 10) ||
        !(
          p.x === -1 ||
          p.x === 10 ||
          p.y === -1 ||
          p.y === 10 ||
          p.x === 7 ||
          p.y === 7
        )
      )
        return false;
      const key = `${p.x},${p.y}`;
      if (cells.has(key)) return false;
      cells.add(key);
    }
    if (f.buildings.some((b) => !record(b) || !cells.has(`${b.x},${b.y}`)))
      return false;
  }
  const buildingIds = new Set<string>();
  for (const b of [
    ...f.buildings,
    ...(Array.isArray(f.storedBuildings) ? f.storedBuildings : []),
  ]) {
    if (
      !record(b) ||
      !validLevels(b.upgrades, buildingLimits) ||
      [b.capacityFloor, b.productionFloor, b.waterCapacityFloor].some(
        (n) =>
          n !== undefined &&
          (typeof n !== "number" || n < 0 || n > Number.MAX_SAFE_INTEGER),
      ) ||
      typeof b.id !== "string" ||
      buildingIds.has(b.id) ||
      ![
        "Depot",
        "Well",
        "Cistern",
        "Mill",
        "Oven",
        "Sawmill",
        "Composter",
        "Workshop",
      ].includes(String(b.kind)) ||
      !integer(b.x, -1, 10) ||
      !integer(b.y, -1, 10) ||
      !inventory(b.inventory) ||
      !inventory(b.input) ||
      !inventory(b.output) ||
      typeof b.water !== "number" ||
      b.water < 0 ||
      typeof b.paid !== "number"
    )
      return false;
    buildingIds.add(b.id);
  }
  return f.tiles.every(
    (t) =>
      record(t) &&
      (t.planted === null || typeof t.planted === "number") &&
      typeof t.yield === "number" &&
      t.yield >= 0,
  );
}
