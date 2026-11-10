# FarmScript 🌱

Un jeu de farming pour apprendre TypeScript : ferme low poly, robots programmables, éditeur Monaco et sauvegarde locale. Le document source est conservé dans [docs/CONCEPTION.md](docs/CONCEPTION.md), version de conception du 8 novembre 2026. Sa mention « aucun développement engagé » décrit cet ancien état de conception, pas l’état actuel du code.

## Développement

Node.js 22 ou 24, npm et PostgreSQL 16 (ou Docker Desktop pour le démarrer). L’API et le jeu sont écrits en TypeScript.

Depuis le dossier du projet :

```sh
npm ci
cp .env.example .env
docker compose up -d --wait db
npm run dev
```

Ne pas écraser un `.env` existant : renseigner les variables qui manquent. Le mot de passe de l’exemple est réservé au développement local. `DATABASE_URL` est lu uniquement par le serveur ; ne pas créer de variable `VITE_DATABASE_URL`.

Ouvrir http://localhost:5173. Vite transmet `/api` à l’API sur le port 3001. `npm run dev` démarre les deux processus ; `Ctrl+C` les arrête. PostgreSQL utilise un volume Docker persistant et n’est exposé que sur `127.0.0.1:5432`. `docker compose stop db` conserve les données ; ne pas supprimer le volume pour arrêter la base.

Avec une base PostgreSQL déjà installée, renseigner sa `DATABASE_URL` dans `.env` et ignorer la commande Docker. Les migrations SQL sont appliquées automatiquement au démarrage de l’API ; `npm run db:migrate` permet de les appliquer séparément. Si seul le frontend est nécessaire, `npm run dev:web` conserve le mode local, avec un état serveur indisponible si l’API ne tourne pas.

Si un ancien essai utilisait `/workspace/.npm-cache`, relancer `npm ci --cache "$HOME/.npm"` depuis le projet.

```sh
npm test
npm run test:server
npm run build
```

`test:server` utilise une vraie base PostgreSQL et exige `TEST_DATABASE_URL` ou `DATABASE_URL`. Il crée des comptes de test uniques puis les supprime, sans vider les autres données. La CI démarre une base PostgreSQL dédiée pour ces vérifications.

Tests navigateur (API et frontend lancés dans un autre terminal) : `npm run test:e2e` pour les neuf parcours du jeu ; `npm run test:session` pour les comptes et sauvegardes. Ils utilisent `/usr/bin/chromium`, personnalisable avec `CHROMIUM_PATH`, et `FARM_URL` (défaut : port 5173). Sur Mac, définir par exemple `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`. Les captures sont écrites dans `/tmp`. Les tests de session créent un compte de test dans la base configurée.

En production : compiler avec `npm run build`, définir `DATABASE_URL` et `NODE_ENV=production`, puis lancer `npm start`. L’API sert aussi `dist/`, sur `PORT` (3001 par défaut). Un reverse proxy HTTPS doit conserver le nom d’hôte de la requête ; les cookies sont `Secure` en production. `HOST=0.0.0.0` est disponible pour un hébergement en conteneur. Les fichiers `.env` et les identifiants de base ne sont jamais inclus dans le bundle frontend.

## Équipements et économie exponentielle

Les coûts des cinq cultures doublant leur production sont désormais multipliés par **4** à chaque niveau : Arbre 10 coûte **19 660 800 foins**. Les équipements appartiennent à chaque robot et les améliorations à chaque bâtiment. Consultez [Économie et équipements](docs/ECONOMIE_ET_EQUIPEMENTS.md) pour les prix, les effets et la migration des anciennes parties.

## Arbres de recherche

Les arbres suivent le classeur fourni par le joueur : foin → While → Vitesse → plant()/move() → Buisson → Carottes → Arbre, avec eau passive, cultures jusqu’au niveau 10, terrain jusqu’à 10×10 et stockage payé en or. Les valeurs explicites, les choix pour les niveaux vides et les règles de compatibilité sont détaillés dans [REEQUILIBRAGE.md](docs/REEQUILIBRAGE.md). La source est conservée dans `docs/sources/amelioration.xlsx`.

