import type { Farm } from "../../farm/domain/model";
export const chapters = [
  {
    title: "Premiers pas",
    subtitle: "Du premier semis à un terrain à explorer.",
    skill: "Séquences et boucles",
  },
  {
    title: "Une ferme autonome",
    subtitle: "Observer, décider et organiser son programme.",
    skill: "Conditions, variables et coordonnées",
  },
  {
    title: "Cultiver autrement",
    subtitle: "Diversifier les cultures et équiper son fermier.",
    skill: "Fonctions et gestion des ressources",
  },
  {
    title: "Changer d’échelle",
    subtitle: "Construire une équipe et une chaîne de production.",
    skill: "Coordination et logistique",
  },
];
export type MissionDestination = "code" | "Recherches" | "Magasin" | "Robots";
export interface Mission {
  id: string;
  chapter: number;
  title: string;
  text: string;
  target: number;
  progress: (s: Farm) => number;
  reward: number;
  gold: number;
  xp: number;
  hint: string;
  code?: string;
  destination: MissionDestination;
  action: string;
}
const milestone = (
  id: string,
  chapter: number,
  title: string,
  text: string,
  target: number,
  progress: Mission["progress"],
  gold: number,
  xp: number,
  hint: string,
  destination: MissionDestination,
  action: string,
  code?: string,
  reward = 0,
): Mission => ({
  id,
  chapter,
  title,
  text,
  target,
  progress,
  gold,
  xp,
  hint,
  destination,
  action,
  code,
  reward,
});
const researched =
  (...ids: string[]) =>
  (s: Farm) =>
    ids.filter((id) => s.unlocks.includes(id)).length;
