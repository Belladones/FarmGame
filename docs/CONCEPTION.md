# Ferme programmable — Arbres de compétences et API
Version de conception du 8 novembre 2026. Proposition de coûts, à équilibrer en jouant ; aucun développement du jeu n'est engagé.

## Règles communes

- Trois arbres : Agriculture, Programmation et Technologie.
- Chaque coût est le prix du niveau concerné, pas le cumul des niveaux.
- Chaque niveau demande le précédent de la même compétence, en plus des prérequis indiqués.
- Les rendements et bonus sont des valeurs finales, sans addition des niveaux précédents.
- Les recherches consomment les ressources des dépôts et restent acquises après une explosion.
- Les modèles de robots et bâtiments débloqués doivent ensuite être achetés dans le shop avec de l'or. Les recherches seules consomment les matériaux indiqués ; le bâtiment n'exige pas un second paiement de matériaux.
- Blé et buissons se plantent gratuitement : le joueur peut toujours repartir.
- Les fonctions len, list, print, range et str sont des aides propres au jeu, compatibles avec TypeScript ; elles ne sont pas des fonctions natives du langage.
- Les prix ci-dessous sont des hypothèses de conception, pas un équilibrage validé.

## 1. Agriculture

### Cultures et rendements

| Culture | Niveau | Quantité par récolte complète | Coût | Prérequis supplémentaire |
|---|---:|---:|---|---|
| Blé | 1 | 1 blé | Gratuit | Aucun |
| Blé | 2 | 5 blés | 20 blés | Aucun |
| Blé | 3 | 12 blés | 250 blés + 100 bois | Aucun |
| Blé | 4 | 30 blés | 2 000 blés + 600 bois + 200 carottes | Aucun |
| Blé | 5 | 75 blés | 15 000 blés + 5 000 bois + 2 000 carottes | Aucun |
| Buisson | 1 | 1 bois | 40 blés | Blé 2 |
| Buisson | 2 | 3 bois | 100 blés + 30 bois | Aucun |
| Buisson | 3 | 8 bois | 600 blés + 200 bois | Aucun |
| Carotte | 1 | 2 carottes | 60 blés + 30 bois | Buisson 1 + Labourage |
| Carotte | 2 | 6 carottes | 200 blés + 100 bois + 40 carottes | Aucun |
| Carotte | 3 | 15 carottes | 1 200 blés + 400 bois + 250 carottes | Aucun |
| Carotte | 4 | 40 carottes | 6 000 blés + 2 000 bois + 1 000 carottes | Aucun |
| Arbre | 1 | 5 bois | 80 blés + 40 bois | Buisson 1 |
| Arbre | 2 | 15 bois | 300 blés + 100 bois + 50 carottes | Aucun |
| Arbre | 3 | 40 bois | 2 000 blés + 600 bois + 300 carottes | Aucun |
| Arbre | 4 | 100 bois | 10 000 blés + 3 000 bois + 1 500 carottes | Aucun |
| Citrouille | 1 | 4 citrouilles | 1 000 blés + 500 bois + 300 carottes | Carotte 2 |
| Citrouille | 2 | 12 citrouilles | 3 000 blés + 1 000 bois + 600 carottes + 100 citrouilles | Aucun |
| Citrouille | 3 | 30 citrouilles | 12 000 blés + 4 000 bois + 2 000 carottes + 600 citrouilles | Aucun |

### Règles des cultures

Les coûts de plantation sont prélevés dans la cargaison du robot, seulement si la plantation réussit. Le rendement est brut, avant ces coûts.

| Culture | Entité | Pousse de base | Sol | Coût par plantation | Particularité |
|---|---|---:|---|---|---|
| Blé | Entities.Wheat | 5 s | Prairie ou terre labourée | Gratuit | Accessible dès le départ |
| Buisson | Entities.Bush | 8 s | Prairie | Gratuit | Bois sans contrainte d'espacement |
| Carotte | Entities.Carrot | 10 s | Terre labourée | 2 blés + 1 bois | Nécessite till() |
| Arbre | Entities.Tree | 20 s | Prairie | 1 bois | +50 % de durée de pousse de base par arbre voisin orthogonal ; maximum quatre voisins |
| Citrouille | Entities.Pumpkin | 25 s | Terre labourée | 3 carottes + 2 bois | Bonus collectif avec la compétence Récolte groupée |

Les durées sont données à vitesse de simulation ×1. Une amélioration de rendement est figée au moment de la plantation : les cultures déjà présentes conservent leur rendement jusqu'à leur récolte complète.

### Extensions agricoles

Les dimensions décrivent la zone agricole. Les emplacements de construction sont déverrouillés séparément autour de cette zone. Les trois premières cases sont disposées en ligne, 3 × 1. La case (0, 0) et les cases existantes conservent leurs coordonnées lors des extensions.

| Niveau | Dimensions | Total de cases agricoles | Coût |
|---|---|---:|---|
| 1 | 1 × 1 | 1 | Gratuit |
| 2 | 3 × 1 | 3 | 25 blés |
| 3 | 3 × 3 | 9 | 150 blés + 50 bois |
| 4 | 4 × 4 | 16 | 1 000 blés + 400 bois + 100 carottes |
| 5 | 5 × 5 | 25 | 5 000 blés + 2 000 bois + 500 carottes |
| 6 | 6 × 6 | 36 | 15 000 blés + 6 000 bois + 2 000 carottes |
| 7 | 7 × 7 | 49 | 40 000 blés + 15 000 bois + 6 000 carottes + 500 citrouilles |

La progression continue ensuite en ajoutant une ligne et une colonne par niveau ; les prix après 7 × 7 restent à définir.

### Pratiques agricoles

| Compétence | Niveau | Effet | Coût | Prérequis supplémentaire |
|---|---:|---|---|---|
| Arrosage | 1 | watering() ; vitesse de pousse jusqu'à ×1,25 | 150 blés + 60 bois | Réservoir embarqué |
| Arrosage | 2 | Vitesse de pousse jusqu'à ×1,5 | 800 blés + 300 bois + 150 carottes | Aucun |
| Arrosage | 3 | Vitesse de pousse jusqu'à ×2 | 4 000 blés + 1 200 bois + 600 carottes | Aucun |
| Engrais | 1 | Un engrais ajoute 20 points de pourcentage à la croissance | 100 bois + 50 carottes | Consommables |
| Engrais | 2 | Ajoute 35 points | 500 bois + 250 carottes | Aucun |
| Engrais | 3 | Ajoute 50 points | 2 000 bois + 1 000 carottes + 200 citrouilles | Aucun |
| Récolte groupée | 1 | harvest_group() ; +50 % sur un carré de 2 × 2 citrouilles mûres du même niveau | 500 carottes + 100 citrouilles | Citrouille 1 |
| Récolte groupée | 2 | Bonus porté à +100 % | 2 000 carottes + 500 citrouilles | Aucun |