Les améliorations à plusieurs niveaux sont regroupées sur une carte unique dans les arbres et les menus des robots. Le compteur indique le niveau acquis et le maximum ; le prix, l’effet et les prérequis concernent toujours le prochain palier. Expansion conserve ses 9 achats (1×1 → 10×10), tandis que les cultures montent jusqu’à 10 niveaux. Les niveaux de base gratuits de l’herbe et du stockage sont inclus dans leur compteur. Les anciens identifiants de recherche sont conservés dans les sauvegardes.

## Comptes, sessions et sauvegardes PostgreSQL

Le bouton **Session et sauvegarde**, en haut à droite, permet de créer un compte avec pseudo et mot de passe, se connecter et se déconnecter. Le pseudo accepte 3 à 24 lettres, chiffres, `_` ou `-`, sans distinction de casse. Les mots de passe font 10 à 128 caractères et sont hachés avec scrypt et un sel aléatoire. La récupération de mot de passe et la vérification par email ne sont pas encore proposées.

La session dure 30 jours d’inactivité et se renouvelle lors de l’utilisation. Elle repose sur un cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production. Le navigateur ne conserve aucun jeton de session dans localStorage ; la base ne conserve que l’empreinte du jeton. La déconnexion révoque cette session, sans déconnecter les autres appareils, et remet le navigateur en mode local avec une ferme vierge après enregistrement de la ferme du compte.

La sauvegarde automatique enregistre toutes les cinq secondes une photographie complète de la ferme : terrain, cultures, stocks par dépôt, or, robots et leurs programmes, machines et tampons, eau, recherches, missions et commandes. Les programmes ne sont pas relancés automatiquement à la reconnexion ; les processus ne sont pas des données de sauvegarde. Le même compte retrouve la même ferme sur un autre appareil.

- Sans compte, le jeu garde son mode local. La création d’un compte importe la ferme locale dans ce nouveau compte.
- Si un compte existant possède déjà une ferme différente, l’interface demande laquelle conserver. Il n’y a pas de fusion automatique des inventaires.
- Les écritures portent une révision PostgreSQL. Un onglet ou appareil périmé reçoit un conflit, conservé même après rechargement, plutôt que d’écraser silencieusement les autres changements. Un identifiant d’écriture permet de reconnaître une sauvegarde déjà reçue quand sa réponse réseau a été perdue.
- En cas de panne réseau, les changements restent dans la copie locale et reprennent leur synchronisation au retour du serveur. Si une autre session a progressé entre-temps, le conflit est signalé.
- L’interface permet aussi l’enregistrement manuel, le chargement de la version du compte et l’export JSON. Une copie temporaire de secours est créée dans le navigateur avant de remplacer une ferme.

Tables : `players` pour les comptes, `player_sessions` pour les sessions et `farm_saves` pour l’état complet en JSONB, sa révision et sa date de mise à jour. Les sauvegardes sont rattachées au compte, jamais à un identifiant de joueur fourni librement par le client. Les migrations sont versionnées dans `server/migrations/`. Les sauvegardes sont limitées à 2 Mo et la validation conserve les champs du jeu sans exécuter les programmes sauvegardés côté serveur.

Dans **Compte → Mes parties**, « Sauvegarder cette partie » crée une copie nommée de la ferme, avec ses robots, programmes, recherches et missions. « Nouvelle partie » démarre le tutoriel après avoir conservé automatiquement la ferme actuelle. « Reprendre » conserve également la partie en cours avant le chargement. Les programmes chargés restent arrêtés. Ces copies sont des points de reprise : pour conserver une version plus récente sous un nom, créez une nouvelle sauvegarde. Supprimer une copie ne supprime pas la partie actuellement ouverte.

