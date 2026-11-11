/** Serializable mission predicates. Database content never contains executable JavaScript. */
export type MissionRule =
  | { type: "counter"; path: string }
  | { type: "length"; path: string }
  | { type: "research"; ids: string[] }
  | { type: "sum"; rules: MissionRule[] }
  | { type: "cap"; max: number; rule: MissionRule }
  | {
      type: "count";
      collection: string;
      filters: {
        path: string;
        op: "eq" | "gte";
        value: string | number | boolean;
        fallback?: number | boolean;
      }[];
    };
const valueAt = (state: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((value, key) => {
    if (["__proto__", "prototype", "constructor"].includes(key))
      return undefined;
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)[key]
      : undefined;
  }, state);
export function missionProgress(rule: MissionRule, state: unknown): number {
  switch (rule.type) {
    case "counter": {
      const value = valueAt(state, rule.path);
      return typeof value === "number" && Number.isFinite(value) ? value : 0;
    }
    case "length": {
      const value = valueAt(state, rule.path);
      return Array.isArray(value) ? value.length : 0;
    }
    case "research": {
      const ids = valueAt(state, "unlocks");
      return Array.isArray(ids)
        ? rule.ids.filter((id) => ids.includes(id)).length
        : 0;
    }
    case "sum":
      return rule.rules.reduce(
        (total, next) => total + missionProgress(next, state),
        0,
      );
    case "cap":
      return Math.min(rule.max, missionProgress(rule.rule, state));
    case "count": {
      const entries = valueAt(state, rule.collection);
      return Array.isArray(entries)
        ? entries.filter((entry) =>
            rule.filters.every((filter) => {
              const value = valueAt(entry, filter.path) ?? filter.fallback;
              return filter.op === "eq"
                ? value === filter.value
                : typeof value === "number" &&
                    typeof filter.value === "number" &&
                    value >= filter.value;
            }),
          ).length
        : 0;
    }
  }
}
export function validMissionRule(
  value: unknown,
  depth = 0,
): value is MissionRule {
  if (!value || typeof value !== "object" || depth > 8) return false;
  const r = value as Record<string, unknown>;
  const path = (p: unknown) =>
    typeof p === "string" &&
    /^(harvested|deposited|planted|visited|harvestedItems\.[A-Za-z][A-Za-z0-9_-]*|depositedItems\.[A-Za-z][A-Za-z0-9_-]*|produced\.[A-Za-z][A-Za-z0-9_-]*)$/.test(
      p,
    );
  if (r.type === "counter" || r.type === "length") return path(r.path);
  if (r.type === "research")
    return (
      Array.isArray(r.ids) &&
      r.ids.length <= 256 &&
      r.ids.every((id) => typeof id === "string" && id.length <= 64)
    );
  if (r.type === "sum")
    return (
      Array.isArray(r.rules) &&
      r.rules.length <= 32 &&
      r.rules.every((next) => validMissionRule(next, depth + 1))
    );
  if (r.type === "cap")
    return (
      typeof r.max === "number" &&
      Number.isFinite(r.max) &&
      r.max >= 0 &&
      validMissionRule(r.rule, depth + 1)
    );
  if (r.type === "count")
    return (
      ["robots", "buildings", "storedBuildings"].includes(
        String(r.collection),
      ) &&
      Array.isArray(r.filters) &&
      r.filters.length <= 16 &&
      r.filters.every((f: unknown) => {
        if (!f || typeof f !== "object") return false;
        const v = f as Record<string, unknown>;
        return (
          typeof v.path === "string" &&
          /^(kind|model|destroyed|loan|deployed|equipment\.[A-Za-z]+|upgrades\.[A-Za-z]+)$/.test(
            v.path,
          ) &&
          ["eq", "gte"].includes(String(v.op)) &&
          ["string", "number", "boolean"].includes(typeof v.value) &&
          (v.fallback === undefined ||
            typeof v.fallback === "number" ||
            typeof v.fallback === "boolean")
        );
      })
    );
  return false;
}