L'humidité varie entre 0 et 1. Un arrosage consomme une unité d'eau et ajoute 0,25 d'humidité, plafonnée à 1. Proposition : la case perd 0,01 d'humidité par seconde de simulation. La vitesse de pousse est multipliée par 1 + bonus maximal × humidité. Un engrais ajoute de la croissance immédiatement, sans dépasser 100 %.

## 2. Programmation

Les achats débloquent les constructions et capacités correspondantes. Les formes équivalentes enseignées en TypeScript, comme .length pour len, sont accessibles avec le même déblocage. Les annotations de type et l'inférence sont présentées ensemble.

| Compétence | Niveau | Débloque | Coût | Prérequis supplémentaire |
|---|---:|---|---|---|
| Bases | 1 | while, appels aux commandes, littéraux et constantes du jeu | Gratuit | Aucun |
| Affichage | 1 | print() et journal de débogage du joueur | 5 blés | Bases |
| Conditions | 1 | if, else et comparaisons | 10 blés | Bases |
| Conditions | 2 | Combinaisons logiques &&, opérateur OU et ! | 50 blés + 10 bois | Aucun |
| Variables et types | 1 | let, const, number, boolean, string, calculs et affectations | 25 blés | Bases |
| Mesure | 1 | len() et lecture de .length | 40 blés + 10 bois | Variables et types |
| Conversion | 1 | str() et conversion native String() | 50 blés + 20 bois | Variables et types |
| Boucles comptées | 1 | for, for...of, compteurs, break et continue | 75 blés + 20 bois | Variables et types + Conditions 1 |
| Séquences | 1 | range() | 100 blés + 30 bois | Boucles comptées |
| Fonctions | 1 | function, paramètres typés, return et appels aux fonctions du joueur | 150 blés + 50 bois | Variables et types + Conditions 1 |
| Listes | 1 | list(), tableaux typés, syntaxe [], index, push et pop | 600 blés + 200 bois + 100 carottes | Fonctions + Boucles comptées + Mesure |
| Listes | 2 | find, includes, map, filter et fonctions fléchées | 1 500 blés + 500 bois + 300 carottes | Aucun |
| Listes | 3 | sort, reduce et tableaux à plusieurs dimensions | 4 000 blés + 1 200 bois + 800 carottes + 100 citrouilles | Aucun |
| Objets | 1 | Objets, propriétés, types d'objets et accès dynamique | 1 000 blés + 400 bois + 200 carottes | Fonctions |
| Modélisation | 1 | type, interface, unions et propriétés optionnelles | 2 000 blés + 800 bois + 400 carottes | Objets |
| Collections avancées | 1 | Map et Set | 3 000 blés + 1 000 bois + 600 carottes | Listes 2 + Objets |
| Génériques | 1 | Fonctions et types génériques | 5 000 blés + 2 000 bois + 1 000 carottes + 200 citrouilles | Modélisation + Listes 2 |

L'accès à une propriété fournie par l'API, comme get_world_size().width, est autorisé avec le capteur concerné. La compétence Objets sert à construire ses propres structures de données. De même, range() fournit une séquence d'entiers avant l'achat de la création de listes libres.

Les messages d'erreur du jeu restent toujours visibles. Acheter print() donne la possibilité d'écrire ses propres messages.

### Définition des aides achetables

| Fonction | Résultat | Exemple |
|---|---|---|
| len(value) | Nombre d'éléments d'un tableau ou longueur d'un texte selon .length | len("blé") vaut 3 ; len(range(3)) vaut 3 |
| list(...values) | Nouveau tableau contenant les arguments, dans leur ordre | list(2, 4, 6) produit [2, 4, 6] |
| print(...values) | Affiche les valeurs dans le journal du robot ; ne renvoie rien | print("Position", get_pos_x(), get_pos_y()) |
| range(stop) | Tableau des entiers de 0 inclus à stop exclu | range(3) produit [0, 1, 2] |
| range(start, stop, step = 1) | Tableau d'entiers suivant un pas ; borne finale exclue | range(1, 6, 2) produit [1, 3, 5] |
| str(value) | Texte obtenu par la conversion String(value) | str(42) vaut "42" ; str(true) vaut "true" |

range() accepte des entiers et un pas négatif, mais pas un pas nul. Une direction incohérente avec les bornes produit un tableau vide. list() sans argument produit une liste vide. Les tableaux de list() utilisent les règles normales d'inférence TypeScript ; l'annotation permet de typer une liste vide.

## 3. Technologie

Le robot fermier initial et le dépôt initial sont gratuits. Le dépôt initial occupe une case de construction adjacente à la case agricole de départ.

### Capteurs et équipements

| Compétence | Niveau | Effet | Coût | Prérequis supplémentaire |
|---|---:|---|---|---|
| Capteur de maturité | 1 | can_harvest() | 10 blés | Aucun |
| Positionnement | 1 | get_pos_x(), get_pos_y(), get_world_size() | 20 blés | Extension agricole 2 |
| Analyse de la parcelle | 1 | get_entity_type(), get_ground_type() | 40 blés + 15 bois | Capteur de maturité |
| Capteur d'humidité | 1 | get_water() | 100 blés + 40 bois | Analyse de la parcelle |
| Labourage | 1 | till() sur les robots compatibles | 40 blés + 20 bois | Buisson 1 |
| Construction | 1 | Autorise la construction de bâtiments supplémentaires | 80 blés + 40 bois | Buisson 1 |
| Réservoir embarqué | 1 | Le robot compatible transporte jusqu'à 10 unités d'eau ; refill_water() | 150 blés + 100 bois | Construction |
| Réservoir fixe | 1 | Débloque puits (100 unités) et citerne (400 unités) dans le shop | 150 blés + 100 bois | Construction |
| Réservoir fixe | 2 | Puits : 300 unités ; citerne : 1 200 unités | 500 bois + 200 carottes | Aucun |
| Consommables | 1 | use_item() ; engrais disponibles dans le shop | 300 blés + 100 bois + 50 carottes | Analyse de la parcelle |
| Circulation | 1 | is_occupied(direction) | 60 blés + 20 bois | Capteur de maturité |
| Circulation | 2 | reserve(direction), release() | 500 blés + 200 bois + 100 carottes | Fonctions |
| Flotte | 1 | Autorise l'achat de robots fermiers supplémentaires | 100 blés + 50 bois | Circulation 1 |
| Transporteur | 1 | Modèle transporteur disponible dans le shop | 400 blés + 200 bois + 100 carottes | Flotte + Stockage 2 |
| Drone | 1 | Modèle drone disponible dans le shop | 1 500 blés + 800 bois + 400 carottes | Flotte + Réservoir embarqué |

Réservoir fixe débloque le puits et la citerne du shop. Le puits produit une unité d'eau par seconde et stocke 100 unités ; une citerne reliée stocke 400 unités supplémentaires sans produire d'eau. Le niveau 2 triple ces capacités, sans modifier le débit. Le robot remplit son réservoir embarqué de 10 unités depuis ce réseau.

### Stockage et terrain constructible