Les copies d’un compte sont stockées dans `farm_slots` et accessibles sur ses autres appareils. Les copies créées en mode local restent dans ce navigateur, séparées de celles du compte ; elles ne sont pas importées automatiquement lors de la connexion. Un conflit ou une panne de synchronisation bloque le changement de partie pour protéger la ferme en cours. La migration `003_named_farm_slots.sql` est appliquée au démarrage de l’API (`npm run db:migrate` permet aussi de l’appliquer manuellement). Vérification navigateur : `npm run test:saves`.

Le volume PostgreSQL doit être sauvegardé comme toute base applicative. Exemple de sauvegarde locale, sans inclure le mot de passe dans une commande :

```sh
docker compose exec -T db pg_dump -U farmscript -d farmscript > farmscript-backup.sql
```

## Jouer

La partie commence avec **0 or, un fermier terrestre gratuit, une parcelle et un dépôt gratuit adjacent**. Le fermier est un laboureur sur roues avec outil avant, sans hélices. Sa soute de base contient **20 unités**, conformément au classeur d’améliorations. Le dépôt contient 200 unités au total, toutes ressources confondues.

Le premier programme récolte l’herbe déjà présente et dépose le foin :

```ts
harvest();
deposit();
```

Après 5 foins déposés, recherchez **Boucle while** pour automatiser cette séquence :

```ts
while (true) {
  harvest();
  deposit();
}
```

L’herbe repousse spontanément sur prairie en 0,5 seconde. Le blé devient une branche après Carottes : Culture du blé (200 foins + 50 bois), une plantation et 5 secondes de croissance ; le capteur de maturité (50 foins + 10 bois) permet de l’attendre sans détruire les cultures immatures. Une récolte avec retrait dure 200 ticks (1 seconde de base), sinon 1 tick (5 ms). Les anciennes parties conservent leur récolte non destructive sur culture immature. Les programmes sont isolés dans des Workers et arrêtables. La pause suspend toute la simulation, sans rattrapage hors ligne.

- Glisser sur le champ pour tourner autour à 360° et changer son inclinaison. Molette ou pincement pour zoomer ; maison pour recentrer.
- Le plateau affiche uniquement les parcelles débloquées : 1 × 1, puis 3 × 1, 3 × 3, jusqu’à 10 × 10. Les cellules sont carrées dans le modèle 3D ; leur projection dépend de l’angle de vue. Les coordonnées et cultures existantes sont conservées lors des extensions.
- Les emplacements constructibles sont débloqués séparément et ont un bloc de béton, distinct de la zone agricole.
- Chaque robot déployé possède sa propre fenêtre TypeScript, son code et son journal. Les boutons Exécuter/Arrêter concernent uniquement ce robot. Le bouton − réduit la fenêtre à son en-tête sans arrêter le programme ; il permet ensuite de la restaurer. Les fenêtres sont réduites initialement sur mobile. Le bouton Code restaure le programme du robot sélectionné. Les programmes sauvegardés ne redémarrent pas automatiquement.
- La barre du programme lance, suspend ou arrête son exécution. ×1 / ×2 / ×5 règle le temps de simulation. La pause s’applique à toute la ferme ; le magasin permet aussi de suspendre la simulation sans lancer un robot.
- Le bouton i ouvre le guide et l’API ; les chevrons ouvrent les trois pages de recherches ; le panier ouvre le magasin ; la carte de mission ouvre les objectifs.

Les anciennes sauvegardes locales sont migrées automatiquement, puis importables dans un compte. Le blé, la cargaison, les cultures, le code, les recherches et l’or sont conservés. Une ancienne cargaison supérieure à la capacité actuelle n’est pas détruite : déposez-la avant de récolter davantage. Les processus ne sont pas relancés automatiquement après rechargement.

## Magasin et économie

Les recherches consomment les matériaux déposés, sauf les paliers Stockage payés en or ; les achats du magasin consomment l’or. Un bâtiment n’exige aucun second paiement de matériaux après sa recherche. Le magasin est accessible dès le départ, sans bâtiment commercial.

