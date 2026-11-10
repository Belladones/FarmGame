import type { Inventory, Research } from "./catalog";
/** User workbook amélioration.xlsx; explicit values override the former progression.
 * Blank tiers continue doubling yields and multiplying research costs by four.
 */
export const storageCapacities = Array.from(
  { length: 10 },
  (_, i) => 200 * 4 ** i,
);
export function balanceResearch(original: Research[]): Research[] {
  const entries = new Map(original.map((r) => [r.id, { ...r }]));
  const set = (
    id: string,
    name: string,
    materials: Inventory,
    prerequisites: string[],
    category: Research["category"],
    detail: string,
    goldCost = 0,
  ) =>
    entries.set(id, {
      id,
      name,
      materials,
      prerequisites,
      category,
      detail,
      cost: materials.Wheat ?? 0,
      goldCost,
    });
  const A = "Agriculture",
    P = "Programmation",
    T = "Technologie";
  set(
    "loops",
    "Boucle while",
    { Hay: 5 },
    [],
    P,
    "Débloque les boucles while, for et les booléens true / false en TypeScript. Arrêter termine le programme sans figer le jeu.",
  );
  set(
    "speed",
    "Vitesse d’exécution",
    { Hay: 20 },
    ["loops"],
    T,
    "Double la vitesse des actions et des déplacements (durée ×0,5). Une récolte immature est détruite : étudiez ensuite les conditions et can_harvest().",
  );
  set(
    "plant",
    "Semis · plant()",
    { Hay: 50 },
    ["speed"],
    T,
    "Débloque plant(entity). Les buissons sont la première culture à rechercher. Succès : 200 ticks de base ; échec : 1 tick.",
  );
  set(
    "move",
    "Déplacement · move()",
    { Hay: 30 },
    ["extension", "speed"],
    T,
    "Débloque move(Direction.North/East/South/West). Sur le terrain agricole, dépasser un bord ramène au bord opposé. Les collisions restent actives.",
  );
  set(
    "conditions",
    "Conditions et opérateurs",
    { Hay: 150, Wood: 10 },
    ["loops", "bush"],
    P,
    "Débloque if / else if / else. Opérateurs TypeScript : + - * / % **, === !== < > <= >=, ! && ||. Division entière : Math.floor(a / b).",
  );
  set(
    "print",
    "Journal · console.log",
    { Hay: 150, Wood: 50 },
    ["loops"],
    P,
    "Débloque console.log(...) et print(...) pour afficher des informations dans le journal du robot.",
  );
  set(
    "variables",
    "Variables et types",
    { Wood: 100, Carrot: 150 },
    ["conditions", "carrot"],
    P,
    "Étape d’apprentissage : const, let, types number et boolean, affectations et calculs. Les déclarations restent libres afin de conserver les programmes existants.",
  );
  set(
    "functions",
    "Fonctions",
    { Wood: 500, Carrot: 750 },
    ["variables", "conditions"],
    P,
    "Organisez le programme avec function et des paramètres typés. Les fonctions nommées restent disponibles pour expérimenter.",
  );
  set(
    "sensor",
    "Capteur de maturité",
    { Hay: 50, Wood: 10 },
    ["conditions", "plant"],
    T,
    "Débloque can_harvest() : true si la plante est mûre, false sinon. Lecture : 1 tick.",
  );
  set(
    "position",
    "Coordonnées",
    { Wood: 50, Carrot: 50 },
    ["carrot", "sensor", "move"],
    T,
    "Débloque get_pos_x(), get_pos_y() et get_world_size(). L’origine est (0, 0), x vers l’est et y vers le nord.",
  );
  set(
    "analysis",
    "Analyse de la parcelle",
    { Wood: 100, Carrot: 50 },
    ["position"],
    T,
    "Débloque get_entity_type() et get_ground_type().",
  );
  set(
    "consumables",
    "Utilisation des objets",
    { Wood: 50 },
    ["carrot", "plant"],
    T,
    "Débloque use_item(item, n = 1), pour l’eau et les engrais après leurs recherches respectives.",
  );
  set(
    "humidity",
    "Capteur d’humidité",
    { Carrot: 15 },
    ["watering", "consumables"],
    T,
    "Débloque get_water(), humidité de la case entre 0 et 1. Lecture : 1 tick.",
  );
  set(
    "till",
    "Labourage · till()",
    {},
    [],
    T,
    "Disponible au départ : alterne Grounds.Soil et Grounds.Grassland. L’herbe apparaît spontanément sur prairie et peut être semée sur les deux sols.",
  );
  set(
    "bush",
    "Buisson",
    { Hay: 50 },
    ["plant"],
    A,
    "Plantation gratuite sur prairie ou terre labourée. Pousse de 3,2 à 4,8 s et produit 1 bois.",
  );
  set(
    "carrot",
    "Carottes",
    { Wood: 50 },
    ["bush", "till"],
    A,
    "Terre labourée. Plantation : 1 bois + 1 foin dans la soute. Pousse de 4,8 à 7,2 s ; récolte de base : 1 carotte.",
  );
  set(
    "tree",
    "Arbre",
    { Wood: 50, Carrot: 70 },
    ["carrot"],
    A,
    "Plantation gratuite sur prairie ou terre labourée. Pousse de 5,6 à 8,4 s ; 5 bois. Chaque arbre voisin orthogonal double la durée (jusqu’à ×16).",
  );
  set(
    "pumpkin",
    "Citrouille",
    { Wood: 150, Carrot: 250 },
    ["carrot", "tree"],
    A,
    "Terre labourée. Plantation : 3 carottes + 2 bois. Pousse : 25 s. Récolte : 4 citrouilles.",
  );
  set(
    "wheat-base",
    "Culture du blé",
    { Hay: 200, Wood: 50 },
    ["carrot", "plant"],
    A,
    "Branche complémentaire pour les moulins : blé gratuit à semer, pousse en 5 s, récolte de base : 1 blé.",
  );
  for (const [base, name, item, first, prereq, baseYield, last] of [
    ["grass", "Herbe", "Hay", 300, "loops", 1, 10],
    ["bush", "Buisson", "Hay", 250, "bush", 1, 10],
    ["carrot", "Carottes", "Wood", 250, "carrot", 1, 10],
    ["tree", "Arbre", "Hay", 300, "tree", 5, 10],
    ["pumpkin", "Citrouille", "Carrot", 1250, "pumpkin", 4, 10],
  ] as const) {
    for (let n = 2; n <= last; n++) {
      const previous =
        n === 2 ? (base === "grass" ? "loops" : base) : base + (n - 1);
      set(
        base + n,
        `${name} · niveau ${n}`,
        { [item]: first * 4 ** (n - 2) },
        [previous, prereq],
        A,
        `Production ${100 * 2 ** (n - 2)} % → ${100 * 2 ** (n - 1)} %. Rendement ×${2 ** (n - 1)} par rapport au niveau 1 : ${baseYield * 2 ** (n - 1)} unités par récolte. Appliqué aux nouvelles pousses / plantations.`,
      );
    }
  }
  const expansions = [
    ["extension", 3, 1, { Hay: 30 }, ["speed"]],
    ["extension3", 3, 3, { Wood: 20 }, ["extension", "bush"]],
    ...Array.from({ length: 7 }, (_, i) => {
      const n = i + 4;
      return [
        `extension${n}`,
        n,
        n,
        { Wood: 100 * 5 ** i, Carrot: 50 * 5 ** i },
        [`extension${n - 1}`, "carrot"],
      ];
    }),
  ] as [string, number, number, Inventory, string[]][];
  for (const [id, w, h, materials, prerequisites] of expansions)
    set(
      id,
      `Expansion ${id === "extension" ? 1 : w - 1} · ${w} × ${h}`,
      materials,
      prerequisites,
      A,
      `Étend le champ à ${w} × ${h} (${w * h} parcelles), sans déplacer les cultures existantes.`,
    );
  for (let n = 1; n <= 9; n++) {
    const id = n === 1 ? "watering" : "watering" + n;
    set(
      id,
      `Eau${n === 1 ? "" : ` · niveau ${n}`}`,
      { Wood: n === 1 ? 50 : 200 * 4 ** (n - 2) },
      n === 1
        ? ["carrot", "consumables"]
        : [n === 2 ? "watering" : "watering" + (n - 1)],
      A,
      `Produit passivement ${0.1 * 2 ** (n - 1)} réservoir(s)/s (1 toutes les 10 s au niveau 1), doublé à chaque niveau. Un réservoir ajoute 0,25 d’humidité avec use_item(Items.Water). Croissance de ×1 à ×5 selon l’humidité ; évaporation de 1 % de l’eau restante par seconde.`,
    );
  }
  set(
    "construction",
    "Construction",
    { Wood: 20 },
    ["bush"],
    T,
    "Débloque les dépôts (500 or), les terrains constructibles et les transferts vers les bâtiments.",
  );
  for (let n = 2; n <= 10; n++)
    set(
      "storage" + n,
      `Stockage · niveau ${n}`,
      {},
      [n === 2 ? "construction" : "storage" + (n - 1)],
      T,
      `${storageCapacities[n - 1].toLocaleString("fr-FR")} unités par dépôt. Coût en or, distinct des ressources stockées.`,
      500 * 4 ** (n - 2),
    );
  // Continue the unchanged industry after the newly specified agriculture chain.
  for (const id of [
    "tank",
    "reservoir",
    "land",
    "fleet",
    "hold",
    "motor",
    "tools",
  ])
    if (entries.has(id)) {
      const e = entries.get(id)!;
      e.materials = Object.fromEntries(
        Object.entries(e.materials).map(([k, v]) => [
          k === "Wheat" ? "Hay" : k,
          v,
        ]),
      );
    }
  entries.get("fleet")!.detail =
    "Autorise les fermiers supplémentaires (500 or, soute de 20 unités).";
  entries.get("transporter")!.detail =
    "Débloque le transporteur (500 or, soute de 100 unités, sans culture).";
  for (const [base, label] of [
    ["milling", "Moulin"],
    ["bakery", "Four"],
  ])
    for (let n = 2; n <= 5; n++)
      set(
        base + n,
        `${label} · niveau ${n}`,
        { Wood: 200 * 5 ** (n - 2), Carrot: 100 * 5 ** (n - 2) },
        [n === 2 ? base : base + (n - 1)],
        T,
        `Durée des cycles des ${label.toLowerCase()}s divisée par ${2 ** (n - 1)} par rapport au niveau 1. Recettes et quantité d’ingrédients inchangées.`,
      );
  for (let n = 3; n <= 5; n++)
    set(
      "reservoir" + n,
      `Puits et citernes · niveau ${n}`,
      { Wood: 500 * 4 ** (n - 2), Carrot: 200 * 5 ** (n - 2) },
      ["reservoir" + (n - 1)],
      T,
      `Capacité des puits et citernes ×${3 * 2 ** (n - 2)} ; débit des puits inchangé (1 eau/s). L’eau passive de l’arbre Agriculture est indépendante.`,
    );
  set(
    "workshop",
    "Robotique et atelier",
    { Wood: 20 },
    ["construction"],
    T,
    "Débloque l’atelier (500 or), l’installation individuelle d’équipements et la réparation des robots.",
  );
  set(
    "handling",
    "Manutention",
    { Wood: 100, Carrot: 50 },
    ["workshop"],
    T,
    "Débloque les équipements de transfert, à acheter séparément sur chaque robot.",
  );
  for (const id of ["hold", "motor", "tools", "tank"]) {
    const e = entries.get(id)!;
    e.prerequisites = [...new Set([...e.prerequisites, "workshop"])];
    e.detail =
      "Débloque cet équipement dans la fiche de chaque robot. L’installation et ses niveaux sont payés individuellement à l’atelier.";
  }
  for (const [id, name, price] of [
    ["milling", "moulin", 500],
    ["bakery", "four", 1000],
    ["sawmill", "scierie", 750],
    ["composting", "composteur", 750],
  ] as const)
    entries.get(id)!.detail =
      `Débloque le ${name} au magasin (${price} or). Les améliorations de débit sont propres à chaque bâtiment.`;
  return [...entries.values()];
}