| Compétence | Niveau | Effet | Coût | Prérequis supplémentaire |
|---|---:|---|---|---|
| Stockage | 1 | Dépôt initial : 200 unités au total | Gratuit | Aucun |
| Stockage | 2 | Chaque dépôt contient 500 unités | 50 bois + 30 blés | Construction |
| Stockage | 3 | Chaque dépôt contient 2 500 unités | 200 bois + 100 carottes | Aucun |
| Stockage | 4 | Chaque dépôt contient 10 000 unités | 800 bois + 400 carottes | Aucun |
| Terrain constructible | 1 | +1 case, soit 2 au total avec le dépôt initial | 50 blés + 30 bois | Construction |
| Terrain constructible | 2 | +2 cases, soit 4 au total | 250 blés + 100 bois | Aucun |
| Terrain constructible | 3 | +4 cases, soit 8 au total | 1 500 blés + 600 bois + 200 carottes | Aucun |

Plusieurs dépôts additionnent leurs capacités. Les recherches coûteuses peuvent être payées depuis plusieurs dépôts. Les bâtiments sont achetés en or aux prix du catalogue, sans coût additionnel de matériaux. Terrain constructible 4, ajouté plus bas, porte le total à 16 emplacements.

### Améliorations des robots

Ces améliorations s'appliquent aux robots existants et futurs compatibles. Elles ne donnent jamais à un modèle une action qu'il ne sait pas effectuer.

| Compétence | Niveau | Effet final par rapport au modèle de base | Coût |
|---|---:|---|---|
| Motorisation | 1 | Vitesse de déplacement ×1,25 | 100 blés + 40 bois |
| Motorisation | 2 | Vitesse ×1,5 | 500 blés + 200 bois + 100 carottes |
| Motorisation | 3 | Vitesse ×2 | 2 500 blés + 1 000 bois + 500 carottes |
| Soute | 1 | Capacité de cargaison ×2 | 80 blés + 50 bois |
| Soute | 2 | Capacité ×4 | 400 blés + 200 bois + 100 carottes |
| Soute | 3 | Capacité ×8 | 2 000 blés + 800 bois + 400 carottes |
| Outils agricoles | 1 | Durée des actions agricoles ×0,8 | 150 blés + 80 bois |
| Outils agricoles | 2 | Durée ×0,6 | 800 blés + 300 bois + 200 carottes |
| Outils agricoles | 3 | Durée ×0,4 | 4 000 blés + 1 500 bois + 800 carottes |

Soute 1 et Outils agricoles 1 demandent Buisson 1. Motorisation 1 demande Extension agricole 2. Chaque niveau suivant demande le précédent.

Le robot fermier initial possède une soute de 10 unités. Le transporteur a une soute de base de 100 unités et se spécialise dans les transferts ; le drone peut survoler les unités terrestres, arroser et appliquer de l'engrais, mais ne peut ni labourer ni récolter. Leurs vitesses de base et prix d'achat sont proposés dans le catalogue de la section 6.

## 4. API personnalisée du jeu

Ce sont des déclarations de comportement, pas une implémentation. Chaque robot exécute son programme indépendamment. Une fonction sans coordonnées agit sur le robot qui exécute le programme et sa case actuelle.

### Commandes agricoles

| Signature | Comportement | Accès |
|---|---|---|
| plant(entity: Entities): boolean | Plante une culture sur une case agricole vide, avec un sol compatible. Prélève les ressources dans le robot seulement en cas de succès. | Départ ; chaque culture demande son déblocage |
| harvest(): boolean | Prélève la récolte mûre et la place dans la soute. Renvoie true si au moins une unité a été récupérée. | Départ |
| till(): boolean | Sur une case agricole vide, alterne Grounds.Grassland et Grounds.Soil. Ne détruit pas une culture existante. | Labourage |
| watering(): boolean | Consomme une unité d'eau embarquée et ajoute 0,25 d'humidité, dans la limite de 1. | Arrosage 1 + Réservoir embarqué |
| use_item(item: Items): boolean | Applique un consommable transporté. Items.Fertilizer ajoute de la croissance selon le niveau Engrais. | Consommables + effet Engrais pour l'engrais |
| harvest_group(): boolean | Déclenche le bonus d'un carré de 2 × 2 citrouilles mûres du même niveau. | Récolte groupée |

Si la soute ne peut pas contenir toute la récolte, harvest() récupère ce qui tient. Le reste demeure sur la case, qui reste récoltable. La case ne redevient vide qu'une fois toute la récolte récupérée. Cela évite qu'une amélioration de rendement rende une culture impossible à récolter.

Pour harvest_group(), le robot se place sur la case de coordonnées minimales du carré ; les quatre cases visées sont (x,y), (x+1,y), (x,y+1), (x+1,y+1). Le bonus est figé une seule fois sur ces quatre cultures, puis le robot récupère ce qui tient sur sa case. Le reste des récoltes se récupère ensuite avec harvest(), sans nouveau bonus.

Une action impossible renvoie false, laisse l'état inchangé et consomme du temps de travail mais aucune ressource. Un engrais n'est pas consommé sur une case vide ou une plante déjà mûre ; un arrosage n'est pas consommé sur une case saturée.

### Déplacements, stocks et eau

| Signature | Comportement | Accès |
|---|---|---|
| move(direction: Direction): boolean | Avance d'une case achetée accessible au modèle. Les bords ne se rebouclent pas. | Départ |
| deposit(): number | Dépose les ressources et consommables dans un dépôt adjacent, dans la limite de sa capacité. Renvoie le nombre d'unités transférées. | Départ |
| load(item: Resources ou Items, quantity: number): number | Charge depuis un dépôt adjacent au maximum la quantité demandée et la place disponible. Renvoie la quantité réellement chargée. | Départ ; chaque objet reste soumis à son déblocage |
| get_inventory(item: Resources ou Items): number | Quantité de cet élément dans la soute du robot. | Départ |
| get_stock(item: Resources ou Items): number | Quantité totale déposée dans les réserves de la ferme. | Départ |
| get_capacity(): number | Capacité maximale de la soute du robot. | Départ |
| refill_water(): boolean | Remplit le réservoir embarqué depuis un réservoir fixe adjacent, selon l'eau disponible. | Réservoir embarqué |
| is_occupied(direction: Direction): boolean | Indique si la case voisine est occupée par une unité incompatible avec la coexistence. Ne réserve pas la case. | Circulation 1 |
| reserve(direction: Direction): boolean | Réserve atomiquement la prochaine case pour un déplacement ; échoue si elle est occupée, réservée ou inaccessible. | Circulation 2 |
| release(): boolean | Libère la réservation du robot, si elle existe. | Circulation 2 |

Dans les signatures TypeScript, « Resources ou Items » s'écrit Resources | Items. Les quantités de chargement sont des entiers positifs. Si plusieurs dépôts sont adjacents, les transferts les traitent dans un ordre fixe affiché par l'interface.

Les ressources de plantation doivent être chargées avant de quitter le dépôt. L'eau est stockée dans un réservoir distinct de la cargaison.

Une réservation expire après le prochain déplacement réussi, à l'arrêt du programme ou après un délai fixé et visible. move() refuse d'entrer dans une case réservée par un autre robot. Il ne protège pas des collisions dans les cases non réservées.