- **Vendre** : foin 1 or, blé 1, bois 3, carotte 5, citrouille 12, farine 8, pain 25, planche 12 et engrais 18. Seuls les stocks des dépôts sont vendus, jamais les soutes ni les machines. Les marchandises ne sont pas achetables et l’eau n’est pas vendable.
- **Robots** : fermier 500 or (1 case/s, soute 20), transporteur 500 or (0,75 case/s, soute 100), drone 1 000 or (2 cases/s, soute 10). Les recherches Flotte, Transporteur et Drone débloquent les achats correspondants. Une case de départ libre dans le bon milieu est requise. Seul le fermier peut planter, récolter et labourer ; le drone peut transporter, arroser et appliquer de l’engrais. Le transporteur se limite aux transferts.
- **Bâtiments** : dépôt 500 or, puits 300, citerne 200, moulin 500, four 1 000, scierie 750, composteur 750 et atelier 500. Chaque achat choisit un emplacement libre débloqué ; un bâtiment occupé bloque les déplacements.
- **Consommables** : engrais 25 or après Consommables, livré aux dépôts s’ils ont de la place. L’effet demande aussi la recherche Engrais et un chargement dans la soute.
- **Mon exploitation** : choisir un robot à programmer, inspecter les stocks et machines, revendre un achat intact à 50 % de son prix payé, déplacer un bâtiment vide pendant une pause, ou reconstruire une carcasse avec un atelier. Pour éviter une perte de ressources, il faut vider l’objet avant revente ou déplacement. Le dépôt initial est conservé pour éviter une impasse.

Les cinq commandes commerciales du document consomment leurs marchandises et paient le tarif majoré. Chaque type est livrable une fois par période de 600 secondes de simulation, sans pénalité si ignoré. Elles ne se cumulent pas avec une vente normale des mêmes unités.

## Agriculture, bâtiments et flotte

Les cinq cultures sont implémentées : blé, buisson, carotte, arbre et citrouille. Leurs recherches, rendements, sols, temps et coûts de plantation suivent le document. Les graines payantes proviennent de la soute, uniquement après une plantation réussie. Les arbres voisins orthogonaux ralentissent leur pousse. Les rendements restent figés à la plantation et une récolte trop volumineuse reste partiellement sur la case. Arrosage, engrais et récolte groupée ont leurs effets et prérequis propres.

Les dépôts additionnent leurs capacités, mais chaque dépôt possède son inventaire et ses transferts locaux. Chaque dépôt s’améliore individuellement : 200 → 800 → 3 200 unités, puis ×4 jusqu’à 52 428 800 au niveau 10. Les emplacements constructibles passent de 1 à 2, 4, 8 puis 16.

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

- `server/` : API Express, comptes, sessions, validation, migrations et écritures PostgreSQL avec révisions.
- `src/persistence.ts` et `src/SessionPanel.tsx` : synchronisation, conflits et interface des sessions.
- `src/catalog.ts` : catalogue et prix issus du document, recherches implémentées, recettes, modèles, cultures et commandes commerciales.
- `src/engine.ts` : état de la ferme, migration, actions, achats, stocks locaux, cycles, eau, déplacements, collisions et réparation. Tests dans `src/engine.test.ts` et `src/shop.test.ts`.
- `src/FarmScene.tsx` : caméra orbitale et modèles 3D procéduraux originaux des robots, cultures et bâtiments, sans assets téléchargés.
- `src/Shop.tsx` : catalogue du magasin, achats, ventes, placement et gestion des biens.
- `src/SkillTree.tsx` : trois pages d’arbres reliés. Les recherches implémentées sont achetables ; les branches encore prévues restent « À venir ».
- `src/api.ts` : API typée injectée dans Monaco et partagée avec le runtime.
- `src/runner.worker.ts` : transpilation TypeScript et instrumentation des boucles et appels dans un Worker ; chaque robot a un runtime indépendant.

