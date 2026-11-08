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
export function validFarm(value: unknown): value is RecordValue {
  if (!record(value) || !safeTree(value)) return false;
  const f = value;
  if (
    !integer(f.width, 1, 7) ||
    !integer(f.height, 1, 7) ||
    !Array.isArray(f.tiles) ||
    f.tiles.length !== (f.width as number) * (f.height as number)
  )
    return false;
  if (
    !Array.isArray(f.robots) ||
    !f.robots.length ||
    f.robots.length > 256 ||
    !Array.isArray(f.buildings) ||
    !f.buildings.length ||
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
    !integer(f.x, -1, 7) ||
    !integer(f.y, -1, 7) ||
    !integer(f.nextId, 1, Number.MAX_SAFE_INTEGER) ||
    !integer(f.wheatLevel, 1, 5) ||
    !record(f.resources) ||
    !record(f.orderPeriods)
  )
    return false;
  const inventory = (v: unknown) =>
    record(v) && Object.values(v).every((n) => typeof n === "number" && n >= 0);
  if (!inventory(f.resources)) return false;
  const ids = new Set<string>();
  for (const r of f.robots) {
    if (
      !record(r) ||
      typeof r.id !== "string" ||
      !r.id ||
      ids.has(r.id) ||
      !["Farmer", "Transporter", "Drone"].includes(String(r.model)) ||
      !integer(r.x, -1, 7) ||
      !integer(r.y, -1, 7) ||
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
  const buildingIds = new Set<string>();
  for (const b of f.buildings) {
    if (
      !record(b) ||
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
      !integer(b.x, -1, 7) ||
      !integer(b.y, -1, 7) ||
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