Deux robots du même type de collision qui arrivent sur la même case explosent, même si leurs vitesses diffèrent. Un échange simultané de cases compte comme une collision. Pour cette version, fermiers et transporteurs partagent le type terrestre ; les drones ont le type aérien. Un drone et un robot terrestre peuvent coexister aux mêmes coordonnées.

### Capteurs

| Signature | Retour et sens | Accès |
|---|---|---|
| get_pos_x(): number | Abscisse du robot ; origine agricole en 0. | Positionnement |
| get_pos_y(): number | Ordonnée du robot ; origine agricole en 0. | Positionnement |
| get_world_size(): { width: number; height: number } | Dimensions de la zone agricole : 1 × 1, puis 3 × 1, puis 3 × 3, etc. | Positionnement |
| get_entity_type(): Entities ou null | Culture sur la case actuelle ; null si aucune culture. | Analyse de la parcelle |
| get_ground_type(): Grounds ou null | Grounds.Grassland ou Grounds.Soil ; null sur une case de construction. | Analyse de la parcelle |
| can_harvest(): boolean | Culture mûre avec une récolte encore présente, même si la soute du robot est pleine. | Capteur de maturité |
| get_water(): number | Humidité du sol entre 0 et 1 ; 0 sur une case sans sol agricole. | Capteur d'humidité |

Les capteurs ne consomment pas de ressources. Chaque programme dispose d'un budget d'instructions par tick ; une fois ce budget atteint, il rend la main et reprend au tick suivant. Les plantes continuent donc de pousser, y compris pendant une boucle qui consulte seulement les capteurs, et aucune boucle ne bloque l'interface.

### Constantes

- Cultures : Entities.Wheat, Entities.Bush, Entities.Carrot, Entities.Tree, Entities.Pumpkin.
- Récoltes : Resources.Wheat, Resources.Wood, Resources.Carrot, Resources.Pumpkin.
- Sols : Grounds.Grassland, Grounds.Soil.
- Consommables : Items.Fertilizer.
- Déplacements : Direction.North, Direction.East, Direction.South, Direction.West.
- North augmente y ; East augmente x. Les coordonnées commencent à (0,0) dans la zone agricole ; les constructions adjacentes peuvent avoir des coordonnées extérieures à ce rectangle.

## 5. Exemples pédagogiques

### Départ : une seule case cultivable, un dépôt adjacent

```ts
while (true) {
  harvest();
  plant(Entities.Wheat);
  deposit();
}
```

Le robot récolte ce qu'il peut, plante seulement si la case est vide et dépose sa cargaison. Aucune condition n'est nécessaire.

### Après les premiers capteurs

```ts
while (true) {
  if (can_harvest()) {
    harvest();
    deposit();
  }

  if (get_entity_type() === null) {
    plant(Entities.Wheat);
  }
}
```

Cet exemple reste sur la case de départ, adjacente au dépôt. La simulation doit laisser pousser les cultures pendant l'exécution ; le budget d'instructions ne doit pas transformer l'attente normale d'une culture en erreur.

### range et print

```ts
for (const x of range(get_world_size().width)) {
  print("Colonne", x);
}
```

Ce programme affiche les colonnes ; il ne déplace pas le robot.

### Listes et conversion

```ts
const cultures: Entities[] = list(
  Entities.Wheat,
  Entities.Carrot,
  Entities.Tree
);

print("Nombre de cultures : " + str(len(cultures)));
```

### Fonction créée par le joueur

```ts
function recolterSiPossible(): boolean {
  if (can_harvest()) {
    return harvest();
  }

  return false;
}
```

Créer une fonction exige la compétence Fonctions. Appeler plant(), harvest(), list() ou une autre fonction fournie ne demande que le déblocage correspondant.

## 6. Économie et shop en or

### Principes

- La partie commence avec 0 or, un robot fermier, une case agricole et le dépôt initial gratuit sur une case de construction adjacente.
- L'or provient de la vente de ressources ou marchandises, y compris les commandes commerciales. Les missions principales ne donnent pas directement d'or.
- Les recherches des trois arbres consomment des ressources ; les robots, bâtiments et consommables du shop se paient en or.
- Un bâtiment débloqué doit être acheté pour chaque exemplaire. Il n'exige pas en plus des matériaux de construction.
- Le shop est accessible depuis l'interface sans bâtiment commercial. Il vend les stocks déposés, jamais une cargaison de robot ou le contenu d'une machine.
- Les prix sont fixes pour cette première version. Les ressources agricoles et marchandises ne sont pas achetables : le joueur les produit. L'engrais est achetable après Consommables.
- L'eau n'est pas vendable ; un puits ne produit donc pas de l'or gratuitement.
- Une récompense matérielle peut être vendue après dépôt ; elle ne compte jamais comme production pour une autre mission.

### Prix de vente et d'achat

| Élément | Identifiant | Vente par unité | Achat par unité |
|---|---|---|---|
| Blé | Resources.Wheat | 1 or | Non achetable |
| Bois | Resources.Wood | 3 or | Non achetable |
| Carotte | Resources.Carrot | 6 or | Non achetable |
| Citrouille | Resources.Pumpkin | 12 or | Non achetable |
| Farine | Resources.Flour | 8 or | Non achetable |
| Pain | Resources.Bread | 25 or | Non achetable |
| Planche | Resources.Plank | 12 or | Non achetable |
| Engrais | Items.Fertilizer | 18 or | 25 or |


### Robots du shop

| Modèle | Prix d'achat | Déplacement de base | Soute de base | Actions |
|---|---|---|---|---|
| Fermier | 250 or | 1 case/s | 10 unités | Planter, récolter, labourer, transporter, arroser et utiliser des consommables selon recherches |
| Transporteur | 600 or | 0,75 case/s | 100 unités | Charger, transporter et déposer ; aucune plantation, récolte ou action de sol |
| Drone | 1 000 or | 2 cases/s | 10 unités | Transport léger, arrosage et application d'engrais ; pas de labourage ni de récolte |

Le premier fermier est offert. Les suivants demandent Flotte. Transporteur et Drone demandent leurs recherches respectives. Le réservoir d'eau est distinct de la soute. Motorisation, Soute et Outils agricoles gardent leurs effets précédents. Proposition de durée initiale des actions agricoles et transferts : une seconde par appel réussi ou impossible, hors capteurs. Les valeurs restent à tester.

Pour cette version, le type utilisé pour les collisions est le milieu de déplacement : terrestre ou aérien. Fermiers et transporteurs sont terrestres et se percutent entre eux ; les drones se percutent entre eux. Un drone peut survoler un robot terrestre. Deux unités incompatibles arrivant à la même case explosent ; un échange simultané de cases compte comme une collision. Aucun bonus de vitesse ne retire cette règle.

Une explosion détruit le robot et sa cargaison mais conserve code, recherches, or et dépôts. La carcasse permet une reconstruction avec l'atelier. Si aucun robot capable de planter et récolter n'est disponible, le shop prête un unique fermier de secours non vendable, deux fois plus lent, pour permettre de repartir. Ce prêt ne se cumule pas et se termine après le remplacement du fermier.