Le **catalogue du magasin** et ses systèmes associés sont implémentés ; la **campagne de 56 missions** n’est pas encore intégrée. La campagne guidée commence par le foin, la première boucle, l’agrandissement puis la culture du blé ; elle vérifie les ressources réellement récoltées et déposées ainsi que les recherches acquises. L’accès aux constructions du langage n’est pas encore entièrement verrouillé selon l’arbre : Variables et Fonctions servent de prérequis de progression, mais leur syntaxe reste libre pour conserver les programmes existants. Les aides `range`, `list`, `len`, `str` et les branches de programmation avancée restent à venir.

Le runtime supporte boucles, conditions, variables, listes (tableaux), dictionnaires (objets typés) et fonctions nommées. Les recherches Programmation ajoutent les étapes For, Listes, Dictionnaires et Imports de fonctions. Après la recherche Imports, `export function recolter() { harvest(); deposit(); }` dans le fichier `f2.ts` d’un robot peut être utilisé dans `f1.ts` avec `import { recolter } from "./f2"; recolter();`, même si f2 reste au garage. Les actions utilisent le robot appelant ; le fichier importé est initialisé une fois par lancement, y compris ses instructions au niveau principal. Les alias nommés sont acceptés. Les paquets externes, imports circulaires, imports dynamiques, callbacks et générateurs ne sont pas pris en charge. Monaco refuse le lancement d’un code présentant des erreurs TypeScript. Le Worker préserve la réactivité mais n’est pas une frontière de sécurité pour du code hostile : exécuter son propre code. La CSP limite les connexions distantes. Les prix et le rythme restent à équilibrer en jouant, comme le précise le document.

### Gestion de la flotte

Le bouton **Flotte** affiche les robots possédés, leur déploiement, leur activité,
leur cargaison, leur vitesse et leurs équipements. Les filtres permettent de
retrouver les robots au garage, actifs ou détruits. Chaque carte permet de
programmer, arrêter, rappeler ou déployer le robot, et de reconstruire une
carcasse avec un atelier et l’or nécessaire.

Un rappel attend la fin de l’action en cours, arrête le programme et conserve le
code, la cargaison et l’eau. Le robot au garage ne bloque aucune case et ne peut
pas exécuter de commandes. Le déploiement cherche une case libre compatible ;
le programme se relance manuellement. Cet état est sauvegardé localement et dans
PostgreSQL pour les comptes connectés. Les achats vont par défaut dans l’inventaire ; la livraison immédiate reste disponible.

L’onglet **Équipement** propose les améliorations du robot choisi. Les cartes restent uniques, avec niveau actuel et prix suivant. Un atelier construit permet d’installer les équipements sur les robots à l’arrêt. Ses propres niveaux autorisent les paliers 2, 4 puis 5.


### Campagne de missions

Le carnet de ferme propose des missions en quatre chapitres : Premiers pas,
Une ferme autonome, Cultiver autrement, Changer d’échelle. L’objectif actif reste
sur l’écran de jeu, avec son compteur et la récupération directe de la récompense.
Le carnet affiche les chapitres, les étapes futures, les conseils TypeScript et
les raccourcis vers le programme, les recherches, la flotte ou le magasin.

Les récompenses sont récupérées une seule fois, dans l’ordre. Elles accordent de
l’expérience et, selon l’étape, du blé ou de l’or pour financer la progression.
Cinq rangs suivent l’expérience gagnée ; l’expérience se calcule depuis les
missions validées et reste cohérente après une reconnexion. Les récompenses en
blé demandent de la place dans les dépôts ; une récompense en or n’en demande pas.

Les quatre missions historiques, leurs identifiants et leurs récompenses en blé
sont conservés. Une ancienne partie continue au premier objectif non validé.
Le nombre de farines produites est désormais cumulatif, indépendant des ventes
et des collectes, et conservé dans la sauvegarde PostgreSQL. Ce nouveau compteur
démarre à zéro sur les anciennes parties ; les productions antérieures ne sont
pas reconstituées. La mission industrielle compte les nouveaux cycles du moulin.

