import { retiredResearch } from "./assetProgression";
import { balanceResearch, storageCapacities } from "./researchBalance";
/** Values from docs/CONCEPTION.md, sections 1, 3, 6, 7 and 10. */
export const itemNames = {
  Hay: "Foin",
  Wheat: "Blé",
  Wood: "Bois",
  Carrot: "Carotte",
  Pumpkin: "Citrouille",
  Flour: "Farine",
  Bread: "Pain",
  Plank: "Planche",
  Fertilizer: "Engrais",
} as const;
export type Item = keyof typeof itemNames;
export type Inventory = Partial<Record<Item, number>>;
export const salePrices: Record<Item, number> = {
  Hay: 1,
  Wheat: 1,
  Wood: 3,
  Carrot: 5,
  Pumpkin: 12,
  Flour: 8,
  Bread: 25,
  Plank: 12,
  Fertilizer: 18,
};
export type Model = "Farmer" | "Transporter" | "Drone";
export const models = {
  Farmer: {
    name: "Fermier",
    price: 500,
    speed: 1,
    capacity: 20,
    research: "fleet",
    medium: "ground",
    description:
      "Robot terrestre sur roues. Plante, récolte, laboure, transporte, arrose et utilise des consommables selon vos recherches.",
  },
  Transporter: {
    name: "Transporteur",
    price: 500,
    speed: 0.75,
    capacity: 100,
    research: "transporter",
    medium: "ground",
    description:
      "Robot terrestre à grande soute. Charge, transporte et dépose. Ne plante pas, ne récolte pas et ne laboure pas.",
  },
  Drone: {
    name: "Drone",
    price: 1000,
    speed: 2,
    capacity: 10,
    research: "drone",
    medium: "air",
    description:
      "Unité aérienne. Transport léger, arrosage et engrais. Ne plante pas, ne laboure pas et ne récolte pas. Peut survoler les robots terrestres.",
  },
} as const;
export type BuildingKind =
  | "Depot"
  | "Well"
  | "Cistern"
  | "Mill"
  | "Oven"
  | "Sawmill"
  | "Composter"
  | "Workshop";
export const buildings = {
  Depot: {
    name: "Dépôt",
    price: 500,
    research: "construction",
    description:
      "Stocke 200 unités ; améliorations individuelles jusqu’au niveau 10, capacité et prix ×4.",
  },
  Well: {
    name: "Puits",
    price: 300,
    research: "reservoir",
    description:
      "Produit 1 eau/s. Chaque amélioration locale double le débit ; réserve de 100 unités.",
  },
  Cistern: {
    name: "Citerne",
    price: 200,
    research: "reservoir",
    description:
      "Ajoute 400 unités au réseau d’eau connecté ; chaque amélioration locale multiplie cette réserve par 4. Ne produit pas d’eau.",
  },
  Mill: {
    name: "Moulin",
    price: 500,
    research: "milling",
    description:
      "5 blés → 1 farine en 6 secondes. Livrez les ingrédients puis récupérez la production.",
  },
  Oven: {
    name: "Four",
    price: 1000,
    research: "bakery",
    description: "2 farines + 1 bois → 1 pain en 10 secondes.",
  },
  Sawmill: {
    name: "Scierie",
    price: 750,
    research: "sawmill",
    description: "5 bois → 2 planches en 10 secondes.",
  },
  Composter: {
    name: "Composteur",
    price: 750,
    research: "composting",
    description: "5 blés + 2 carottes → 1 engrais en 12 secondes.",
  },
  Workshop: {
    name: "Atelier",
    price: 500,
    research: "workshop",
    description:
      "Reconstruit une carcasse pour 40 % du prix neuf : fermier 200 or, transporteur 200 or, drone 400 or.",
  },
} as const;
export const recipes: Partial<
  Record<
    BuildingKind,
    { input: Inventory; output: Inventory; duration: number }
  >
