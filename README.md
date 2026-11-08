# FarmScript 🌱

Un jeu de farming pour apprendre TypeScript : ferme low poly, robots programmables, éditeur Monaco et sauvegarde locale. Le document source est conservé dans [docs/CONCEPTION.md](docs/CONCEPTION.md), version de conception du 8 novembre 2026. Sa mention « aucun développement engagé » décrit cet ancien état de conception, pas l’état actuel du code.

## Développement

Node.js 22 ou 24 et npm, sans secret ni service externe.

```sh
npm ci
npm run dev
```

Ouvrir http://localhost:5173 et garder le terminal ouvert. `Ctrl+C` arrête le serveur. Si un ancien essai utilisait le chemin cloud `/workspace/.npm-cache`, relancer `npm ci --cache "$HOME/.npm"` depuis le projet.

```sh
npm test
npm run build
```

Tests navigateur, serveur lancé dans un autre terminal : `npm run test:e2e`. Ils utilisent `/usr/bin/chromium`, personnalisable avec `CHROMIUM_PATH`, et `FARM_URL` (défaut : port 5173). Sur Mac, on peut par exemple définir `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`. Les trois parcours vérifient le programme initial, les erreurs TypeScript, les sauvegardes, les parcelles et la caméra, les arbres de compétences, le shop et deux programmes de robots simultanés. Les captures sont écrites dans `/tmp`.

## Jouer

La partie commence avec **0 or, un fermier terrestre gratuit, une parcelle et un dépôt gratuit adjacent**. Le fermier est un laboureur sur roues avec outil avant, sans hélices. Sa soute de base contient **10 unités**, conformément au document. Le dépôt contient 200 unités au total, toutes ressources confondues.

```ts
while (true) {
  harvest();
  plant(Entities.Wheat);
  deposit();
}
```

Le blé pousse en 5 secondes de simulation. Les appels agricoles et transferts prennent une seconde de base, même quand l’action est impossible ; les capteurs ne prennent pas de temps agricole. Chaque boucle rend la main à l’interface. La simulation et les actions sont suspendues pendant la pause, sans rattrapage hors ligne.

- Glisser sur le champ pour tourner autour à 360° et changer son inclinaison. Molette ou pincement pour zoomer ; maison pour recentrer.
- Le plateau affiche uniquement les parcelles débloquées : 1 × 1, puis 3 × 1, 3 × 3, jusqu’à 7 × 7. Les cellules sont carrées dans le modèle 3D ; leur projection dépend de l’angle de vue. Les coordonnées et cultures existantes sont conservées lors des extensions.
- Les emplacements constructibles sont débloqués séparément et ont un sol en bois, distinct de la zone agricole.
- Le bouton + affiche l’éditeur, masqué initialement sur mobile. Choisir un robot dans l’éditeur pour modifier son programme. Chaque robot exécute son propre programme ; les autres continuent pendant le changement de sélection.
- La barre du programme lance, suspend ou arrête son exécution. ×1 / ×2 / ×5 règle le temps de simulation. La pause s’applique à toute la ferme ; le shop permet aussi de suspendre la simulation sans lancer un robot.
- Le bouton i ouvre le guide et l’API ; les chevrons ouvrent les trois pages de recherches ; le panier ouvre le shop ; la carte de mission ouvre les objectifs.

Les anciennes sauvegardes sont migrées automatiquement. Le blé, la cargaison, les cultures, le code, les recherches et l’or sont conservés. Une ancienne cargaison supérieure aux nouvelles 10 unités n’est pas détruite : déposez-la avant de récolter davantage. Les processus ne sont pas relancés automatiquement après rechargement.

## Shop et économie

Les recherches consomment les matériaux déposés ; les achats du shop consomment l’or. Un bâtiment n’exige aucun second paiement de matériaux après sa recherche. Le shop est accessible dès le départ, sans bâtiment commercial.

- **Vendre** : blé 1 or, bois 3, carotte 6, citrouille 12, farine 8, pain 25, planche 12 et engrais 18. Seuls les stocks des dépôts sont vendus, jamais les soutes ni les machines. Les marchandises ne sont pas achetables et l’eau n’est pas vendable.
- **Robots** : fermier 250 or (1 case/s, soute 10), transporteur 600 or (0,75 case/s, soute 100), drone 1 000 or (2 cases/s, soute 10). Les recherches Flotte, Transporteur et Drone débloquent les achats correspondants. Une case de départ libre dans le bon milieu est requise. Seul le fermier peut planter, récolter et labourer ; le drone peut transporter, arroser et appliquer de l’engrais. Le transporteur se limite aux transferts.
- **Bâtiments** : dépôt 100 or, puits 150, citerne 120, moulin 300, four 450, scierie 350, composteur 400 et atelier 800. Chaque achat choisit un emplacement libre débloqué ; un bâtiment occupé bloque les déplacements.
- **Consommables** : engrais 25 or après Consommables, livré aux dépôts s’ils ont de la place. L’effet demande aussi la recherche Engrais et un chargement dans la soute.
- **Mon exploitation** : choisir un robot à programmer, inspecter les stocks et machines, revendre un achat intact à 50 % de son prix payé, déplacer un bâtiment vide pendant une pause, ou reconstruire une carcasse avec un atelier. Pour éviter une perte de ressources, il faut vider l’objet avant revente ou déplacement. Le dépôt initial est conservé pour éviter une impasse.

