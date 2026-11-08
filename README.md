# FarmScript 🌱

Un premier jeu de farming pour apprendre TypeScript. Interface française, robot programmable, ferme persistée localement et éditeur Monaco avec types et autocomplétion de l’API.

## Développement

Node.js 22 ou 24 et npm.

```sh
npm ci
npm run dev
```

Ouvrir ensuite http://localhost:5173 dans le navigateur. Garder le terminal ouvert : `Ctrl+C` arrête le serveur.

Si une installation a échoué après avoir utilisé le chemin cloud `/workspace/.npm-cache`, relancer `npm ci --cache "$HOME/.npm"` depuis le dossier du projet, puis `npm run dev`. Ce cache appartient à votre utilisateur et fonctionne aussi sur macOS.

```sh
npm test
npm run build
```

Test navigateur (serveur lancé dans un autre terminal) : `npm run test:e2e`. Il utilise Chromium installé sur `/usr/bin/chromium`, personnalisable avec `CHROMIUM_PATH`, et l’adresse `FARM_URL` (défaut : port 5173). Il vérifie la production automatique, la pause, l’arrêt, une récompense, la persistance et l’absence de débordement mobile. Un second parcours vérifie le nombre réel de parcelles affichées (1 puis 3), les dimensions carrées des cases dans le modèle, la rotation de caméra et le retour à la vue initiale, les trois pages de compétences, les achats, les prérequis et les branches non achetables. Les captures sont écrites dans `/tmp`.

Le serveur Vite utilise le port 5173. Aucun secret ni service externe n’est requis. Monaco et TypeScript sont installés localement, sans CDN.

## Vue 3D et commandes

Le jeu s’affiche en plein écran sur un fond bleu-gris, avec un îlot low poly rendu par Three.js. Les modèles et icônes sont créés dans le projet, sans assets externes. WebGL est nécessaire à la vue 3D ; un message explicite apparaît si sa création échoue, tandis que l’éditeur et la simulation restent utilisables.

- Glisser sur le champ pour tourner autour à 360° et changer son inclinaison. La caméra orthographique préserve les proportions du modèle : les cases sont carrées dans le monde 3D et leur apparence dépend de l’angle de vue. Utiliser la molette, le pincement tactile ou le bouton loupe pour zoomer.
- Le bouton maison recentre la caméra.
- Le bouton + affiche ou masque l’éditeur TypeScript ; il est masqué par défaut sur mobile.
- La barre f1 permet de lancer, mettre en pause et arrêter le programme ; ×1 / ×2 / ×5 règle le temps de simulation.
- Le bouton i ouvre le guide et l’API ; les doubles chevrons ouvrent les recherches et les ventes.
- La carte de mission ouvre les objectifs et leurs récompenses.

Le plateau affiche exactement les parcelles débloquées : une seule case au départ, puis trois cases carrées en ligne après la recherche Trois parcelles. Aucune case décorative ou verrouillée n’est dessinée. Le dépôt reste un bâtiment adjacent, hors du plateau agricole. Les cultures et leurs coordonnées sont conservées lors de l’extension. Le bois, les carottes et l’eau restent indiqués comme verrouillés dans ce prototype.

Le menu Recherches présente trois pages : Agriculture, Programmation et Technologie. Les compétences apparaissent comme des nœuds reliés ; sélectionner un nœud affiche son effet, son prix, ses prérequis et son état. Les six recherches jouables peuvent être achetées depuis ce menu. Les branches prévues par le document de conception sont signalées « À venir », consultables mais non achetables. Le graphe défile horizontalement et verticalement sur les petits écrans sans étirer les nœuds.

## Jouer

Lancer la boucle proposée : le robot plante, récolte après cinq secondes de simulation et dépose au dépôt. Réclamer les récompenses dans Missions, puis acheter des recherches. Le dépôt contient 200 unités, la soute 20 ; les plantations sont gratuites. La ferme commence en 1 × 1, puis s’étend en 3 × 1. Le dépôt est adjacent uniquement à (0, 0). Les bords ne rebouclent pas. Vendre les stocks rapporte de l’or.

Pause suspend la simulation et les commandes. Arrêt termine le programme ; la croissance reprend indépendamment. La vitesse accélère la croissance ; une commande est traitée toutes les 100 ms. Le code et la ferme sont conservés dans le localStorage du navigateur, sans progression hors ligne.

## Architecture et portée

- `src/engine.ts` : moteur déterministe, progression, missions, économie ; tests indépendants de React.
- `src/runner.worker.ts` : transpilation TypeScript et instrumentation AST des boucles/appels pour rendre la main à l’interface. Un arrêt termine le Worker.
- `src/main.tsx` : interface, Monaco, synchronisation des commandes et sauvegarde.
- `src/FarmScene.tsx` : scène Three.js, caméra orthographique orbitale, modèles procéduraux et croissance synchronisée avec le moteur.
- `src/SkillTree.tsx` : pages des arbres de compétences et détails des recherches.
- `src/Icons.tsx` : icônes SVG originales des ressources et commandes.

Prototype initial inspiré du document de conception « Ferme programmable — Arbres de compétences et API ». Il implémente le blé, six recherches et quatre missions simplifiées. Les missions comptent la production totale, y compris manuelle ; elles ne certifient pas encore l’emploi des notions pédagogiques. Seule la syntaxe if/else est verrouillée parmi les constructions du langage ; variables, boucles comptées et fonctions nommées sont disponibles pour expérimenter. L’industrie, les autres cultures, les trois arbres complets et la flotte ne sont pas encore implémentés.

Le runtime supporte les boucles, conditions, variables et fonctions nommées. Il ne supporte pas les callbacks, générateurs, modules et imports. Le lancement attend les diagnostics syntaxiques et sémantiques de Monaco et refuse les programmes présentant des erreurs TypeScript. Le Worker protège la réactivité de la page mais n’est pas une frontière de sécurité pour du code hostile : exécuter seulement son propre code. La CSP limite les connexions distantes. Pour un service public acceptant du code non fiable, prévoir un interpréteur à capacités limitées ou une isolation sur origine distincte.

Les prix et le rythme restent à équilibrer en jouant. La capture de référence est une inspiration, sans réutilisation de ses assets.
