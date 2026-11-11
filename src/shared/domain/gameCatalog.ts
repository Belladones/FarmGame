import bootstrap from "./bootstrap.json" with { type: "json" };
import { validMissionRule, type MissionRule } from "./missionRules.js";
export interface ResourceDefinition {
  id: string;
  name: string;
  salePrice: number;
}
export interface ResearchDefinition {
  id: string;
  name: string;
  category: "Agriculture" | "Programmation" | "Technologie";
  materials: Record<string, number>;
  prerequisites: string[];
  detail: string;
  cost: number;
  goldCost?: number;
  localOnly?: boolean;
}
export interface ResearchGroupDefinition {
  id: string;
  title: string;
  initialLevel: number;
  steps: string[];
}
export interface MissionDefinition {
  id: string;
  chapter: number;
  title: string;
  text: string;
  target: number;
  reward: number;
  gold: number;
  xp: number;
  condition: MissionRule;
  hint: string;
  code?: string;
  destination: "code" | "Recherches" | "Magasin" | "Robots";
  action: string;
}
export interface GameCatalog {
  version: number;
  resources: ResourceDefinition[];
  research: ResearchDefinition[];
  groups: ResearchGroupDefinition[];
  campaigns: Record<"legacy" | "assets" | "modern", MissionDefinition[]>;
  chapters: { title: string; subtitle: string; skill: string }[];
  definitions: typeof bootstrap.definitions;
}
export const defaultCatalog = bootstrap as unknown as GameCatalog;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const amount = (v: unknown) =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= 0 &&
  v <= Number.MAX_SAFE_INTEGER;
const identifier = (v: unknown) =>
  typeof v === "string" &&
  /^[A-Za-z0-9_-]{1,64}$/.test(v) &&
  !["__proto__", "constructor", "prototype"].includes(v);