> = {
  Mill: { input: { Wheat: 5 }, output: { Flour: 1 }, duration: 6 },
  Oven: { input: { Flour: 2, Wood: 1 }, output: { Bread: 1 }, duration: 10 },
  Sawmill: { input: { Wood: 5 }, output: { Plank: 2 }, duration: 10 },
  Composter: {
    input: { Wheat: 5, Carrot: 2 },
    output: { Fertilizer: 1 },
    duration: 12,
  },
};
export interface Research {
  goldCost?: number;
  localOnly?: boolean;
  id: string;
  name: string;
  cost: number;
  materials: Inventory;
  prerequisites: string[];
  category: "Agriculture" | "Programmation" | "Technologie";
  detail: string;
}
const r = (
  id: string,
  name: string,
  materials: Inventory,
  prerequisites: string[],
  category: Research["category"],
  detail: string,
): Research => ({
  id,
  name,
  cost: materials.Wheat ?? 0,
  materials,
  prerequisites,
  category,
  detail,
});
const A = "Agriculture",
  T = "Technologie",
  P = "Programmation";
/** The workbook overlay in researchBalance.ts is the current source of costs and tiers. */
export const research: Research[] = balanceResearch([
  r(
    "loops",
    "Boucle while",
    { Hay: 5 },
    [],
    P,
    "Répétez une séquence avec while (true). Les programmes restent isolés : Arrêter termine une boucle infinie.",
  ),
  r(
    "wheat-base",
    "Culture du blé",
    { Hay: 10 },
    ["loops"],
    A,
    "Débloque plant(Entities.Wheat). Le blé pousse en 5 secondes et produit 1 blé. L’herbe reste disponible gratuitement.",
  ),
  r(
    "wheat",
    "Blé · niveau 2",
    { Wheat: 20 },
    [],
    A,
    "Les nouvelles plantations produisent 5 blés.",
  ),
  r(
    "wheat3",
    "Blé · niveau 3",
    { Wheat: 250, Wood: 100 },
    ["wheat"],
    A,
    "Rendement final : 12 blés.",
  ),
  r(
    "wheat4",
    "Blé · niveau 4",
    { Wheat: 2000, Wood: 600, Carrot: 200 },
    ["wheat3"],
    A,
    "Rendement final : 30 blés.",
  ),
  r(
    "wheat5",
    "Blé · niveau 5",
    { Wheat: 15000, Wood: 5000, Carrot: 2000 },
    ["wheat4"],
    A,
    "Rendement final : 75 blés.",
  ),
  r(
    "bush",
    "Buisson",
    { Wheat: 40 },
    ["wheat"],
    A,
    "Plantation gratuite sur prairie. Pousse : 8 s. Rendement : 1 bois.",
  ),
  r(
    "bush2",
    "Buisson · niveau 2",
    { Wheat: 100, Wood: 30 },
    ["bush"],
    A,
    "Rendement final : 3 bois.",
  ),
  r(
    "bush3",
    "Buisson · niveau 3",
    { Wheat: 600, Wood: 200 },
    ["bush2"],
    A,
    "Rendement final : 8 bois.",
  ),
  r(
    "carrot",
    "Carotte",
    { Wheat: 60, Wood: 30 },
    ["bush", "till"],
    A,
    "Terre labourée. Plantation : 2 blés + 1 bois dans la soute. Pousse : 10 s. Rendement : 2 carottes.",
  ),
  r(
    "carrot2",
    "Carotte · niveau 2",
    { Wheat: 200, Wood: 100, Carrot: 40 },
    ["carrot"],
    A,
    "Rendement final : 6 carottes.",
  ),
  r(
    "carrot3",
    "Carotte · niveau 3",
    { Wheat: 1200, Wood: 400, Carrot: 250 },
    ["carrot2"],
    A,
    "Rendement final : 15 carottes.",
  ),
  r(
    "carrot4",
    "Carotte · niveau 4",
    { Wheat: 6000, Wood: 2000, Carrot: 1000 },
    ["carrot3"],
    A,
    "Rendement final : 40 carottes.",
  ),
  r(
    "tree",
    "Arbre",
    { Wheat: 80, Wood: 40 },
    ["bush"],
    A,
    "Prairie. Plantation : 1 bois dans la soute. 20 s et 5 bois ; +50 % de durée par arbre voisin orthogonal.",
  ),
  r(
    "tree2",
    "Arbre · niveau 2",
    { Wheat: 300, Wood: 100, Carrot: 50 },
    ["tree"],
    A,
    "Rendement final : 15 bois.",
  ),
  r(
    "tree3",
    "Arbre · niveau 3",
    { Wheat: 2000, Wood: 600, Carrot: 300 },
    ["tree2"],
    A,
    "Rendement final : 40 bois.",
  ),
  r(
    "tree4",
    "Arbre · niveau 4",
    { Wheat: 10000, Wood: 3000, Carrot: 1500 },
    ["tree3"],
    A,
    "Rendement final : 100 bois.",
  ),
  r(
    "pumpkin",
    "Citrouille",
    { Wheat: 1000, Wood: 500, Carrot: 300 },
    ["carrot2"],
    A,
    "Terre labourée. Plantation : 3 carottes + 2 bois. Pousse : 25 s. Rendement : 4 citrouilles.",
  ),
  r(
    "pumpkin2",
    "Citrouille · niveau 2",
    { Wheat: 3000, Wood: 1000, Carrot: 600, Pumpkin: 100 },
    ["pumpkin"],
    A,
    "Rendement final : 12 citrouilles.",
  ),
  r(
    "pumpkin3",
    "Citrouille · niveau 3",
    { Wheat: 12000, Wood: 4000, Carrot: 2000, Pumpkin: 600 },
    ["pumpkin2"],
    A,
    "Rendement final : 30 citrouilles.",
  ),
  r(
    "extension",
    "Trois parcelles",
    { Hay: 20 },
    ["loops"],
    A,
    "Étend la zone agricole à 3 × 1, sans changer les coordonnées existantes.",
  ),
  r(
    "extension3",
    "Neuf parcelles",
    { Wheat: 150, Wood: 50 },
    ["extension"],
    A,
    "Étend la zone agricole à 3 × 3.",
  ),
  r(
    "extension4",
    "Terrain · 4 × 4",
    { Wheat: 1000, Wood: 400, Carrot: 100 },
    ["extension3"],
    A,
    "16 parcelles agricoles.",
  ),
  r(
    "extension5",
    "Terrain · 5 × 5",
    { Wheat: 5000, Wood: 2000, Carrot: 500 },
    ["extension4"],
    A,
    "25 parcelles agricoles.",
  ),
  r(
    "extension6",
    "Terrain · 6 × 6",
    { Wheat: 15000, Wood: 6000, Carrot: 2000 },
    ["extension5"],
    A,
    "36 parcelles agricoles.",
  ),
  r(
    "extension7",
    "Terrain · 7 × 7",
    { Wheat: 40000, Wood: 15000, Carrot: 6000, Pumpkin: 500 },
    ["extension6"],
    A,
    "49 parcelles agricoles.",
  ),
  r(
    "watering",
    "Arrosage",
    { Wheat: 150, Wood: 60 },
    ["tank"],
    A,
    "watering() : 1 eau ajoute 0,25 d’humidité. Vitesse de pousse jusqu’à ×1,25.",
  ),
  r(
    "watering2",
    "Arrosage · niveau 2",
    { Wheat: 800, Wood: 300, Carrot: 150 },
    ["watering"],
    A,
    "Vitesse de pousse jusqu’à ×1,5.",
  ),
  r(
    "watering3",
    "Arrosage · niveau 3",
    { Wheat: 4000, Wood: 1200, Carrot: 600 },
    ["watering2"],
    A,
    "Vitesse de pousse jusqu’à ×2.",
  ),
  r(
    "fertilizer",
    "Engrais",
    { Wood: 100, Carrot: 50 },
    ["consumables"],
    A,
    "Un engrais transporté ajoute 20 points de croissance.",
  ),
  r(
    "fertilizer2",
    "Engrais · niveau 2",
    { Wood: 500, Carrot: 250 },
    ["fertilizer"],
    A,
    "Ajoute 35 points de croissance.",
  ),
  r(
    "fertilizer3",
    "Engrais · niveau 3",
    { Wood: 2000, Carrot: 1000, Pumpkin: 200 },
    ["fertilizer2"],
    A,
    "Ajoute 50 points de croissance.",
  ),
  r(
    "group",
    "Récolte groupée",
    { Carrot: 500, Pumpkin: 100 },
    ["pumpkin"],
    A,
    "harvest_group() : +50 % sur un carré de 2 × 2 citrouilles mûres du même niveau.",
  ),
  r(
    "group2",
    "Récolte groupée · niveau 2",
    { Carrot: 2000, Pumpkin: 500 },
    ["group"],
    A,
    "Bonus de récolte groupée : +100 %.",
  ),
  r(
    "conditions",
    "Conditions",
    { Wheat: 10 },
    ["loops"],
    P,
    "Débloque if et else.",
  ),
  r("print", "Journal", { Wheat: 5 }, [], P, "Débloque print()."),
  r(
    "variables",
    "Variables et types",
    { Wheat: 25 },
    [],
    P,
    "Recherche de progression : variables, types et calculs. La syntaxe reste libre dans cette version pour conserver les programmes existants.",
  ),
  r(
    "functions",
    "Fonctions",
    { Wheat: 150, Wood: 50 },
    ["variables", "conditions"],
    P,
    "Recherche de progression pour les fonctions et le commerce automatisé. Les fonctions nommées restent utilisables pour expérimenter.",
  ),
  r(
    "sensor",
    "Capteur de maturité",
    { Hay: 5 },
    ["loops"],
    T,
    "Débloque can_harvest().",
  ),
  r(
    "position",
    "Positionnement",
    { Wheat: 20 },
    ["extension"],
    T,
    "get_pos_x(), get_pos_y() et get_world_size().",
  ),
  r(
    "analysis",
    "Analyse de la parcelle",
    { Wheat: 40, Wood: 15 },
    ["sensor"],
    T,
    "get_entity_type() et get_ground_type().",
  ),
  r(
    "humidity",
    "Capteur d’humidité",
    { Wheat: 100, Wood: 40 },
    ["analysis"],
    T,
    "Débloque get_water().",
  ),
  r(
    "till",
    "Labourage",
    {},
    [],
    T,
    "Disponible dès le départ : till() alterne prairie et terre labourée. L’herbe repousse uniquement sur prairie.",
  ),
  r(
    "construction",
    "Construction",
    { Wheat: 80, Wood: 40 },
    ["bush"],
    T,
    "Débloque les dépôts au magasin et les transferts vers les bâtiments.",
  ),
  r(
    "tank",
    "Réservoir embarqué",
    { Wheat: 150, Wood: 100 },
    ["construction"],
    T,
    "10 unités d’eau séparées de la soute. Débloque refill_water().",
  ),
  r(
    "reservoir",
    "Réservoir fixe",
    { Wheat: 150, Wood: 100 },
    ["construction"],
    T,
    "Débloque puits et citernes au magasin.",
  ),
  r(
    "reservoir2",
    "Réservoir fixe · niveau 2",
    { Wood: 500, Carrot: 200 },
    ["reservoir"],
    T,
    "Triple les capacités des puits et citernes, sans augmenter leur débit.",
  ),
  r(
    "consumables",
    "Consommables",
    { Wheat: 300, Wood: 100, Carrot: 50 },
    ["analysis"],
    T,
    "Débloque l’achat d’engrais et use_item().",
  ),
  r(
    "traffic",
    "Circulation",
    { Wheat: 60, Wood: 20 },
    ["sensor"],
    T,
    "is_occupied(direction) détecte les robots incompatibles.",
  ),
  r(
    "traffic2",
    "Circulation · niveau 2",
    { Wheat: 500, Wood: 200, Carrot: 100 },
    ["traffic", "functions"],
    T,
    "reserve(direction), release() : réservation atomique d’une case pendant 5 secondes au maximum.",
  ),
  r(
    "fleet",
    "Flotte",
    { Wheat: 100, Wood: 50 },
    ["traffic"],
    T,
    "Autorise les fermiers supplémentaires à 250 or pièce.",
  ),
  r(
    "transporter",
    "Transporteur",
    { Wheat: 400, Wood: 200, Carrot: 100 },
    ["fleet", "storage2"],
    T,
    "Débloque le transporteur au magasin, à 600 or.",
  ),
  r(
    "drone",
    "Drone",
    { Wheat: 1500, Wood: 800, Carrot: 400 },
    ["fleet", "tank"],
    T,
    "Débloque le drone au magasin, à 1 000 or. Pas de récolte ni de labourage.",
  ),
  r(
    "storage2",
    "Stockage · niveau 2",
    { Wheat: 30, Wood: 50 },
    ["construction"],
    T,
    "500 unités par dépôt.",
  ),
  r(
    "storage3",
    "Stockage · niveau 3",
    { Wood: 200, Carrot: 100 },
    ["storage2"],
    T,
    "2 500 unités par dépôt.",
  ),
  r(
    "storage4",
    "Stockage · niveau 4",
    { Wood: 800, Carrot: 400 },
    ["storage3"],
    T,
    "10 000 unités par dépôt.",
  ),
  r(
    "land",
    "Terrain constructible · niveau 1",
    { Wheat: 50, Wood: 30 },
    ["construction"],
    T,
    "Deux emplacements au total, dont le dépôt initial.",
  ),
  r(
    "land2",
    "Terrain constructible · niveau 2",
    { Wheat: 250, Wood: 100 },
    ["land"],
    T,
    "Quatre emplacements au total.",
  ),
  r(
    "land3",
    "Terrain constructible · niveau 3",
    { Wheat: 1500, Wood: 600, Carrot: 200 },
    ["land2"],
    T,
    "Huit emplacements au total.",
  ),
  r(
    "land4",
    "Terrain constructible · niveau 4",
    { Wheat: 6000, Wood: 2000, Carrot: 800 },
    ["land3"],
    T,
    "Seize emplacements au total.",
  ),
  r(
    "motor",
    "Motorisation",
    { Wheat: 100, Wood: 40 },
    ["extension"],
    T,
    "Vitesse de déplacement ×1,25.",
  ),
  r(
    "motor2",
    "Motorisation · niveau 2",
    { Wheat: 500, Wood: 200, Carrot: 100 },
    ["motor"],
    T,
    "Vitesse de déplacement ×1,5.",
  ),
  r(
    "motor3",
    "Motorisation · niveau 3",
    { Wheat: 2500, Wood: 1000, Carrot: 500 },
    ["motor2"],
    T,
    "Vitesse de déplacement ×2.",
  ),
  r(
    "hold",
    "Soute",
    { Wheat: 80, Wood: 50 },
    ["bush"],
    T,
    "Capacité de toutes les soutes ×2.",
  ),
  r(
    "hold2",
    "Soute · niveau 2",
    { Wheat: 400, Wood: 200, Carrot: 100 },
    ["hold"],
    T,
    "Capacité des soutes ×4 par rapport à la base.",
  ),
  r(
    "hold3",
    "Soute · niveau 3",
    { Wheat: 2000, Wood: 800, Carrot: 400 },
    ["hold2"],
    T,
    "Capacité des soutes ×8 par rapport à la base.",
  ),
  r(
    "tools",
    "Outils agricoles",
    { Wheat: 150, Wood: 80 },
    ["bush"],
    T,
    "Durée des actions agricoles ×0,8.",
  ),
  r(
    "tools2",
    "Outils agricoles · niveau 2",
    { Wheat: 800, Wood: 300, Carrot: 200 },
    ["tools"],
    T,
    "Durée des actions agricoles ×0,6.",
  ),
  r(
    "tools3",
    "Outils agricoles · niveau 3",
    { Wheat: 4000, Wood: 1500, Carrot: 800 },
    ["tools2"],
    T,
    "Durée des actions agricoles ×0,4.",
  ),
  r(
    "milling",
    "Meunerie",
    { Wheat: 150, Wood: 100 },
    ["construction"],
    T,
    "Débloque le moulin au magasin (300 or).",
  ),
  r(
    "bakery",
    "Boulangerie",
    { Wheat: 300, Wood: 200, Carrot: 100 },
    ["milling"],
    T,
    "Débloque le four au magasin (450 or).",
  ),
  r(
    "sawmill",
    "Scierie",
    { Wheat: 200, Wood: 150 },
    ["construction", "tree"],
    T,
    "Débloque la scierie au magasin (350 or).",
  ),
  r(
    "composting",
    "Compostage",
    { Wheat: 200, Wood: 100, Carrot: 50 },
    ["construction", "consumables"],
    T,
    "Débloque le composteur au magasin (400 or).",
  ),
  r(
    "commerce",
    "Commerce automatisé",
    { Wheat: 200, Wood: 100, Carrot: 50 },
    ["construction", "functions"],
    T,
    "sell(item, quantity) : vente par programme depuis les dépôts au tarif normal.",
  ),
  r(
    "maintenance",
    "Maintenance",
    { Wheat: 400, Wood: 250, Carrot: 100 },
    ["construction", "fleet"],
    T,
    "Débloque l’atelier de réparation au magasin (800 or).",
  ),
  r(
    "mechanization",
    "Mécanisation · niveau 1",
    { Wood: 300, Carrot: 150 },
    ["milling"],
    T,
    "Durée des cycles des machines ×0,75.",
  ),
  r(
    "mechanization2",
    "Mécanisation · niveau 2",
    { Wood: 1500, Carrot: 600, Pumpkin: 100 },
    ["mechanization"],
    T,
    "Durée des cycles des machines ×0,5.",
  ),
]).map((entry): Research => {
  const prerequisites = new Set(
    entry.prerequisites.filter((id) => !retiredResearch(id)),
  );
  const providers: Partial<Record<Item, string>> = {
    Wheat: "wheat-base",
    Wood: "bush",
    Carrot: "carrot",
    Pumpkin: "pumpkin",
    Flour: "milling",
    Bread: "bakery",
    Plank: "sawmill",
    Fertilizer: "consumables",
  };
  for (const [item, n] of Object.entries(entry.materials)) {
    const provider = providers[item as Item];
    if (n && provider && provider !== entry.id) prerequisites.add(provider);
  }
  if (
    ["milling", "sawmill", "composting", "maintenance", "reservoir"].includes(
      entry.id,
    )
  )
    prerequisites.add("land");
  if (entry.id === "bakery") prerequisites.add("land2");
  if (entry.id === "fleet") prerequisites.add("extension");
  const total = Object.values(entry.materials).reduce(
    (n, value) => n + (value ?? 0),
    0,
  );
  // Every resource cost must fit a reachable depot tier; gold is sold incrementally.
  let tier = storageCapacities.findIndex((capacity) => capacity >= total);
  if (tier < 0) {
    tier = storageCapacities.length - 1;
    const depots = Math.ceil(total / storageCapacities[tier]);
    const land =
      depots <= 2
        ? "land"
        : depots <= 4
          ? "land2"
          : depots <= 8
            ? "land3"
            : "land4";
    if (depots > 16) throw new Error(`Coût hors capacité : ${entry.id}`);
    prerequisites.add(land);
  }
  if (tier > 0 && entry.id !== "construction")
    prerequisites.add("construction");
  return {
    ...entry,
    localOnly: retiredResearch(entry.id),
    category: entry.id === "commerce" ? "Programmation" : entry.category,
    prerequisites: [...prerequisites],
  };
});
export const formatResearchCost = (r: Research) =>
  [
    Object.keys(r.materials).length ? formatCost(r.materials) : "",
    r.goldCost ? `${r.goldCost.toLocaleString("fr-FR")} or` : "",
  ]
    .filter(Boolean)
    .join(" + ") || "Gratuit";
