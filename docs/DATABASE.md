# PostgreSQL : catalogue et parties

Le catalogue partagé et la progression des comptes sont séparés. Le client charge `GET /api/catalog` avant d’initialiser les écrans, les arbres et Monaco. Chaque Worker reçoit ce même catalogue à son lancement. Les prix, prérequis, textes de mission et paramètres des robots ne sont donc plus recalculés depuis un catalogue TypeScript embarqué lorsque le serveur est disponible.

## Installation et conservation des données

```bash
docker compose up -d db
npm run db:migrate
npm run dev
```

Le démarrage de l’API applique aussi les migrations. `004_game_catalog_and_progress.sql` crée les tables et répartit les sauvegardes déjà présentes. `005_research_compatibility_cost.sql` conserve les anciennes métadonnées de coût ; les prix réels restent définis dans `game_research_costs`. L’import des valeurs initiales intervient une seule fois, dans la transaction de migration. Les redémarrages et les prochains `db:migrate` conservent les éditions faites en base.

`src/shared/domain/bootstrap.json` fournit le jeu de données initial et le secours hors ligne ; ce fichier n’écrase jamais un catalogue déjà installé. Il inclut 147 identifiants de recherche et les trois versions de campagne nécessaires aux anciennes parties. Les conditions de mission sont des données évaluées par des opérateurs autorisés (`counter`, `length`, `research`, `sum`, `cap`, `count`), sans exécution de JavaScript provenant de PostgreSQL.

## Tables de définition

| Table | Contenu |
| --- | --- |
| `game_catalog` | Version et date du catalogue |
| `game_resources` | Identifiants, noms et prix de vente |
| `game_research` | Recherches, catégorie, texte, coût en or et ordre |
| `game_research_costs` | Coûts par recherche et ressource |
| `game_research_links` | Relations entre recherche et prérequis |
| `game_research_groups` | Éléments affichés et niveau initial |
| `game_research_steps` | Ordre des niveaux d’un même élément |
| `game_chapters` | Chapitres de la campagne |
| `game_missions` | Objectifs, règles de progression, récompenses, aide, code et ordre, par campagne |
| `game_definitions` | Paramètres des robots, bâtiments, cultures, recettes, équipements, commandes commerciales, cosmétiques et progression |

`game_research_links.research_id` désigne la recherche à acheter ; `prerequisite_id` désigne une recherche requise. Les contraintes référentielles empêchent les liens vers des identifiants inexistants. L’API vérifie aussi les cycles et la cohérence des données avant d’exposer un catalogue.

`game_definitions.section` vaut `models`, `buildings`, `recipes`, `crops`, `robotEquipment`, `buildingUpgrades`, `tradeOrders`, `cosmetics` ou `settings`. Les données à structure variable vivent en JSONB dans chaque ligne ; les identifiants et l’ordre restent des colonnes. Deux équipements peuvent porter le même nom technique pour des bâtiments différents ; leur identifiant de ligne est distinct.

## Modifier le catalogue

Effectuer les modifications liées dans une transaction, puis recharger l’application. L’API lit toutes les tables dans un même instantané PostgreSQL ; elle n’expose pas un mélange de deux versions.

Exemple pour le coût de la première boucle :

```sql
BEGIN;
UPDATE game_research_costs
SET amount = 7
WHERE research_id = 'loops' AND resource_id = 'Hay';
COMMIT;
```

Exemple pour rendre une recherche dépendante d’une autre :

```sql
INSERT INTO game_research_links (research_id, prerequisite_id)
VALUES ('loops', 'till')
ON CONFLICT DO NOTHING;
```

Exemple de mission et de robot :

```sql
UPDATE game_missions
SET title = 'Une première récolte', target = 2
WHERE campaign = 'modern' AND id = 'first';

UPDATE game_definitions
SET data = jsonb_set(data, '{capacity}', '30')
WHERE section = 'models' AND id = 'Farmer';
```

La version de `game_catalog` augmente automatiquement lors d’une modification des tables de définition. Une session en cours conserve ses règles jusqu’au rechargement, pour éviter de changer les coûts au milieu d’une action. Les identifiants des recherches déjà achetées restent stables ; les changer constitue une migration de progression, pas un simple renommage.

Les identifiants de ressources et de cultures du catalogue sont exposés à Monaco et au Worker : par exemple une ressource `Pear` ajoutée à `game_resources` devient accessible comme `Resources.Pear`. Les nouvelles versions de contenu se livrent avec une migration SQL ciblée, afin de conserver les éditions existantes ; le fichier initial ne sert pas à réinitialiser une base en service.

Les comportements des commandes, les formules générales, la syntaxe TypeScript, les opérateurs de conditions et les modèles/shaders 3D restent du code. Ajouter une ligne permet de configurer une mécanique existante ; inventer une nouvelle mécanique nécessite son implémentation. Les paramètres d’équipement doivent rester compatibles avec la validation des sauvegardes et les limites prises en charge par le moteur.