## 7. Bâtiments achetables et recherches associées

### Recherches ajoutées à Technologie

Les recherches consomment les matières indiquées, une seule fois pour toute la ferme. Elles débloquent les modèles au shop, sans offrir leur achat.

| Recherche | Coût | Prérequis | Effet |
|---|---|---|---|
| Meunerie | 150 blés + 100 bois | Construction | Moulin disponible dans le shop |
| Boulangerie | 300 blés + 200 bois + 100 carottes | Meunerie | Four disponible dans le shop |
| Scierie | 200 blés + 150 bois | Construction + Arbre 1 | Scierie disponible dans le shop |
| Compostage | 200 blés + 100 bois + 50 carottes | Construction + Consommables | Composteur disponible dans le shop |
| Commerce automatisé | 200 blés + 100 bois + 50 carottes | Construction + Fonctions | sell() : vente par programme depuis les dépôts |
| Maintenance | 400 blés + 250 bois + 100 carottes | Construction + Flotte | Atelier disponible dans le shop |
| Mécanisation 1 | 300 bois + 150 carottes | Meunerie | Durée des cycles des bâtiments de transformation ×0,75 |
| Mécanisation 2 | 1 500 bois + 600 carottes + 100 citrouilles | Mécanisation 1 | Durée des cycles ×0,5 par rapport à la base |
| Terrain constructible 4 | 6 000 blés + 2 000 bois + 800 carottes | Terrain constructible 3 | +8 emplacements, soit 16 au total |


### Catalogue des bâtiments

Chaque bâtiment occupe une case de construction, de taille 1 × 1.

| Bâtiment | Prix par exemplaire | Recherche nécessaire | Fonctionnement |
|---|---|---|---|
| Dépôt | 100 or | Construction | Stocke les ressources et consommables. Capacité par bâtiment : 200 / 500 / 2 500 / 10 000 selon Stockage. |
| Puits | 150 or | Réservoir fixe 1 | Produit 1 unité d'eau par seconde ; réserve de 100 unités, puis 300 au niveau 2. |
| Citerne | 120 or | Réservoir fixe 1 | Stocke 400 unités d'eau, puis 1 200 au niveau 2. Ne produit pas d'eau. |
| Moulin | 300 or | Meunerie | Transforme 5 blés en 1 farine en 6 secondes. |
| Four | 450 or | Boulangerie | Transforme 2 farines + 1 bois en 1 pain en 10 secondes. |
| Scierie | 350 or | Scierie | Transforme 5 bois en 2 planches en 10 secondes. |
| Composteur | 400 or | Compostage | Transforme 5 blés + 2 carottes en 1 engrais en 12 secondes. |
| Atelier de réparation | 800 or | Maintenance | Permet de reconstruire un robot détruit pour 40 % de son prix neuf. |


### Fonctionnement et placement

- Les robots restent sur une case adjacente pour transférer de l'eau, des ressources ou des marchandises. Les bâtiments occupés sont des obstacles ; les cultures n'empêchent pas de traverser une case agricole.
- Le puits et les citernes reliés orthogonalement forment un réseau d'eau partagé. La citerne n'augmente pas le débit du puits, seulement la capacité. Réservoir fixe 2 triple la capacité des puits et citernes.
- Une machine de transformation possède un tampon de 50 unités d'entrée et un tampon de 50 unités de sortie, distincts des dépôts.
- Le robot livre les ingrédients. Le bâtiment commence un cycle automatiquement si les ingrédients et la place de sortie sont disponibles.
- Les ingrédients sont consommés au début du cycle ; le produit apparaît à la fin. Si la sortie est pleine, aucun nouveau cycle ne consomme de ressources.
- Le robot récupère la sortie puis la dépose avant vente ou réutilisation.
- Les produits présents dans une machine ne sont pas disponibles pour les achats de recherche, les ventes ou les livraisons de mission avant récupération et dépôt.
- Mécanisation agit sur moulin, four, scierie et composteur ; elle ne modifie ni le débit des puits ni les capacités de stockage.
- L'atelier reconstruit uniquement une carcasse existante et la consomme : fermier 100 or, transporteur 240 or, drone 400 or. L'opération est lancée dans l'interface et remet le robot sur une case libre valide.
- Les bâtiments peuvent être déplacés pendant une pause, lorsqu'ils sont vides et sans cycle en cours. Leur déplacement ou achat constitue une intervention pendant les défis autonomes.
- Un bâtiment ou robot intact peut être revendu à 50 % de son prix d'achat. Le fermier de secours ne peut pas être vendu.
- Terrain constructible 4 permet 16 emplacements, nécessaires pour combiner stockage de fin de partie et industrie.

### Valeur des transformations

| Recette | Valeur de vente des ingrédients | Valeur de vente du produit | Gain par cycle avant transport |
|---|---|---|---|
| 5 blés → 1 farine | 5 or | 8 or | +3 or |
| 2 farines + 1 bois → 1 pain | 19 or | 25 or | +6 or |
| 5 bois → 2 planches | 15 or | 24 or | +9 or |
| 5 blés + 2 carottes → 1 engrais | 17 or | 18 or | +1 or |

L'engrais est surtout intéressant pour un usage agricole : le fabriquer évite son achat à 25 or. Acheter un engrais pour le revendre fait perdre 7 or. Les recettes ne permettent pas de revenir aux ingrédients : pas de boucle de transformation réversible.

## 8. Missions : tutoriel et campagne complète

### Règles de validation et de récompense

- 56 missions définies : 8 de tutoriel, 40 autres missions principales et 8 exercices avancés facultatifs.
- Les premières missions présentent un objectif court et une seule idée nouvelle. Les listes et structures avancées disposent de séries plus longues.
- Les missions principales guident le joueur mais ne bloquent pas les achats déjà accessibles dans les arbres.
- Une mission demandant une recherche déjà acquise valide immédiatement cette sous-étape. Les rendements et capacités supérieurs sont acceptés.
- Les objectifs « produire », « récolter », « déposer » et « vendre » suivent des compteurs distincts. Un transfert ou une récompense ne crée jamais de nouvelle production.
- Sauf prérequis d'état déjà acquis, les quantités sont comptées après l'activation de la mission. Les fenêtres d'un défi sont remises à zéro lors de sa relance.
- Les missions pédagogiques peuvent imposer une notion, mais cette notion doit contribuer au résultat. Les défis libres acceptent toutes les solutions avec les capacités débloquées.
- « Produire et déposer » demande des produits nouveaux issus de l'activité de la mission. Un simple chargement/déchargement répété ne compte pas.
- Une mission de livraison consomme explicitement les ressources remises ; les missions de production et d'observation ne les consomment pas.
- « Sans intervention » interdit les transferts manuels, modifications de code, placements, achats et déplacements de bâtiments pendant l'essai. Le lancement et le réglage de la vitesse n'invalident pas l'essai. Une pause de consultation est autorisée, sans action sur le monde ni l'éditeur.
- Les seuils chronométrés utilisent le temps de simulation à vitesse ×1 ; accélérer l'affichage ne change pas le résultat.
- Chaque récompense n'est remise qu'une fois par sauvegarde. Rejouer un exercice ne la duplique pas.
- Les récompenses vont dans les dépôts. Si la place manque, le solde reste à réclamer, sans expiration ; il n'est ni vendable ni utilisable avant dépôt. La mission suivante peut s'ouvrir avant cette réclamation.
- Les missions du tutoriel peuvent surligner l'éditeur, une case ou le shop et proposer trois indices progressifs. Elles ne demandent pas de recopier une solution unique.
- Un exercice de collision utilise une simulation isolée pour éviter d'imposer une destruction réelle.