`npm run test:missions` vérifie le carnet, les récompenses, les niveaux, les
changements de chapitre, la navigation et l’affichage mobile dans Chromium.


### Navigation et aide

Les outils gardent leurs libellés visibles sur ordinateur et mobile. Les menus
Missions, Recherches et Robots partagent leurs onglets. Le Guide et le Magasin
ont des espaces distincts ; les sauvegardes sont accessibles depuis le compte. Le guide dispose d’une
recherche dans les commandes, d’essais manuels avec résultat visible et de
raccourcis vers les parcours d’apprentissage. Les conseils de première récolte
peuvent être masqués ; ce choix est conservé sur cet appareil.

Un indicateur présente la capacité totale des dépôts et mène au magasin. Les
notifications signalent les recherches, ventes, missions et erreurs de programme.
Les erreurs restent visibles jusqu’à fermeture ; les confirmations disparaissent
après six secondes.

Au clavier : `Ctrl` / `⌘` + `Entrée` lance le programme sélectionné lorsque vous
êtes sur la ferme ou dans l’éditeur. `Alt` + `1` à `5` ouvre missions, recherches,
robots, magasin et guide ; `?` ouvre le guide. Ces raccourcis de navigation ne
s’activent pas dans les champs de saisie. `Échap` ferme le menu. Le parcours au
clavier inclut les champs et les sections dépliables à l’intérieur des menus.
`npm run test:ux` vérifie ces parcours dans Chromium, y compris sur mobile.


### Thème du centre de contrôle

L’interface utilise une palette bleu nuit, des panneaux translucides, des contours
fins et un accent orange pour les sélections et actions principales. Les couleurs
et adaptations du thème sont regroupées dans `src/command-theme.css` ; les règles
de disposition communes restent dans `src/style.css`. L’éditeur possède un thème
Monaco assorti, sans chargement de police ou d’image externe.

Sur ordinateur, les outils forment une barre latérale. Les fenêtres basses gardent
les commandes et le suivi des missions dans des zones séparées. Sur mobile, les
outils restent dans la barre inférieure. Le tableau de télémétrie apparaît sur les
grands écrans et affiche les données réelles du robot sélectionné. La caméra,
les parcelles débloquées et la simulation restent indépendantes du thème.


La colonne gauche place les ressources, le stockage, le titre et les outils dans
un flux vertical. La mission reste séparée en bas ; sur une fenêtre basse, la
partie supérieure défile pour garder les outils accessibles. Le message de dépôt
plein et les récompenses de mission n’empiètent donc pas sur les autres blocs.
`npm run test:sidebar` vérifie ce cas sur sept tailles de fenêtre, jusqu’à 320 px.


### Organisation des menus

La barre supérieure a été supprimée. Les outils de gauche sont Code, Guide,
Recherches, Robots et Magasin. Le zoom reste disponible avec la molette de la
souris ; il n’y a plus de boutons Zoom ou Ferme dans cette barre.

Missions, Recherches et Robots partagent un groupe de trois onglets. Le Guide
s’ouvre dans une fenêtre de documentation dédiée ; le Magasin utilise son propre
espace et ses rayons de vente, robots, bâtiments et consommables. Ces fenêtres
n’affichent pas les onglets de progression. La gestion du compte et des
sauvegardes s’ouvre exclusivement depuis le bouton du compte sur la ferme.


### Progression des recherches et vue de la ferme

Les arbres Agriculture, Programmation et Technologie sont générés depuis le
catalogue réel, dans l’ordre des dépendances. Les anciens nœuds de feuille de
route non implémentés ne sont plus proposés. Les liens internes correspondent
aux prérequis ; le détail permet de consulter les prérequis d’autres catégories
et affiche le coût total et la capacité actuelle des dépôts.