## Tables des parties

Une partie est identifiée par `(player_id, save_key)` : `active` pour la partie en cours, l’UUID de l’emplacement pour une sauvegarde nommée.

| Table ou vue | Contenu |
| --- | --- |
| `game_saved_games` | Révision, temps, dimensions, monnaie, compteurs, compagnon, terrains constructibles et autres métadonnées dans `core` |
| `game_saved_research` | Recherches acquises, dans leur ordre d’origine |
| `game_saved_claims` | Missions dont la récompense a été récupérée |
| `game_saved_resources` | Ressources globales et quantités |
| `game_saved_tiles` | Une ligne par parcelle, entité, sol et état de croissance |
| `game_saved_robots` | Une ligne par robot : modèle, programme, position, équipement, état et chargement |
| `game_saved_buildings` | Bâtiments posés et bâtiments en inventaire |
| `game_inventory_balances` | Ressources par propriétaire et compartiment : inventaire, entrée ou sortie |
| `game_equipment_levels` | Niveaux d’équipement des robots et bâtiments |
| `game_mission_progress` | Progression calculée avec les règles de la campagne et état de récompense |

`farm_saves` et `farm_slots` conservent également le document complet reçu, pour la compatibilité et la récupération. Les lectures de l’API reconstruisent les parties depuis les tables séparées via `game_restore_save`. Elles ne se contentent donc pas d’écrire des copies inutilisées. Les champs optionnels, programmes, objets en inventaire et identifiants anciens sont conservés lors de la migration.

Les triggers mettent toutes les tables de partie à jour dans la même transaction que la sauvegarde. Un conflit de révision, une erreur ou une écriture annulée ne met pas à jour une partie seulement des données. Les UUID des sauvegardes nommées restent immuables et leur suppression nettoie leurs lignes associées. Les suppressions de comptes sont propagées par les clés étrangères.

Les écritures normales passent par `PUT /api/save` et `POST /api/slots`, pour conserver la gestion des révisions et des reprises. Une édition manuelle d’une progression doit aussi respecter ces révisions ; les exemples suivants sont des lectures.

```sql
-- Missions de la partie active d’un compte
SELECT mission_id, title, progress, target, claimed
FROM game_mission_progress
WHERE player_id = 'UUID_DU_COMPTE' AND save_key = 'active'
ORDER BY position;

-- Programmes des robots
SELECT robot_id, model, data->>'code' AS programme,
       data->>'deployed' AS deploye
FROM game_saved_robots
WHERE player_id = 'UUID_DU_COMPTE' AND save_key = 'active'
ORDER BY position;

-- Recherches acquises
SELECT research_id
FROM game_saved_research
WHERE player_id = 'UUID_DU_COMPTE' AND save_key = 'active'
ORDER BY position;

-- Chargement physique des robots et bâtiments
SELECT owner, compartment, resource_id, amount
FROM game_inventory_balances
WHERE player_id = 'UUID_DU_COMPTE' AND save_key = 'active'
  AND owner <> 'farm';
```

Les lignes d’inventaire avec `owner='farm'` sont les miroirs globaux utilisés pour la compatibilité du jeu. Elles ne doivent pas être additionnées aux stocks physiques des dépôts pour calculer un total.

## API, connexion et mode hors ligne

- `GET /api/catalog` : catalogue public, versionné et validé.
- `GET /api/progress` : missions, recherches et inventaires de la partie active du compte connecté, dans un même instantané de lecture.
- `GET/PUT /api/save` : partie active, avec protection contre les écritures concurrentes.
- `/api/slots` : sauvegardes nommées du compte.

Les routes de progression et de sauvegarde prennent le compte depuis la session HttpOnly. Un identifiant de joueur passé dans l’URL ou dans le corps de la requête ne donne accès à aucun autre compte.

Sans compte, les parties restent locales comme auparavant. En cas de panne du catalogue, le client utilise la dernière version validée mise en cache, ou les données initiales à défaut, et affiche un état hors ligne. Cette copie protège la continuité du jeu ; elle ne prétend pas avoir sauvegardé une partie invitée dans PostgreSQL.

## Vérification

```bash
npm test
npm run test:server
npm run build
npm run test:catalog
```

Les tests PostgreSQL créent un schéma isolé pour vérifier une migration depuis les trois premières versions, les modifications du catalogue, les conditions de mission SQL/TypeScript et l’atomicité des sauvegardes. Le test navigateur crée aussi son propre schéma ; il vérifie qu’un coût et un texte édités en SQL apparaissent réellement dans l’interface et que les paramètres chargés s’appliquent aux programmes.