### Parcours

Tutoriel → Agriculture → Construction et eau → Programmation → Transformation → Flotte → Maîtrise.

Après Flotte, la branche Programmation avancée s'ouvre en parallèle. Elle n'est pas requise pour terminer la campagne principale.

### Tutoriel — premiers programmes

| ID | Mission | Objectif | Récompense | Prérequis de mission |
|---|---|---|---|---|
| T01 | Première pousse | Planter du blé, attendre sa maturité et réussir une récolte. | 4 blés | Départ |
| T02 | Rentrer la récolte | Déposer 5 blés au dépôt initial. | 8 blés | T01 |
| T03 | Le travail à votre place | Déposer 20 blés récoltés par une boucle while, sans action manuelle après lancement. | 10 blés | T02 |
| T04 | Un meilleur rendement | Acheter au moins Blé 2 puis récupérer au moins 5 unités d'une nouvelle plantation. | 10 blés | T03 |
| T05 | Première vente | Acheter print(), afficher un message et vendre 10 blés pour obtenir 10 or. | 15 blés | T04 |
| T06 | Récolter au bon moment | Acheter Conditions 1 et Capteur de maturité ; réussir 10 appels harvest() sans tentative sur une plante immature. | 20 blés | T05 |
| T07 | Trois cases à exploiter | Acheter l'extension 3 × 1 puis faire visiter les trois cases au robot. | 20 blés | T06 |
| T08 | Savoir où l'on est | Acheter Variables et Positionnement ; mémoriser puis afficher les coordonnées de trois cases différentes. | 30 blés | T07 |

Précisions :

- **T01** : Découvrir plant() et harvest().
- **T02** : Découvrir deposit() et la différence entre cargaison et stock.
- **T03** : La boucle doit participer réellement à la production.
- **T04** : Les anciennes plantations gardent leur ancien rendement.
- **T05** : Les 10 or proviennent de la vente ; ce n'est pas une récompense supplémentaire.
- **T06** : Le contrôle avec if et can_harvest() doit contribuer au résultat.
- **T07** : Découvrir move() et les bords du terrain.
- **T08** : Introduire let/const, number et les capteurs de position.

### Agriculture — diversifier la ferme

| ID | Mission | Objectif | Récompense | Prérequis de mission |
|---|---|---|---|---|
| A01 | Le premier bois | Débloquer les buissons et déposer 20 bois issus de leurs récoltes. | 30 blés + 5 bois | T08 |
| A02 | Une production améliorée | Acheter Buisson 2 puis déposer 30 bois nouvellement récoltés. | 50 blés + 10 bois | A01 |
| A03 | Préparer la terre | Acheter Labourage et transformer trois cases vides en Grounds.Soil. | 20 blés + 10 bois | A02 |
| A04 | Premières carottes | Débloquer les carottes, charger les ressources de plantation et déposer 20 carottes récoltées. | 30 blés + 10 bois + 5 carottes | A03 |
| A05 | Laisser de la place | Débloquer les arbres et récolter 30 bois sur des arbres n'ayant aucun voisin arbre orthogonal pendant leur croissance. | 50 blés + 20 bois | A04 |
| A06 | La première parcelle carrée | Acheter l'extension 3 × 3 et visiter ses neuf cases. | 100 blés + 30 bois | A05 |
| A07 | Observer avant d'agir | Acheter Analyse de la parcelle ; réaliser 15 plantations réussies guidées par le sol et l'occupation, sans échec pour mauvais sol. | 50 blés + 25 bois | A06 |
| A08 | Une ferme diversifiée | Dans une même exécution, récolter et déposer 100 blés, 30 bois et 20 carottes. | 100 blés + 50 bois + 20 carottes | A07 |

Précisions :

- **A01** : Buisson 1 demande Blé 2.
- **A03** : till() ne doit pas détruire une culture.
- **A04** : Apprendre load() ; les graines ne sont pas prélevées à distance dans les dépôts.
- **A05** : Une ligne de trois cases permet déjà de planter aux deux extrémités.
- **A07** : Introduire get_entity_type() et get_ground_type().

### Construction et eau — équiper l'exploitation

| ID | Mission | Objectif | Récompense | Prérequis de mission |
|---|---|---|---|---|
| E01 | Un second dépôt | Acheter Construction et un emplacement constructible ; acheter un dépôt au shop et y déposer 20 unités. | 50 bois + 20 carottes | A08 |
| E02 | Préparer la croissance | Acheter Stockage 2 puis Stockage 3 : les deux dépôts doivent offrir au moins 5 000 unités de capacité totale. | 100 blés + 50 bois + 30 carottes | E01 |
| E03 | Trouver de l'eau | Acheter Réservoir fixe, obtenir un troisième emplacement et acheter un puits ; lui faire produire 20 unités d'eau. | 100 blés + 50 bois | E02 |
| E04 | Le premier arrosage | Acheter Réservoir embarqué et Arrosage 1 ; remplir le robot au puits et réussir 10 arrosages. | 100 blés + 50 bois + 20 carottes | E03 |
| E05 | Ni trop, ni trop peu | Acheter Capteur d'humidité ; réussir 20 arrosages déclenchés avec une humidité inférieure à 0,5, puis récolter 20 carottes. | 150 blés + 60 bois + 30 carottes | E04 |
| E06 | Un coup de pouce | Acheter Consommables et Engrais 1 ; acheter puis utiliser trois engrais sur des cultures en croissance. | 3 engrais + 100 blés + 30 carottes | E05 |

Précisions :

- **E01** : Le bâtiment s'achète 100 or ; vendre des récoltes si nécessaire.
- **E02** : Cette étape évite de bloquer les prochaines recherches faute de capacité.
- **E03** : Acheter Terrain constructible 2 si nécessaire.
- **E05** : Les recharges d'eau doivent être gérées par le programme.
- **E06** : Chaque engrais d'essai coûte 25 or dans le shop.

### Programmation — des outils réutilisables