export const missions: Mission[] = [
  milestone(
    "first",
    0,
    "Première pousse",
    "Plantez et récoltez votre premier blé.",
    1,
    (s) => s.harvested,
    0,
    25,
    "Sur la parcelle initiale, plantez du blé, attendez sa maturité puis récoltez. Les appels sont attendus automatiquement par le jeu.",
    "code",
    "Ouvrir mon programme",
    "plant(Entities.Wheat);\nwhile (!harvest()) {\n  // Réessayer jusqu’à maturité.\n}",
    4,
  ),
  milestone(
    "deposit",
    0,
    "À l’abri dans le dépôt",
    "Déposez 5 blés au total dans un dépôt.",
    5,
    (s) => s.deposited,
    0,
    25,
    "Le dépôt initial est voisin de (0, 0). deposit() libère la soute et rend les ressources disponibles pour les recherches.",
    "code",
    "Programmer le dépôt",
    "deposit();",
    8,
  ),
  milestone(
    "routine",
    0,
    "Une ferme qui travaille",
    "Atteignez 20 blés déposés au total.",
    20,
    (s) => s.deposited,
    0,
    50,
    "Une boucle répète votre séquence. Sur une seule case, réessayez la récolte jusqu’à maturité ; planter sur une culture existante ne la remplace pas. Revenez ici récupérer chaque récompense.",
    "code",
    "Automatiser la récolte",
    "while (true) {\n  harvest();\n  plant(Entities.Wheat);\n  deposit();\n}",
    10,
  ),
  milestone(
    "explore",
    0,
    "Voyez plus grand",
    "Débloquez trois cases et visitez-les toutes.",
    3,
    (s) => s.visited.length,
    0,
    50,
    "Recherchez Trois parcelles (25 blés), puis déplacez le fermier vers l’est deux fois. Les bordures ne bouclent pas : revenez vers l’ouest pour atteindre le dépôt.",
    "Recherches",
    "Agrandir le terrain",
    "move(Direction.East);\nmove(Direction.East);\nmove(Direction.West);\nmove(Direction.West);",
    20,
  ),
  milestone(
    "observe",
    1,
    "Observer avant d’agir",
    "Recherchez Conditions et Capteur de maturité.",
    2,
    researched("conditions", "sensor"),
    25,
    50,
    "Conditions coûte 10 blés et le capteur 5 foins. Le capteur permet de tester la maturité avant de récolter.",
    "Recherches",
    "Rechercher les capteurs",
    "if (can_harvest()) {\n  harvest();\n}",
  ),
  milestone(
    "coordinates",
    1,
    "Trouver ses repères",
    "Recherchez Variables et types et Positionnement.",
    2,
    researched("variables", "position"),
    40,
    50,
    "get_pos_x() et get_pos_y() indiquent la case du robot. Stockez leurs résultats dans des variables pour décider où aller.",
    "Recherches",
    "Débloquer les coordonnées",
    "const x: number = get_pos_x();\nconst y: number = get_pos_y();",
  ),
  milestone(
    "hundred",
    1,
    "Un rythme régulier",
    "Atteignez 100 blés déposés au total.",
    100,
    (s) => s.deposited,
    75,
    75,
    "Une récolte ne peut pas dépasser la place libre. Comparez get_inventory(Resources.Wheat) et get_capacity(), puis revenez près du dépôt avant deposit().",
    "code",
    "Optimiser mon programme",
    "const plein: boolean =\n  get_inventory(Resources.Wheat) >= get_capacity();\n// Revenir près du dépôt avant deposit().",
  ),
  milestone(
    "wood",
    1,
    "Les premières haies",
    "Débloquez les buissons.",
    1,
    researched("bush"),
    100,
    75,
    "La recherche Buissons ouvre la production de bois. Consultez ses prérequis et son coût dans Agriculture. Le bois servira aux équipements et aux bâtiments.",
    "Recherches",
    "Diversifier la ferme",
    "plant(Entities.Bush);",
  ),
  milestone(
    "soil",
    2,
    "Préparer la terre",
    "Débloquez Labour et Carottes.",
    2,
    researched("till", "carrot"),
    100,
    75,
    'Les carottes demandent du sol labouré et des graines de blé dans la soute. Chargez-les près du dépôt avec load("Wheat", quantité).',
    "Recherches",
    "Débloquer les carottes",
    "load(Resources.Wheat, 5);\ntill();\nplant(Entities.Carrot);",
  ),
  milestone(
    "hold-upgrade",
    2,
    "Une soute à la hauteur",
    "Recherchez la première amélioration Soute.",
    1,
    researched("hold"),
    100,
    75,
    "Recherchez Soute pour débloquer l’équipement, puis installez le niveau 2 sur un robot à l’atelier : 100 bois + 50 foins. Seul ce robot gagne de la capacité.",
    "Robots",
    "Améliorer les soutes",
  ),
  milestone(
    "construction",
    2,
    "Les fondations",
    "Débloquez Construction, Stockage niveau 2 et un deuxième emplacement constructible.",
    3,
    researched("construction", "storage2", "land"),
    250,
    100,
    "Les sites en bois accueillent les bâtiments, pas les cultures. Recherchez aussi Stockage niveau 2 : les 500 unités du dépôt permettent de financer les outils agricoles et la Meunerie.",
    "Recherches",
    "Préparer les bâtiments",
  ),
  milestone(
    "motor-upgrade",
    2,
    "Gagner du temps",
    "Recherchez Motorisation et Outils agricoles.",
    2,
    researched("motor", "tools"),
    125,
    75,
    "Le moteur accélère le déplacement ; les outils réduisent la durée des actions agricoles. Les gains profitent aussi aux futurs robots.",
    "Robots",
    "Améliorer les robots",
  ),
  milestone(
    "organize",
    2,
    "Un programme réutilisable",
    "Débloquez la recherche Fonctions.",
    1,
    researched("functions"),
    125,
    100,
    "Découpez votre programme en petites fonctions que vous pouvez appeler à chaque case. La mission valide la recherche ; votre manière d’écrire le code reste libre.",
    "Recherches",
    "Rechercher les fonctions",
    "function recolterSiPret(): void {\n  if (can_harvest()) harvest();\n}\nrecolterSiPret();",
  ),
  milestone(
    "fleet-license",
    3,
    "Former une équipe",
    "Débloquez la recherche Flotte.",
    1,
    researched("fleet"),
    250,
    100,
    "La recherche autorise des fermiers supplémentaires ; elle n’en offre pas. La récompense de cette étape finance un nouveau fermier au magasin.",
    "Robots",
    "Débloquer la flotte",
  ),
  milestone(
    "second-robot",
    3,
    "Deux robots, une ferme",
    "Possédez deux robots permanents en état de marche.",
    2,
    (s) => s.robots.filter((r) => !r.destroyed && !r.loan).length,
    200,
    100,
    "Achetez un robot dans le magasin. Chaque robot a son propre programme et sa soute. Évitez les collisions : gardez des itinéraires distincts, ou utilisez les réservations une fois débloquées.",
    "Magasin",
    "Recruter un robot",
  ),
  milestone(
    "mill",
    3,
    "Du champ au moulin",
    "Installez un moulin sur un emplacement constructible.",
    1,
    (s) => s.buildings.filter((b) => b.kind === "Mill").length,
    300,
    100,
    "Recherchez Meunerie puis achetez un moulin (500 or). Prévoyez une case voisine accessible pour livrer le blé et collecter la farine.",
    "Magasin",
    "Construire un moulin",
    "deliver(Direction.East, Resources.Wheat, 5);\n// Attendre un cycle du moulin voisin.\ncollect(Direction.East, Resources.Flour, 1);",
  ),
  milestone(
    "flour",
    3,
    "La première transformation",
    "Produisez 5 farines dans vos moulins.",
    5,
    (s) => s.produced.Flour ?? 0,
    200,
    100,
    "Le moulin transforme 5 blés en 1 farine par cycle. Livrez les ingrédients depuis un robot voisin avec deliver(direction, ressource, quantité), puis collectez la production pour éviter de saturer la sortie. Le compteur cumule les cycles depuis la mise à jour.",
    "code",
    "Programmer la production",
    "deliver(Direction.East, Resources.Wheat, 25);\n// Après les cycles du moulin à l’est :\ncollect(Direction.East, Resources.Flour, 5);",
  ),
  milestone(
    "logistics",
    3,
    "Une logistique solide",
    "Recherchez Stockage niveau 3 puis Transporteur.",
    2,
    researched("storage3", "transporter"),
    350,
    125,
    "Passez d’abord les dépôts à 2 500 unités pour réunir les 700 ressources nécessaires à la recherche Transporteur. Ce robot transporte sans cultiver ; son achat reste séparé de la recherche.",
    "Robots",
    "Organiser la logistique",
  ),
  milestone(
    "thousand",
    3,
    "Une ferme qui dure",
    "Atteignez 1 000 blés déposés au total.",
    1000,
    (s) => s.deposited,
    500,
    150,
    "Combinez vos itinéraires, vos améliorations et vos dépôts. Ce total est cumulatif : vendre ou dépenser vos blés ne fait pas reculer la mission.",
    "code",
    "Perfectionner mes programmes",
  ),
];
const firstGrass: Mission = {
  ...missions[0],
  title: "Premiers foins",
  text: "Récoltez votre premier foin sur la prairie.",
  progress: (s) => s.harvestedItems.Hay ?? 0,
  reward: 0,
  hint: "L’herbe est déjà présente : harvest() la récolte. Elle repousse seule en 0,5 seconde. Déposez le foin avec deposit().",
  code: "harvest();\ndeposit();",
};
const firstDeposit: Mission = {
  ...missions[1],
  text: "Déposez 5 foins dans le dépôt voisin.",
  progress: (s) => s.depositedItems.Hay ?? 0,
  reward: 0,
  hint: "Relancez harvest(); deposit(); jusqu’à posséder 5 foins au dépôt. La soute du robot et le stock du dépôt sont distincts.",
};
const firstLoop: Mission = milestone(
  "first-loop",
  0,
  "Votre première boucle",
  "Recherchez Boucle while pour 5 foins.",
  1,
  researched("loops"),
  0,
  25,
  "Ouvrez Recherches → Programmation. La boucle while répète une séquence. Utilisez true et false, en minuscules, et des accolades en TypeScript.",
  "Recherches",
  "Débloquer la boucle",
  "while (true) {\n  harvest();\n  deposit();\n}",
);
const firstRoutine: Mission = {
  ...missions[2],
  title: "Une prairie autonome",
  text: "Atteignez 20 foins déposés au total.",
  progress: (s) => s.depositedItems.Hay ?? 0,
  reward: 0,
  hint: "Après Boucle while, répétez harvest() puis deposit(). L’herbe repousse pendant les actions du robot. Arrêter termine immédiatement le programme.",
  code: "while (true) {\n  harvest();\n  deposit();\n}",
};
const firstExplore: Mission = {
  ...missions[3],
  reward: 0,
  hint: "Trois parcelles coûte 20 foins. Continuez à produire du foin, puis recherchez l’extension. Visitez les trois cases et revenez près du dépôt pour décharger.",
};
const firstWheat: Mission = milestone(
  "first-wheat",
  0,
  "Vos premières cultures",
  "Recherchez Culture du blé et Capteur de maturité, puis récoltez un blé.",
  3,
  (s) =>
    researched("wheat-base", "sensor")(s) +
    Math.min(1, s.harvestedItems.Wheat ?? 0),
  0,
  50,
  "Gardez 15 foins : 10 pour Culture du blé et 5 pour le capteur. Contrairement à l’herbe, le blé doit être planté. Attendez sa maturité avant harvest() : une récolte trop précoce détruit la culture sans produire de ressources.",
  "Recherches",
  "Débloquer le blé et le capteur",
  "plant(Entities.Wheat);\nwhile (!can_harvest()) {\n  // Le robot attend la maturité.\n}\nharvest();\ndeposit();",
);
const modernMissions: Mission[] = [
  firstGrass,
  firstDeposit,
  firstLoop,
  firstRoutine,
  milestone(
    "first-speed",
    0,
    "Le bon rythme",
    "Recherchez Vitesse d’exécution.",
    1,
    researched("speed"),
    0,
    25,
    "Après While (5 foins), Vitesse coûte 20 foins et divise par deux la durée des actions. Les cultures immatures sont détruites par harvest().",
    "Recherches",
    "Améliorer la vitesse",
  ),
  {
    ...firstExplore,
    hint: "Expansion 1 coûte 30 foins après Vitesse. Recherchez ensuite move() pour 30 foins, puis visitez les trois parcelles. Un déplacement au-delà du bord rejoint le bord opposé.",
    code: "move(Direction.East);\nmove(Direction.East);\nmove(Direction.East);\ndeposit();",
  },
  {
    ...missions.find((m) => m.id === "wood")!,
    chapter: 0,
    gold: 0,
    reward: 0,
    text: "Recherchez plant() et Buisson, puis récoltez du bois.",
    target: 3,
    progress: (s) =>
      researched("plant", "bush")(s) + Math.min(1, s.harvestedItems.Wood ?? 0),
    hint: "plant() coûte 50 foins après Vitesse ; Buisson coûte 50 foins. Les buissons sont gratuits à planter et poussent en 3,2 à 4,8 secondes. Sans capteur, laissez plusieurs appels deposit() occuper le robot avant de récolter.",
    code:
      "plant(Entities.Bush);\n// Laisser passer au moins 4,8 secondes.\n" +
      "deposit();\n".repeat(10) +
      "harvest();\ndeposit();",
  },
  milestone(
    "workshop-first",
    1,
    "Un atelier pour progresser",
    "Construisez votre premier atelier.",
    1,
    (s) => s.buildings.filter((b) => b.kind === "Workshop").length,
    0,
    50,
    "Recherchez Construction (20 bois), Robotique et atelier (20 bois), puis un terrain constructible. Vendez du foin pour acheter l’atelier à 500 or et posez-le depuis l’inventaire.",
    "Magasin",
    "Construire l’atelier",
  ),
  {
    ...missions.find((m) => m.id === "observe")!,
    progress: (s) =>
      Number(s.unlocks.includes("conditions")) +
      Number(
        s.robots.some((r) => !r.destroyed && (r.equipment?.sensor ?? 0) > 0),
      ),
    hint: "Conditions et opérateurs : 150 foins + 10 bois. can_harvest() : 50 foins + 10 bois, après les conditions et plant(). Puis installez le capteur sur votre fermier dans Atelier → Améliorer un robot (50 foins + 10 bois), avec un atelier construit. Le capteur évite les récoltes immatures.",
  },
  {
    ...missions.find((m) => m.id === "soil")!,
    chapter: 1,
    text: "Débloquez les carottes et récoltez-en une.",
    target: 2,
    progress: (s) =>
      researched("carrot")(s) + Math.min(1, s.harvestedItems.Carrot ?? 0),
    hint: "Carottes coûte 50 bois. Chargez 1 foin et 1 bois dans la soute, labourez la prairie, puis semez. Ne labourez pas à nouveau une case déjà en terre.",
    code: "load(Items.Hay, 1);\nload(Resources.Wood, 1);\ntill();\nplant(Entities.Carrot);\nwhile (!can_harvest()) {}\nharvest();\ndeposit();",
  },
  {
    ...missions.find((m) => m.id === "coordinates")!,
    hint: "Coordonnées : 50 bois + 50 carottes, après Carottes, can_harvest() et move(). Variables : 100 bois + 150 carottes. Stockage du dépôt 2 (500 or, 800 unités) permet de réunir ce coût.",
  },
  {
    ...missions.find((m) => m.id === "hundred")!,
    title: "Une prairie productive",
    text: "Déposez 100 foins au total.",
    progress: (s) => s.depositedItems.Hay ?? 0,
    hint: "Herbe 2 coûte 300 foins et double le rendement. Il faut d’abord Construction puis Stockage 2 (500 or). Vendez régulièrement les ressources au magasin pour réunir l’or sans saturer le dépôt.",
    code: "if (can_harvest()) { harvest(); }\ndeposit();",
  },
  ...[
    "hold-upgrade",
    "construction",
    "motor-upgrade",
    "organize",
    "fleet-license",
    "second-robot",
  ].map((id) => {
    const m = missions.find((m) => m.id === id)!;
    if (id === "construction")
      return {
        ...m,
        text: "Débloquez Construction, améliorez un dépôt et obtenez un deuxième terrain constructible.",
        progress: (s: Farm) =>
          Number(s.unlocks.includes("construction")) +
          Number(
            s.buildings.some(
              (b) => b.kind === "Depot" && (b.upgrades?.storage ?? 1) >= 2,
            ),
          ) +
          Number(s.unlocks.includes("land")),
        hint: "Construction coûte 20 bois. Le niveau 2 du dépôt coûte 500 or et porte ce dépôt à 800 unités. Les terrains constructibles accueillent les bâtiments.",
      };
    if (id === "hold-upgrade")
      return {
        ...m,
        progress: (s: Farm) =>
          Number(s.robots.some((r) => (r.equipment?.hold ?? 1) >= 2)),
      };
    if (id === "motor-upgrade")
      return {
        ...m,
        progress: (s: Farm) =>
          Number(s.robots.some((r) => (r.equipment?.motor ?? 1) >= 2)) +
          Number(s.robots.some((r) => (r.equipment?.tools ?? 1) >= 2)),
        hint: "Débloquez les familles d’équipements, puis améliorez le moteur et les outils du fermier dans Atelier → Améliorer un robot. Les coûts et effets sont propres à chaque unité.",
      };
    if (id === "fleet-license")
      return {
        ...m,
        gold: 500,
        hint: "Flotte autorise un fermier de 20 unités, vendu séparément 500 or. Cette récompense finance son achat.",
      };
    return m;
  }),
  {
    ...firstWheat,
    chapter: 3,
    hint: "Le blé devient une branche de transformation après Carottes : Culture du blé coûte 200 foins + 50 bois. Il sert ensuite au moulin et au four. Stockage 2 est requis pour réunir les 250 ressources.",
  },
  ...["mill", "flour", "logistics", "thousand"].map((id) => {
    const m = missions.find((m) => m.id === id)!;
    if (id === "logistics")
      return {
        ...m,
        text: "Améliorez un dépôt au niveau 3 puis recherchez Transporteur.",
        progress: (s: Farm) =>
          Number(
            s.buildings.some(
              (b) => b.kind === "Depot" && (b.upgrades?.storage ?? 1) >= 3,
            ),
          ) + Number(s.unlocks.includes("transporter")),
        hint: "Stockage du dépôt 3 (3 200 unités) s’achète avec de l’or après Stockage 2. La recherche Transporteur prépare un robot à 500 or, réservé à la logistique.",
      };
    if (id === "thousand")
      return {
        ...m,
        text: "Déposez 1 000 ressources au total.",
        progress: (s: Farm) => s.deposited,
        hint: "Combinez prairies, buissons, carottes et transformations. Les dépôts cumulés restent comptés même après vente ou recherche.",
      };
    return m;
  }),
];
const legacyAssetMissions = missions.map((m) =>
  ["hold-upgrade", "construction", "motor-upgrade", "logistics"].includes(m.id)
    ? modernMissions.find((next) => next.id === m.id)!
    : m,
);
export const missionsFor = (s: Farm): Mission[] =>
  s.progressionVersion === 2
    ? modernMissions
    : s.assetProgression === 1
      ? legacyAssetMissions
      : missions;
export const currentMission = (s: Farm) =>
  missionsFor(s).find((m) => !s.claimed.includes(m.id));
export const completedMissions = (s: Farm) =>
  missionsFor(s).filter((m) => s.claimed.includes(m.id)).length;
export function career(s: Farm) {
  const xp = missionsFor(s)
    .filter((m) => s.claimed.includes(m.id))
    .reduce((n, m) => n + m.xp, 0);
  const ranks = [
    "Apprenti fermier",
    "Cultivateur",
    "Programmeur agricole",
    "Chef d’exploitation",
    "Architecte de ferme",
  ];
  const thresholds = [0, 150, 400, 850, 1500];
  const level = thresholds.filter((t) => xp >= t).length;
  return {
    xp,
    level,
    title: ranks[level - 1],
    floor: thresholds[level - 1],
    next: thresholds[level],
  };
}
