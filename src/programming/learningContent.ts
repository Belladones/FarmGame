export const starter = `// Récoltez l’herbe, puis déposez le foin.\n// Relancez ce programme pour obtenir 5 foins.\nharvest();\ndeposit();\n`;
export const examples: Record<string, string> = {
  "Premier programme": starter,
  "Première boucle":
    "// Recherche : Boucle while (5 foins)\nwhile (true) {\n  harvest();\n  deposit();\n}\n",
  "Premiers buissons":
    "// Recherches : Vitesse + plant() + Buisson + Conditions + Capteur de maturité\nwhile (true) {\n  plant(Entities.Bush);\n  while (!can_harvest()) {}\n  harvest();\n  deposit();\n}\n",
  "Cultiver le blé":
    "// Recherches : Boucle while + Culture du blé + Capteur de maturité\nwhile (true) {\n  plant(Entities.Wheat);\n  while (!can_harvest()) {\n    // Attendre la maturité avant de récolter.\n  }\n  harvest();\n  deposit();\n}",
  "Avec un capteur":
    "// Recherches : Conditions + Capteur de maturité\nwhile (true) {\n  if (can_harvest()) {\n    harvest();\n    deposit();\n  }\n  plant(Entities.Wheat);\n}",
  "Explorer les parcelles":
    "// Recherches : Expansion 1 + move() + Coordonnées + Variables\nfor (let x: number = 0; x < get_world_size().width; x++) {\n  plant(Entities.Wheat);\n  move(Direction.East);\n}\nwhile (get_pos_x() > 0) {\n  move(Direction.West);\n}\ndeposit();",
};
export const docs = [
  [
    "plant(Entities.Bush)",
    "plant() : 50 foins après Vitesse. Buisson : 50 foins. Gratuit à semer sur prairie ou terre, pousse en 3,2 à 4,8 s, donne 1 bois au niveau 1.",
  ],
  [
    "plant(Entities.Carrot)",
    "Carottes : 50 bois. Labourer puis semer coûte 1 foin + 1 bois dans la soute. Pousse en 4,8 à 7,2 s, donne 1 carotte. Les améliorations doublent le rendement.",
  ],
  [
    "use_item(Items.Water, n)",
    "Après Utilisation des objets et Eau : consomme jusqu’à n réservoirs passifs ; chacun ajoute 0,25 d’humidité. Eau 1 produit un réservoir toutes les 10 secondes, les niveaux suivants doublent le débit. Croissance jusqu’à ×5 ; humidité multipliée par 0,99 par seconde.",
  ],
  [
    "console.log(...)",
    "Recherche Journal : 150 foins + 50 bois. Affiche dans le journal du robot, comme print().",
  ],
  [
    "plant(Entities.Wheat)",
    "Recherches plant() puis Culture du blé (branche après Carottes) : plante gratuitement sur une case vide ou remplace l’herbe. Pousse en 5 secondes.",
  ],
  [
    "Entities.Grass / Items.Hay",
    "L’herbe pousse automatiquement sur prairie en 0,5 seconde et produit du foin. Elle peut être plantée sur Soil ou Grassland.",
  ],
  [
    "while (true) { harvest(); deposit(); }",
    "Recherche Boucle while : 5 foins au dépôt. Les booléens TypeScript sont true et false. Arrêter termine une boucle infinie sans bloquer le jeu.",
  ],
  [
    "Grounds.Grassland / Grounds.Soil",
    "La prairie est le sol par défaut. till() alterne prairie et terre labourée. L’herbe repousse seule sur prairie, mais pas sur sol labouré.",
  ],
  [
    "harvest()",
    "Sur les nouvelles parties : récolte l’entité sous le robot ; une entité immature est détruite sans ressource. Renvoie true si une entité est retirée, false sinon. Durée de base : 200 ticks (1 s) si retrait, 1 tick (5 ms) sinon. Soute pleine : la culture mûre est conservée.",
  ],
  [
    "deposit()",
    "Transfère la cargaison vers un dépôt adjacent, dans la limite de sa place disponible. Le dépôt initial est voisin de (0, 0).",
  ],
  [
    "move(Direction.East)",
    "Après la recherche move() : sur le champ, dépasser un bord rejoint le bord opposé. Les terrains constructibles gardent leurs limites et les collisions restent actives. Les anciennes parties gardent leurs bords bloqués.",
  ],
  [
    "can_harvest()",
    "Retourne un boolean. Recherchez Capteur de maturité puis installez-le sur ce robot dans Atelier → Améliorer un robot, avec un atelier construit.",
  ],
  [
    "get_pos_x() / get_pos_y()",
    "Retourne une coordonnée. Recherche : Coordonnées.",
  ],
  ["get_world_size()", "Retourne { width, height }. Recherche : Coordonnées."],
  ["get_stock(Resources.Wheat)", "Lit la quantité de blé dans le dépôt."],
  ["get_inventory(Resources.Wheat)", "Lit le blé dans la soute du robot."],
  ["get_capacity()", "Retourne la capacité actuelle de la soute."],
  ['print("Bonjour !")', "Écrit dans le journal. Recherche : Journal."],
  [
    "load(Resources.Wood, 5)",
    "Charge depuis un dépôt adjacent, dans la limite de la soute. Les graines sont prélevées dans la soute, pas dans les dépôts.",
  ],
  [
    "till()",
    "Disponible dès le départ pour le fermier : alterne prairie et terre labourée et retire l’herbe. Récoltez d’abord les autres cultures présentes.",
  ],
  [
    "watering() / refill_water()",
    "Nouvelle partie : watering() consomme un réservoir d’eau passive, comme use_item(Items.Water). refill_water() remplit le réservoir embarqué depuis un puits adjacent ; ce circuit physique reste séparé de l’inventaire passif.",
  ],
  [
    "use_item(Items.Fertilizer)",
    "Consomme un engrais transporté pour ajouter de la croissance. Recherches Consommables et Engrais.",
  ],
  [
    "get_entity_type() / get_ground_type()",
    "Identifie la culture et le sol. Recherche Analyse de la parcelle et équipement installé sur ce robot.",
  ],
  [
    "get_water()",
    "Humidité de la parcelle entre 0 et 1. Recherche Capteur d’humidité et capteur installé sur ce robot.",
  ],
  [
    "harvest_group()",
    "Bonus d’un carré de 2 × 2 citrouilles mûres du même niveau. Recherche Récolte groupée.",
  ],
  [
    "is_occupied(Direction.East)",
    "Détecte un robot incompatible dans la case voisine. Les drones peuvent coexister avec les robots terrestres.",
  ],
  [
    "reserve(Direction.East) / release()",
    "Réserve atomiquement la case suivante, pour 5 secondes au maximum. Recherche Circulation 2.",
  ],
  [
    "deliver(Direction.South, Resources.Wheat, 5)",
    "Livre une machine adjacente depuis la soute. La fabrication démarre automatiquement ; tampon d’entrée de 50 unités.",
  ],
  [
    "collect(Direction.South, Resources.Flour, 1)",
    "Récupère la sortie d’une machine dans la soute. Déposez-la avant de la vendre ou de financer une recherche.",
  ],
  [
    "get_building_stock(direction, item)",
    "Quantité dans les tampons d’entrée et de sortie du bâtiment adjacent.",
  ],
  [
    "get_building_status(direction)",
    "working, missing_input, output_full, idle, ou null. Recherche Construction.",
  ],
  [
    "sell(Resources.Wheat, 10)",
    "Vend uniquement depuis les dépôts au tarif normal. Recherche Commerce automatisé.",
  ],
  [
    "get_gold()",
    "Solde d’or disponible. Les ventes du magasin sont accessibles dès le début.",
  ],
];