Les prix suivent les règles actuelles détaillées dans le document Économie et équipements. Chaque recherche nécessite le déblocage de
la production des ressources qu’elle consomme, ainsi qu’un palier de stockage
compatible avec son coût total. Les recherches n’exigent plus les anciens drapeaux globaux Stockage : la capacité réellement construite et les améliorations locales des dépôts déterminent si le paiement est possible. Un dépôt de niveau 10 contient 52 428 800 unités ; plusieurs dépôts peuvent être combinés pour les recherches les plus coûteuses.

Le fond étoilé est un SVG local statique. La caméra orthographique conserve le
rapport largeur/hauteur réel du canvas et cadre une sphère englobant le terrain,
indépendante de la rotation. La vue initiale est isométrique et l’inclinaison est
bornée pour éviter les angles rasants ; les cases restent des carrés dans le
monde 3D. Leur projection à l’écran varie naturellement avec l’angle de vue.
`npm run test:progression` vérifie les liens entre arbres, les anciennes recherches,
les proportions de la caméra et la rotation sur ordinateur et mobile.


### Inventaire et construction

**Inventaire** contient deux onglets, **Bâtiments** et **Robots**, pour les objets
possédés mais non posés. Les achats de robots et bâtiments vont par défaut dans
cet inventaire ; le sélecteur de livraison du Magasin permet aussi une installation
immédiate. Un équipement rangé n’agit pas sur la ferme : aucun stockage, cycle de
production, occupation de case ou programme exécuté. Les robots gardent leur
code, leur cargaison et leur eau.

**Aménager les terrains** met la simulation en pause et ouvre le plan à coordonnées.
Les recherches Terrain constructible donnent un nombre d’emplacements ; elles
ne posent plus automatiquement les nouveaux blocs. Choisissez une case du pourtour,
connectée à la ferme ou à un bloc existant, puis posez un **bloc de béton**. Les
positions restent hors des futures parcelles agricoles de 7 × 7 pour préserver
les agrandissements. Sélectionnez un bloc libre pour installer un bâtiment de
l’inventaire ; sélectionnez un bâtiment vide pour le ranger ou le déplacer. Un
bloc libre peut être retiré pour récupérer son emplacement disponible.

Les ressources, l’eau et les cycles doivent être vidés ou terminés avant de ranger
un bâtiment. Une case occupée, visée ou réservée par un robot ne peut pas être
modifiée ; les blocs qui soutiennent la connexion d’autres terrains sont également
protégés. Un bâtiment rangé conserve son identité et son prix d’achat, sans revente
ni nouvel achat. Le dépôt initial peut être rangé lorsqu’il est vide puis reposé
gratuitement. Les changements se font en pause ; les programmes des robots rangés
restent à relancer après déploiement.

Les positions des terrains, les bâtiments rangés et les robots au garage sont
sauvegardés localement et dans PostgreSQL. Les anciennes parties gardent leurs
bâtiments et les positions des anciens emplacements. `npm run test:inventory`
vérifie achats différés, pose/retrait des blocs, rangement, robots et rechargement.

Le modèle actif de Luma est le robot fourni dans `utility-robot.zip`, converti en `public/models/luma/utility-robot.glb`. Le fichier GLB embarque la géométrie OBJ et les trois textures fournies (couleur, normales et émission). Il flotte autour de l’interface, reste face au joueur et conserve les cosmétiques et sauvegardes existantes. Les bras et les jambes restent dans leur pose d’origine. La tête suit le pointeur horizontalement et verticalement sur toute la fenêtre, avec une rotation plus lente du corps dans sa direction. Les vols accélèrent et ralentissent, avec inclinaison, pauses et lumière du capteur animée ; la préférence de réduction des mouvements est respectée. Les cosmétiques sont séparés en Coques (Jaune, Rose, Rouge, Noir), Stickers (aucun, Étoile, Fleur, Circuit) et Lentille (rouge, cyan, violet, vert). La recoloration vise la peinture jaune et la lentille ; elle conserve les marquages, les reliefs et les parties mécaniques. Les stickers sont projetés sur les panneaux de la tête et suivent son articulation. La collection comprend les 35 stickers de la planche fournie, détourés et disponibles gratuitement avec leurs vignettes individuelles. On peut poser jusqu’à trois stickers, avec emplacements distincts et inclinaisons tirés au sort à l’ajout. Leurs positions sont conservées ; le menu permet de les retirer un par un ou de les redistribuer. Les portraits du compte et des cosmétiques rendent ces placements réels avec un moteur partagé. Si le chargement échoue, le modèle procédural précédent reste disponible en secours.