| ID | Mission | Objectif | Récompense | Prérequis de mission |
|---|---|---|---|---|
| P01 | Mesurer et convertir | Acheter len() et str() ; calculer une longueur, la convertir et afficher le résultat correct avec print(). | 50 blés + 20 bois | E06 |
| P02 | Parcourir sans recopier | Acheter for et range() ; visiter les neuf cases en utilisant des boucles comptées. | 100 blés + 40 bois | P01 |
| P03 | Votre première fonction | Acheter Fonctions ; créer une routine agricole avec un paramètre typé et l'appeler utilement sur trois cases. | 100 blés + 50 bois + 20 carottes | P02 |
| P04 | Renvoyer un résultat | Créer une fonction avec un retour boolean, puis utiliser ce retour pour compter ou décider après 20 récoltes réussies. | 150 blés + 60 bois + 20 carottes | P03 |
| P05 | Une première liste | Acheter Listes 1 ; créer avec list() un tableau contenant trois cultures et parcourir ses éléments. | 150 blés + 75 bois + 30 carottes | P04 |
| P06 | Un programme de plantation | Utiliser une liste pour choisir les cultures de plusieurs cases et déposer 30 blés, 15 bois et 10 carottes. | 200 blés + 100 bois + 50 carottes | P05 |

Précisions :

- **P02** : La visite doit dépendre des boucles, pas d'une suite de déplacements recopiés.
- **P05** : L'exercice comporte création, indexation, len(), push() et pop() ; une seule création est insuffisante.
- **P06** : Le tableau doit guider les plantations réellement exécutées.

### Transformation — produire des marchandises

| ID | Mission | Objectif | Récompense | Prérequis de mission |
|---|---|---|---|---|
| I01 | Du grain à la farine | Acheter Meunerie, acheter un moulin, lui livrer du blé et récupérer 10 farines. | 50 blés + 20 bois | P06 |
| I02 | Du pain pour le village | Acheter Boulangerie, acheter un four et récupérer 5 pains produits avec farine et bois. | 50 bois + 30 carottes | I01 |
| I03 | La valeur du travail | Vendre 10 pains au shop : recette de vente de 250 or. | 100 blés + 30 bois | I02 |
| I04 | Du bois aux planches | Acheter Scierie, acheter le bâtiment et récupérer 20 planches. | 10 planches + 50 bois | I03 |
| I05 | Fabriquer ses engrais | Acheter Compostage, acheter un composteur et récupérer 5 engrais fabriqués sur place. | 5 engrais + 30 carottes | I04 |
| I06 | Une chaîne complète | Acheter Commerce automatisé puis faire produire, récupérer, déposer et vendre 10 pains sans intervention manuelle après lancement. | 200 blés + 100 bois + 50 carottes | I05 |
| I07 | Les citrouilles | Acheter Carotte 2 puis Citrouille 1 ; récolter et déposer 30 citrouilles. | 100 carottes + 10 citrouilles | I06 |
| I08 | Récolter ensemble | Acheter Récolte groupée 1 ; appliquer le bonus à un carré mûr de 2 × 2 et récupérer sa récolte, au moins 24 citrouilles. | 100 carottes + 30 citrouilles | I07 |

Précisions :

- **I01** : Les livraisons et récupérations sont effectuées par le robot.
- **I02** : Prévoir Terrain constructible 3 pour disposer d'assez d'emplacements.
- **I03** : Les 250 or sont le prix de vente, pas une prime supplémentaire.
- **I06** : Les ingrédients préparés avant lancement sont autorisés ici. Le programme alimente les bâtiments et appelle sell() ; leurs cycles sont automatiques.
- **I08** : Au niveau 1 : quatre cultures de rendement 4 avec +50 % donnent 24. Les niveaux supérieurs sont acceptés.

### Flotte — coordonner plusieurs programmes

| ID | Mission | Objectif | Récompense | Prérequis de mission |
|---|---|---|---|---|
| R01 | Un deuxième fermier | Acheter Circulation 1 et Flotte ; acheter un second robot fermier. Chaque robot doit déposer 10 blés. | 100 blés + 50 bois | I08 |
| R02 | Chacun sa zone | Faire produire simultanément 50 blés et 30 bois par deux robots affectés à des zones distinctes, sans collision. | 200 blés + 100 bois | R01 |
| R03 | Le spécialiste du transport | Acheter Transporteur et le robot correspondant ; déplacer 100 unités d'un dépôt local vers le dépôt central par programme. | 200 blés + 100 bois + 50 carottes | R02 |
| R04 | Comprendre une collision | Dans un exercice simulé, constater une collision de deux unités terrestres puis corriger leurs trajets et réussir dix passages. | 100 bois | R03 |
| R05 | Partager un passage | Acheter Circulation 2 ; faire réussir 30 traversées d'un passage commun par deux robots, en utilisant les réservations et sans collision. | 300 blés + 150 bois + 100 carottes | R04 |
| R06 | Prendre de la hauteur | Acheter Drone et un drone ; faire arroser trois cases par le drone pendant qu'un fermier y produit 20 carottes. | 300 blés + 150 bois + 100 carottes | R05 |

Précisions :

- **R01** : Les robots sont achetés avec l'or du shop ; aucun robot n'est offert par la mission.
- **R03** : Acheter un troisième dépôt si nécessaire. Le transporteur charge et dépose ; il ne récolte pas.
- **R04** : La simulation emploie des copies sans perte dans la sauvegarde principale.
- **R06** : Le drone et le robot terrestre peuvent survoler/occuper les mêmes coordonnées.

### Programmation avancée — parcours facultatif plus long

| ID | Mission | Objectif | Récompense | Prérequis de mission |
|---|---|---|---|---|
| S01 | Des décisions combinées | Acheter Conditions 2 ; utiliser utilement des conditions combinées pour réaliser 30 actions agricoles adaptées à l'état du sol et des stocks. | 200 blés + 100 bois | R06 |
| S02 | Décrire ses parcelles | Acheter Objets ; représenter trois zones par des objets puis utiliser leurs propriétés pour réaliser 20 plantations. | 300 blés + 150 bois + 60 carottes | S01 |
| S03 | Un contrat de données | Acheter Modélisation ; définir une interface Zone et faire exploiter deux zones correctement typées par une même fonction. | 400 blés + 200 bois + 100 carottes | S02 |
| S04 | Filtrer et préparer | Acheter Listes 2 ; utiliser filter() et map() pour créer un plan de travail, puis exécuter au moins 20 actions issues de ce plan. | 500 blés + 200 bois + 100 carottes | S03 |
| S05 | Une carte dans le code | Acheter Listes 3 et disposer d'au moins 4 × 4 cases ; représenter la ferme par une matrice et exécuter son plan sur 16 cases. | 800 blés + 300 bois + 150 carottes + 30 citrouilles | S04 |
| S06 | Ne pas travailler deux fois | Acheter Map et Set ; mémoriser des informations de parcelles et visiter 16 cases sans doublon pendant un cycle. | 800 blés + 400 bois + 200 carottes | S05 |
| S07 | Un outil générique | Acheter Génériques ; écrire une fonction générique et l'utiliser avec trois types de données, sans any. | 1 000 blés + 500 bois + 250 carottes + 50 citrouilles | S06 |
| S08 | Un plan priorisé | Utiliser sort() pour prioriser le travail et reduce() pour calculer un bilan ; exécuter 30 actions suivant ce plan et afficher le bilan réel. | 1 500 blés + 600 bois + 300 carottes + 100 citrouilles | S07 |

