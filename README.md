# FarmScript 🌱

Un premier jeu de farming pour apprendre TypeScript. Interface française, robot programmable, ferme persistée localement et éditeur Monaco avec types et autocomplétion de l’API.

## Développement

Node.js 22 ou 24 et npm.

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

```sh
npm test
npm run build
```

Test navigateur (serveur lancé dans un autre terminal) : `npm run test:e2e`. Il utilise Chromium installé sur `/usr/bin/chromium`, personnalisable avec `CHROMIUM_PATH`, et l’adresse `FARM_URL` (défaut : port 5173). Il vérifie la production automatique, la pause, l’arrêt, une récompense, la persistance et l’absence de débordement mobile. Les captures sont écrites dans `/tmp`.

Le serveur Vite utilise le port 5173. Aucun secret ni service externe n’est requis. Monaco et TypeScript sont installés localement, sans CDN.

## Jouer

Lancer la boucle proposée : le robot plante, récolte après cinq secondes de simulation et dépose au dépôt. Réclamer les récompenses dans Missions, puis acheter des recherches. Le dépôt contient 200 unités, la soute 20 ; les plantations sont gratuites. La ferme commence en 1 × 1, puis s’étend en 3 × 1. Le dépôt est adjacent uniquement à (0, 0). Les bords ne rebouclent pas. Vendre les stocks rapporte de l’or.

Pause suspend la simulation et les commandes. Arrêt termine le programme ; la croissance reprend indépendamment. La vitesse accélère la croissance ; une commande est traitée toutes les 100 ms. Le code et la ferme sont conservés dans le localStorage du navigateur, sans progression hors ligne.

## Architecture et portée

- `src/engine.ts` : moteur déterministe, progression, missions, économie ; tests indépendants de React.
- `src/runner.worker.ts` : transpilation TypeScript et instrumentation AST des boucles/appels pour rendre la main à l’interface. Un arrêt termine le Worker.
- `src/main.tsx` : interface, Monaco, synchronisation des commandes et sauvegarde.

Prototype initial inspiré du document de conception « Ferme programmable — Arbres de compétences et API ». Il implémente le blé, six recherches et quatre missions simplifiées. Les missions comptent la production totale, y compris manuelle ; elles ne certifient pas encore l’emploi des notions pédagogiques. Seule la syntaxe if/else est verrouillée parmi les constructions du langage ; variables, boucles comptées et fonctions nommées sont disponibles pour expérimenter. L’industrie, les autres cultures, les trois arbres complets et la flotte ne sont pas encore implémentés.

Le runtime supporte les boucles, conditions, variables et fonctions nommées. Il ne supporte pas les callbacks, générateurs, modules et imports. Le lancement attend les diagnostics syntaxiques et sémantiques de Monaco et refuse les programmes présentant des erreurs TypeScript. Le Worker protège la réactivité de la page mais n’est pas une frontière de sécurité pour du code hostile : exécuter seulement son propre code. La CSP limite les connexions distantes. Pour un service public acceptant du code non fiable, prévoir un interpréteur à capacités limitées ou une isolation sur origine distincte.

Les prix et le rythme restent à équilibrer en jouant. La capture de référence est une inspiration, sans réutilisation de ses assets.