Les cinq commandes commerciales du document consomment leurs marchandises et paient le tarif majoré. Chaque type est livrable une fois par période de 600 secondes de simulation, sans pénalité si ignoré. Elles ne se cumulent pas avec une vente normale des mêmes unités.

## Agriculture, bâtiments et flotte

Les cinq cultures sont implémentées : blé, buisson, carotte, arbre et citrouille. Leurs recherches, rendements, sols, temps et coûts de plantation suivent le document. Les graines payantes proviennent de la soute, uniquement après une plantation réussie. Les arbres voisins orthogonaux ralentissent leur pousse. Les rendements restent figés à la plantation et une récolte trop volumineuse reste partiellement sur la case. Arrosage, engrais et récolte groupée ont leurs effets et prérequis propres.

Les dépôts additionnent leurs capacités, mais chaque dépôt possède son inventaire et ses transferts locaux. Stockage passe de 200 à 500, 2 500 puis 10 000 unités par dépôt. Les emplacements constructibles passent de 1 à 2, 4, 8 puis 16.

Les réseaux d’eau relient orthogonalement puits et citernes. Chaque puits produit 1 eau/s ; une citerne ajoute de la capacité sans augmenter le débit. Les robots remplissent leur réservoir distinct auprès d’un bâtiment d’eau adjacent.

Les quatre recettes fonctionnent automatiquement après livraison :

| Machine    | Entrée              | Sortie     | Durée de base |
| ---------- | ------------------- | ---------- | ------------- |
| Moulin     | 5 blés              | 1 farine   | 6 s           |
| Four       | 2 farines + 1 bois  | 1 pain     | 10 s          |
| Scierie    | 5 bois              | 2 planches | 10 s          |
| Composteur | 5 blés + 2 carottes | 1 engrais  | 12 s          |

Les tampons d’entrée et sortie font chacun 50 unités. Les ingrédients sont consommés au début d’un cycle seulement si la sortie a de la place. Mécanisation réduit la durée des machines, sans augmenter les débits d’eau. Les produits doivent être collectés puis déposés avant vente ou paiement d’une recherche.

Exemple, avec un moulin construit au sud du robot et les recherches correspondantes :

```ts
load(Resources.Wheat, 5);
deliver(Direction.South, Resources.Wheat, 5);
while (get_building_status(Direction.South) === "working") {}
collect(Direction.South, Resources.Flour, 1);
deposit();
```

Les collisions terrestres concernent fermiers et transporteurs ; les drones peuvent survoler ces unités mais se percutent entre eux. Les arrivées sur une même case et les échanges de cases se percutent. Une collision détruit le robot et son chargement, en conservant son programme, l’or, les recherches et les dépôts. `reserve()` réserve atomiquement la prochaine case pour cinq secondes maximum ; arrêt et déplacement libèrent la réservation.

Après perte du dernier fermier, un unique fermier de secours non vendable et deux fois plus lent permet de repartir. Il est retiré lors de l’achat ou de la reconstruction d’un fermier ; sa cargaison est transférée. L’atelier reconstruit uniquement une carcasse existante pour 100 / 240 / 400 or selon le modèle.

## Architecture et limites actuelles

- `src/catalog.ts` : catalogue et prix issus du document, recherches implémentées, recettes, modèles, cultures et commandes commerciales.
- `src/engine.ts` : état de la ferme, migration, actions, achats, stocks locaux, cycles, eau, déplacements, collisions et réparation. Tests dans `src/engine.test.ts` et `src/shop.test.ts`.
- `src/FarmScene.tsx` : caméra orbitale et modèles 3D procéduraux originaux des robots, cultures et bâtiments, sans assets téléchargés.
- `src/Shop.tsx` : catalogue du shop, achats, ventes, placement et gestion des biens.
- `src/SkillTree.tsx` : trois pages d’arbres reliés. Les recherches implémentées sont achetables ; les branches encore prévues restent « À venir ».
- `src/api.ts` : API typée injectée dans Monaco et partagée avec le runtime.
- `src/runner.worker.ts` : transpilation TypeScript et instrumentation des boucles et appels dans un Worker ; chaque robot a un runtime indépendant.

Le **catalogue du shop** et ses systèmes associés sont implémentés ; la **campagne de 56 missions** n’est pas encore intégrée. Les quatre missions du prototype gardent des compteurs simplifiés et ne certifient pas l’emploi d’une notion pédagogique. L’accès aux constructions du langage n’est pas encore entièrement verrouillé selon l’arbre : Variables et Fonctions servent de prérequis de progression, mais leur syntaxe reste libre pour conserver les programmes existants. Les aides `range`, `list`, `len`, `str` et les branches de programmation avancée restent à venir.

Le runtime supporte boucles, conditions, variables et fonctions nommées. Il ne prend pas en charge les callbacks, générateurs ou imports. Monaco refuse le lancement d’un code présentant des erreurs TypeScript. Le Worker préserve la réactivité mais n’est pas une frontière de sécurité pour du code hostile : exécuter son propre code. La CSP limite les connexions distantes. Les prix et le rythme restent à équilibrer en jouant, comme le précise le document.
