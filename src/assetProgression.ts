import type { Inventory, Model, BuildingKind } from "./catalog";
export interface UpgradeSpec {
  id: string;
  name: string;
  initial: number;
  max: number;
  materials: Inventory;
  gold?: number;
  research?: string;
  models?: readonly Model[];
  kinds?: readonly BuildingKind[];
  detail: string;
}
export type UpgradeLevels = Record<string, number>;
export const robotEquipment: UpgradeSpec[] = [
  {
    id: "hold",
    name: "Soute",
    initial: 1,
    max: 5,
    materials: { Wood: 100, Hay: 50 },
    research: "hold",
    models: ["Farmer", "Transporter", "Drone"],
    detail: "Capacité ×2 par niveau. Chaque robot possède sa propre soute.",
  },
  {
    id: "motor",
    name: "Motorisation",
    initial: 1,
    max: 5,
    materials: { Wood: 150, Carrot: 50 },
    research: "motor",
    models: ["Farmer", "Transporter", "Drone"],
    detail: "Vitesse de déplacement ×1,25 par niveau.",
  },
  {
    id: "tools",
    name: "Outils agricoles",
    initial: 1,
    max: 5,
    materials: { Wood: 100, Carrot: 100 },
    research: "tools",
    models: ["Farmer"],
    detail: "Vitesse du semis, de la récolte et du labour ×1,25 par niveau.",
  },
  {
    id: "handling",
    name: "Manutention",
    initial: 1,
    max: 5,
    materials: { Wood: 200, Carrot: 50 },
    research: "handling",
    models: ["Farmer", "Transporter", "Drone"],
    detail:
      "Vitesse des chargements, dépôts, livraisons et collectes ×2 par niveau.",
  },
  {
    id: "tank",
    name: "Réservoir",
    initial: 1,
    max: 5,
    materials: { Wood: 100, Carrot: 50 },
    research: "tank",
    models: ["Farmer", "Drone"],
    detail: "Capacité du réservoir embarqué ×2 par niveau.",
  },
  {
    id: "application",
    name: "Application d’eau",
    initial: 1,
    max: 5,
    materials: { Wood: 100, Carrot: 100 },
    research: "watering",
    models: ["Farmer", "Drone"],
    detail: "Consommation d’eau ×0,8 par niveau pour la même humidité.",
  },
  {
    id: "sensor",
    name: "Capteur de maturité",
    initial: 0,
    max: 1,
    materials: { Hay: 50, Wood: 10 },
    research: "sensor",
    models: ["Farmer", "Drone"],
    detail: "Autorise can_harvest() sur ce robot.",
  },
  {
    id: "analysis",
    name: "Analyse du terrain",
    initial: 0,
    max: 1,
    materials: { Wood: 100, Carrot: 50 },
    research: "analysis",
    models: ["Farmer", "Drone"],
    detail: "Autorise get_entity_type() et get_ground_type() sur ce robot.",
  },
  {
    id: "humidity",
    name: "Capteur d’humidité",
    initial: 0,
    max: 1,
    materials: { Carrot: 15 },
    research: "humidity",
    models: ["Farmer", "Drone"],
    detail: "Autorise get_water() sur ce robot.",
  },
  {
    id: "traffic",
    name: "Détection d’obstacles",
    initial: 0,
    max: 1,
    materials: { Wood: 60, Carrot: 20 },
    research: "traffic",
    models: ["Farmer", "Transporter", "Drone"],
    detail: "Autorise is_occupied() et les réservations après Circulation 2.",
  },
];
export const buildingUpgrades: UpgradeSpec[] = [
  {
    id: "storage",
    research: "construction",
    name: "Stockage",
    initial: 1,
    max: 10,
    materials: {},
    gold: 500,
    kinds: ["Depot"],
    detail:
      "Capacité initiale 200 unités ; capacité ×4 par niveau, coût en or ×4.",
  },
  {
    id: "workshop",
    name: "Niveau de l’atelier",
    initial: 1,
    max: 3,
    materials: { Wood: 200, Carrot: 100 },
    kinds: ["Workshop"],
    detail: "Autorise les équipements de niveaux 1–2, puis 3–4, puis 5.",
  },
  {
    id: "waterRate",
    name: "Débit du puits",
    initial: 1,
    max: 5,
    materials: { Wood: 100, Carrot: 50 },
    kinds: ["Well"],
    detail: "Production initiale 1 eau/s ; débit ×2 par niveau.",
  },
  {
    id: "waterStorage",
    name: "Réserve d’eau",
    initial: 1,
    max: 5,
    materials: { Wood: 150 },
    kinds: ["Cistern"],
    detail:
      "Réserve initiale 400 unités ; capacité ×4 par niveau. Ne produit pas d’eau.",
  },
  {
    id: "production",
    name: "Débit de production",
    initial: 1,
    max: 5,
    materials: { Wood: 200, Carrot: 100 },
    kinds: ["Mill"],
    detail:
      "Débit ×2 par niveau ; recettes et quantités d’ingrédients inchangées.",
  },
  {
    id: "production",
    name: "Débit de production",
    initial: 1,
    max: 5,
    materials: { Wood: 300, Plank: 100 },
    kinds: ["Oven"],
    detail:
      "Débit ×2 par niveau ; recettes et quantités d’ingrédients inchangées.",
  },
  {
    id: "production",
    name: "Débit de production",
    initial: 1,
    max: 5,
    materials: { Wood: 250, Carrot: 100 },
    kinds: ["Sawmill"],
    detail:
      "Débit ×2 par niveau ; recettes et quantités d’ingrédients inchangées.",
  },
  {
    id: "production",
    name: "Débit de production",
    initial: 1,
    max: 5,
    materials: { Wood: 200, Carrot: 150 },
    kinds: ["Composter"],
    detail:
      "Débit ×2 par niveau ; recettes et quantités d’ingrédients inchangées.",
  },
];
export const upgradeCost = (spec: UpgradeSpec, current: number) => {
  const factor = 4 ** Math.max(0, current - spec.initial);
  return {
    materials: Object.fromEntries(
      Object.entries(spec.materials).map(([id, n]) => [id, n! * factor]),
    ) as Inventory,
    gold: (spec.gold ?? 0) * factor,
  };
};
export const upgradeLevel = (
  levels: UpgradeLevels | undefined,
  spec: UpgradeSpec,
) => levels?.[spec.id] ?? spec.initial;
export const retiredResearch = (id: string) =>
  /^(storage(?:[2-9]|10)|hold[23]|motor[23]|tools[23]|milling[2-5]|bakery[2-5]|reservoir[2-5]|mechanization2?|maintenance)$/.test(
    id,
  );