Précisions :

- **S07** : La capacité des dépôts doit permettre la recherche ; Stockage 4 peut être nécessaire.

### Maîtrise — une exploitation autonome

| ID | Mission | Objectif | Récompense | Prérequis de mission |
|---|---|---|---|---|
| F01 | Une vraie exploitation | Acheter successivement les extensions 4 × 4 et 5 × 5 ; exploiter au moins 20 cases. | 500 blés + 200 bois + 100 carottes | R06 |
| F02 | Un terrain bien utilisé | Maintenir 25 cases cultivées avec au moins trois cultures et terminer un cycle de récolte sur chacune. | 800 blés + 400 bois + 200 carottes | F01 |
| F03 | De la terre au produit fini | Sans intervention après lancement, produire et déposer 20 pains, 20 planches et 5 engrais à partir des récoltes de la ferme. | 1 000 blés + 500 bois + 250 carottes + 50 citrouilles | F02 |
| F04 | Moins de déplacements | Dans un scénario fixe, récolter et déposer 100 blés, 30 bois et 20 carottes avec au plus 120 déplacements réussis. | 1 500 blés + 600 bois + 300 carottes | F03 |
| F05 | Préparer la grande ferme | Acheter Terrain constructible 4, disposer d'au moins 70 000 unités de stockage et atteindre l'extension 7 × 7. | 2 000 blés + 1 000 bois + 500 carottes + 100 citrouilles | F04 |
| F06 | La ferme autonome | Avec au moins cinq robots dont un drone et un transporteur, produire puis déposer en 180 secondes 600 blés, 200 bois, 150 carottes et 10 pains, sans collision ni intervention. | Titre « Architecte agricole » + apparence de robot + 3 000 blés + 1 500 bois + 750 carottes + 150 citrouilles | F05 |

Précisions :

- **F03** : Les produits et ingrédients déjà disponibles au départ ne comptent pas comme nouvelle production.
- **F04** : Seuil provisoire à vérifier en prototype ; même terrain, mêmes unités et mêmes niveaux pour tous.
- **F05** : Sept dépôts au niveau 4 suffisent ; la recherche 7 × 7 coûte au total 61 500 unités de ressources.
- **F06** : Seuil provisoire ; la préparation est libre avant le lancement. Les récoltes déjà mûres, stocks et produits initiaux ne comptent pas.

## 9. API ajoutée pour l'industrie et le commerce

Ces commandes complètent l'API agricole existante. Chaque transfert vise une case adjacente donnée par une direction.

| Commande | Retour | Comportement | Accès |
|---|---|---|---|
| deliver(direction, item, quantity) | number | Livre depuis la soute vers l'entrée du bâtiment ciblé ; renvoie la quantité réellement transférée. | Construction ; bâtiment et recette débloqués |
| collect(direction, item, quantity) | number | Récupère une sortie de machine dans la soute ; renvoie la quantité réellement récupérée. | Construction |
| get_building_stock(direction, item) | number | Quantité de cet élément dans les tampons du bâtiment adjacent. | Construction |
| get_building_status(direction) | string ou null | working, missing_input, output_full ou idle ; null si la case ne contient pas de bâtiment de transformation. | Construction |
| sell(item, quantity) | number | Vend depuis les dépôts au prix fixe et crédite l'or ; renvoie le nombre d'unités effectivement vendues. | Commerce automatisé |
| get_gold() | number | Solde d'or disponible de la ferme. | Départ |


Dans les signatures TypeScript, item est de type Resources | Items, direction de type Direction et quantity de type number (entier positif). get_building_status() renvoie une union de chaînes ou null. Les commandes de transfert ne prennent que la quantité disponible dans la limite de capacité ; une quantité transférée nulle ne consomme aucune ressource. Les capteurs ne prennent pas de temps agricole ; les transferts et ventes programmées prennent une durée d'action.

Nouvelles constantes : Resources.Flour, Resources.Bread et Resources.Plank. Items.Fertilizer reste le même objet pour l'achat, la fabrication, le stockage et l'utilisation.

La fabrication ne se déclenche pas avec une nouvelle fonction craft() : le robot livre les ingrédients et la machine travaille automatiquement. Cela permet d'apprendre la coordination sans ajouter une commande par recette.

## 10. Commandes commerciales renouvelables

Ce sont des ventes à prix majoré, pas des cadeaux d'or. Les marchandises livrées sont retirées des dépôts à la validation. Une seule commande de chaque type est disponible par période de dix minutes de simulation ; aucune pénalité si le joueur l'ignore.

| Commande | Livraison consommée | Paiement de vente | Prix normal de la même quantité |
|---|---|---|---|
| Le marché du village | 100 blés | 110 or | 100 or |
| Le charpentier | 30 bois | 100 or | 90 or |
| La soupe du jour | 20 carottes | 135 or | 120 or |
| La boulangerie du village | 10 pains | 275 or | 250 or |
| La rénovation de la grange | 20 planches | 265 or | 240 or |


Les livraisons de commandes ne se cumulent pas avec une vente normale des mêmes unités. Les commandes apparaissent selon les productions déjà débloquées et peuvent être livrées par interface. L'automatisation des commandes commerciales restera une extension ultérieure ; sell() utilise le tarif normal.

## 11. Cohérence et équilibrage restant à tester

### Vérifications de conception effectuées

- Tous les identifiants de mission sont uniques et tous les prérequis de mission existent.
- Les prérequis de mission ne forment pas de boucle ; les exercices facultatifs ne bloquent pas la campagne principale.
- Blé et buissons gratuits assurent une production de secours ; un prêt de robot évite une impasse après destruction de tous les fermiers.
- Les recherches de stockage sont introduites avant les achats dont le coût total dépasse 200 unités.
- Stockage 3 sur deux dépôts donne 5 000 unités, assez pour les premières recherches de listes et l'industrie.
- La recherche de généricité coûte 8 200 unités ; Stockage 4 et les dépôts supplémentaires la rendent accessible.
- La recherche 7 × 7 demande 61 500 unités ; sept dépôts niveau 4 donnent 70 000 unités. Terrain constructible 4 fournit assez de cases pour ce stockage et plusieurs bâtiments industriels.
- Les marges de vente des recettes sont positives ; l'achat-revente d'engrais est déficitaire.
- Les produits fabriqués, transferts et récompenses ne sont pas comptés comme des récoltes nouvelles.
- Aucun développement, test de moteur ou test de jouabilité n'a encore été effectué.

### À vérifier avec un prototype

- Durée réelle du tutoriel et attente entre les premiers achats.
- Rendement par minute et prix des robots après optimisation.
- Seuil de 120 déplacements du scénario F04 et objectif de 180 secondes de F06.
- Emplacement des cases constructibles, accès aux bâtiments et congestion.
- Vitesse des machines et valeur du bois comme combustible.
- Montants des récompenses et rythme des recherches avancées.
- Prix des extensions agricoles au-delà de 7 × 7.