Les fichiers `cyber` restent archivés dans `public/models/luma/`. `npm run assets:luma:previews` régénère les portraits du robot actif via un serveur Vite (`FARM_URL`, par défaut http://localhost:5173). `scripts/prepare-utility-robot.py` convertit le modèle fourni avec Blender ; voir [les instructions de conversion](docs/UTILITY_ROBOT.md). L’ancienne commande `npm run assets:luma` prépare uniquement l’archive cyber.

Cliquez sur l’avatar du compte pour ouvrir **Coques**, **Stickers** et **Lentille**. Jaune, Étoile et lentille rouge sont disponibles au départ ; Rose, Rouge et Noir se débloquent après 1, 3 et 6 missions récompensées ; les stickers Fleur et Circuit après 2 et 5 ; les lentilles cyan, violette et verte après 1, 3 et 5. Le bouton « Débloquer et équiper » est gratuit. Les trois choix sont indépendants et enregistrés dans la sauvegarde locale et celle du compte PostgreSQL. Les déblocages existants sont conservés.


Les nouvelles parties suivent désormais un départ guidé : une seule prairie avec de l’herbe mûre, un fermier terrestre (soute de 10) et un dépôt adjacent (200). Le premier programme appelle simplement `harvest(); deposit();`. L’herbe repousse seule en 0,5 seconde sur prairie et donne `Items.Hay` / `Resources.Hay`. `till()` est disponible dès le départ et alterne prairie et sol labouré ; l’herbe peut aussi être plantée sur les deux sols, mais ne repousse spontanément que sur prairie.

Après 5 foins **déposés**, achetez **Boucle while** dans Programmation. Le compilateur du robot refuse les boucles avant cet achat. **Trois parcelles** coûte 20 foins ; **Culture du blé**, 10 foins ; **Capteur de maturité**, 5 foins. Les coûts suivants en blé nécessitent la culture du blé, puis les autres ressources exigent leurs propres producteurs et des dépôts suffisants. Le guide et les exemples utilisent TypeScript (`true`, `false`, accolades), pas la syntaxe Python.

Pour ces nouvelles parties, récolter une culture immature la retire sans donner de ressources. Une récolte réussie dure de base 200 ticks (1 seconde, avant améliorations), une récolte sans retrait 1 tick (5 ms). Une soute pleine conserve la culture mûre. Les missions vérifient des compteurs séparés de foin et de blé récoltés/déposés : un total agrégé ne permet pas de sauter une étape. Les anciennes sauvegardes gardent leur campagne, leur code, le blé et les boucles acquis implicitement, ainsi que leur récolte non destructive sur culture immature. Elles peuvent également récolter l’herbe spontanée et accéder aux nouveaux prix.

`npm run test:onboarding` parcourt une vraie partie neuve : premier programme, boucle refusée puis achetée avec 5 foins, production automatique, agrandissement, capteur, premier blé mûr et rechargement de la sauvegarde. Les scénarios avancés de l’ancienne économie utilisent des fixtures de sauvegardes établies ; les tests du nouveau départ utilisent directement `fresh()`.

Lors d’un redémarrage confirmé depuis le guide, le premier programme est rechargé pour le nouveau départ. Le code précédemment sélectionné reste accessible dans l’exemple **Mon programme précédent** et dans la sauvegarde du compte ; il n’est pas effacé pour installer le tutoriel.