/** Reject a partial or cyclic catalogue before installing anything. */
function safeData(value: unknown, depth = 0): boolean {
  if (depth > 24) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number")
    return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
  if (typeof value === "string") return value.length <= 100000;
  if (Array.isArray(value))
    return value.length <= 4096 && value.every((v) => safeData(v, depth + 1));
  return (
    object(value) &&
    Object.keys(value).length <= 4096 &&
    Object.entries(value).every(
      ([k, v]) =>
        !["__proto__", "constructor", "prototype"].includes(k) &&
        safeData(v, depth + 1),
    )
  );
}
export function validateCatalog(input: unknown): asserts input is GameCatalog {
  if (!safeData(input)) throw Error("Structure de catalogue invalide.");
  if (
    !object(input) ||
    !Number.isSafeInteger(input.version) ||
    Number(input.version) < 1
  )
    throw Error("Version de catalogue invalide.");
  const c = input as unknown as GameCatalog;
  const distinct = (entries: unknown): entries is { id: string }[] =>
    Array.isArray(entries) &&
    entries.length <= 4096 &&
    entries.every((v) => object(v) && identifier(v.id)) &&
    new Set(entries.map((v) => v.id)).size === entries.length;
  if (
    !distinct(c.resources) ||
    !c.resources.length ||
    c.resources.some(
      (r) => typeof r.name !== "string" || !r.name || !amount(r.salePrice),
    )
  )
    throw Error("Ressources invalides.");
  const resources = new Set(c.resources.map((r) => r.id));
  if (!distinct(c.research) || !c.research.length)
    throw Error("Recherches invalides.");
  const research = new Map(c.research.map((r) => [r.id, r]));
  for (const r of c.research) {
    if (
      typeof r.name !== "string" ||
      typeof r.detail !== "string" ||
      !["Agriculture", "Programmation", "Technologie"].includes(r.category) ||
      !object(r.materials) ||
      Object.entries(r.materials).some(
        ([id, n]) => !resources.has(id) || !amount(n),
      ) ||
      !amount(r.cost) ||
      !amount(r.goldCost ?? 0) ||
      !Array.isArray(r.prerequisites) ||
      r.prerequisites.some((id) => !research.has(id)) ||
      new Set(r.prerequisites).size !== r.prerequisites.length
    )
      throw Error("Recherche incohérente : " + r.id);
  }
  const visited = new Set<string>(),
    active = new Set<string>();
  const visit = (id: string) => {
    if (active.has(id)) throw Error("Cycle dans les recherches : " + id);
    if (visited.has(id)) return;
    active.add(id);
    research.get(id)!.prerequisites.forEach(visit);
    active.delete(id);
    visited.add(id);
  };
  c.research.forEach((r) => visit(r.id));
  if (
    !distinct(c.groups) ||
    c.groups.some(
      (g) =>
        typeof g.title !== "string" ||
        !Number.isSafeInteger(g.initialLevel) ||
        g.initialLevel < 0 ||
        !Array.isArray(g.steps) ||
        g.steps.some((id) => !research.has(id)),
    )
  )
    throw Error("Paliers de recherche invalides.");
  const checkRuleReferences = (rule: MissionRule): void => {
    if (rule.type === "research" && rule.ids.some((id) => !research.has(id)))
      throw Error("Mission liée à une recherche inconnue.");
    if (rule.type === "sum") rule.rules.forEach(checkRuleReferences);
    if (rule.type === "cap") checkRuleReferences(rule.rule);
  };
  const grouped = c.groups.flatMap((g) => g.steps);
  if (new Set(grouped).size !== grouped.length)
    throw Error("Une recherche appartient à plusieurs paliers.");
  if (
    !Array.isArray(c.chapters) ||
    !c.chapters.length ||
    c.chapters.some(
      (v) =>
        !object(v) ||
        ["title", "subtitle", "skill"].some(
          (k) => typeof v[k as keyof typeof v] !== "string",
        ),
    )
  )
    throw Error("Chapitres invalides.");
  if (!object(c.campaigns)) throw Error("Campagnes absentes.");
  for (const name of ["legacy", "assets", "modern"] as const) {
    const entries = c.campaigns[name];
    if (
      !distinct(entries) ||
      !entries.length ||
      entries.some(
        (m) =>
          !validMissionRule(m.condition) ||
          !Number.isInteger(m.chapter) ||
          m.chapter < 0 ||
          m.chapter >= c.chapters.length ||
          !amount(m.target) ||
          m.target === 0 ||
          !amount(m.reward) ||
          !amount(m.gold) ||
          !amount(m.xp) ||
          ["title", "text", "hint", "action"].some(
            (k) => typeof m[k as keyof typeof m] !== "string",
          ) ||
          !["code", "Recherches", "Magasin", "Robots"].includes(
            m.destination,
          ) ||
          (m.code !== undefined && typeof m.code !== "string"),
      )
    )
      throw Error("Missions invalides : " + name);
  }
  for (const entries of Object.values(c.campaigns))
    entries.forEach((m) => checkRuleReferences(m.condition));
  if (!object(c.definitions)) throw Error("Définitions absentes.");
  for (const section of ["models", "buildings", "recipes", "crops"] as const) {
    if (
      !object(c.definitions[section]) ||
      Object.keys(defaultCatalog.definitions[section]).some(
        (id) =>
          !object((c.definitions[section] as Record<string, unknown>)[id]),
      )
    )
      throw Error("Définitions manquantes : " + section);
  }
  for (const section of ["tradeOrders", "cosmetics"] as const) {
    if (!distinct(c.definitions[section]))
      throw Error("Définitions invalides : " + section);
  }
  for (const section of ["robotEquipment", "buildingUpgrades"] as const) {
    const specs = c.definitions[section];
    if (
      !Array.isArray(specs) ||
      specs.some((s) => !object(s) || !identifier(s.id))
    )
      throw Error("Équipements invalides.");
  }
  for (const key of ["storageCapacities", "thresholds"] as const) {
    const values = c.definitions[key];
    if (
      !Array.isArray(values) ||
      !values.length ||
      values.some((n) => !amount(n))
    )
      throw Error("Paliers invalides : " + key);
  }
  if (c.definitions.ranks.length !== c.definitions.thresholds.length)
    throw Error("Rangs incohérents.");
  if (
    !Array.isArray(c.definitions.ranks) ||
    c.definitions.ranks.some((s) => typeof s !== "string") ||
    !Array.isArray(c.definitions.constructionSlots)
  )
    throw Error("Paramètres de progression invalides.");
  // Numeric gameplay parameters are data; validate them before using them in timers or purchases.
  for (const model of Object.values(c.definitions.models))
    if (
      !amount(model.price) ||
      !amount(model.capacity) ||
      !(model.speed > 0) ||
      !Number.isFinite(model.speed) ||
      !["ground", "air"].includes(model.medium)
    )
      throw Error("Modèle de robot invalide.");
  for (const crop of Object.values(c.definitions.crops))
    if (
      !resources.has(crop.resource) ||
      !(crop.seconds > 0) ||
      !Array.isArray(crop.yields) ||
      crop.yields.some((n) => !amount(n)) ||
      Object.entries(crop.cost).some(
        ([id, n]) => !resources.has(id) || !amount(n),
      )
    )
      throw Error("Culture invalide.");
  for (const spec of [
    ...c.definitions.robotEquipment,
    ...c.definitions.buildingUpgrades,
  ])
    if (
      !Number.isSafeInteger(spec.initial) ||
      spec.initial < 0 ||
      !Number.isSafeInteger(spec.max) ||
      spec.max > 30 ||
      spec.max < spec.initial ||
      !amount("gold" in spec ? spec.gold : 0) ||
      Object.entries(spec.materials).some(
        ([id, n]) => !resources.has(id) || !amount(n),
      )
    )
      throw Error("Équipement invalide.");
  const inventory = (v: unknown) =>
    object(v) &&
    Object.entries(v).every(([id, n]) => resources.has(id) && amount(n));
  for (const b of Object.values(c.definitions.buildings))
    if (
      !amount(b.price) ||
      typeof b.name !== "string" ||
      !research.has(b.research)
    )
      throw Error("Bâtiment invalide.");
  for (const recipe of Object.values(c.definitions.recipes))
    if (
      !inventory(recipe.input) ||
      !inventory(recipe.output) ||
      !(recipe.duration > 0) ||
      !Number.isFinite(recipe.duration)
    )
      throw Error("Recette invalide.");
  for (const order of c.definitions.tradeOrders)
    if (
      !resources.has(order.item) ||
      !amount(order.payment) ||
      !(order.quantity > 0) ||
      !Number.isFinite(order.quantity)
    )
      throw Error("Commande commerciale invalide.");
  for (const skin of c.definitions.cosmetics)
    if (
      !["skin", "lens", "accessory"].includes(skin.kind) ||
      !amount(skin.missions) ||
      typeof skin.name !== "string" ||
      ("color" in skin &&
        skin.color !== undefined &&
        !/^#[0-9a-f]{6}$/i.test(skin.color)) ||
      ("accent" in skin &&
        skin.accent !== undefined &&
        !/^#[0-9a-f]{6}$/i.test(skin.accent))
    )
      throw Error("Cosmétique invalide.");
}