export const formatCost = (cost: Inventory) =>
  Object.entries(cost)
    .map(
      ([k, v]) =>
        `${v >= 1000000 ? new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(v) : v.toLocaleString("fr-FR")} ${itemNames[k as Item].toLowerCase()}${["Wood", "Fertilizer"].includes(k) ? "" : "s"}`,
    )
    .join(" + ") || "Gratuit";
export const sum = (inventory: Inventory) =>
  Object.values(inventory).reduce((a, b) => a + (b ?? 0), 0);
export const items = Object.keys(itemNames) as Item[];
export const constructionSlots = [
  [-1, 0],
  [0, -1],
  [1, -1],
  [2, -1],
  [-1, 1],
  [-1, 2],
  [3, -1],
  [4, -1],
  [-1, 3],
  [-1, 4],
  [5, -1],
  [6, -1],
  [-1, 5],
  [-1, 6],
  [7, -1],
  [-1, 7],
].map(([x, y]) => ({ x, y }));
export const cropData = {
  Grass: {
    resource: "Hay",
    seconds: 0.5,
    soil: "Any",
    cost: {},
    unlock: null,
    yields: Array.from({ length: 10 }, (_, i) => 2 ** i),
  },
  Wheat: {
    resource: "Wheat",
    seconds: 5,
    soil: "Any",
    cost: {},
    unlock: "wheat-base",
    yields: [1, 5, 12, 30, 75],
  },
  Bush: {
    resource: "Wood",
    seconds: 4,
    soil: "Any",
    cost: {},
    unlock: "bush",
    yields: Array.from({ length: 10 }, (_, i) => 2 ** i),
  },
  Carrot: {
    resource: "Carrot",
    seconds: 6,
    soil: "Soil",
    cost: { Hay: 1, Wood: 1 },
    unlock: "carrot",
    yields: Array.from({ length: 10 }, (_, i) => 2 ** i),
  },
  Tree: {
    resource: "Wood",
    seconds: 7,
    soil: "Any",
    cost: {},
    unlock: "tree",
    yields: Array.from({ length: 10 }, (_, i) => 5 * 2 ** i),
  },
  Pumpkin: {
    resource: "Pumpkin",
    seconds: 25,
    soil: "Soil",
    cost: { Carrot: 3, Wood: 2 },
    unlock: "pumpkin",
    yields: Array.from({ length: 10 }, (_, i) => 4 * 2 ** i),
  },
} satisfies Record<
  string,
  {
    resource: Item;
    seconds: number;
    soil: string;
    cost: Inventory;
    unlock: string | null;
    yields: number[];
  }
>;
export const tradeOrders = [
  {
    id: "village",
    name: "Le marché du village",
    item: "Wheat",
    quantity: 100,
    payment: 110,
    unlock: null,
  },
  {
    id: "carpenter",
    name: "Le charpentier",
    item: "Wood",
    quantity: 30,
    payment: 100,
    unlock: "bush",
  },
  {
    id: "soup",
    name: "La soupe du jour",
    item: "Carrot",
    quantity: 20,
    payment: 135,
    unlock: "carrot",
  },
  {
    id: "bakery",
    name: "La boulangerie du village",
    item: "Bread",
    quantity: 10,
    payment: 275,
    unlock: "bakery",
  },
  {
    id: "renovation",
    name: "La rénovation de la grange",
    item: "Plank",
    quantity: 20,
    payment: 265,
    unlock: "sawmill",
  },
] satisfies {
  id: string;
  name: string;
  item: Item;
  quantity: number;
  payment: number;
  unlock: string | null;
}[];
