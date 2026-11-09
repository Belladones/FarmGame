# Rééquilibrage du 9 novembre 2026

Source de conception : [amelioration.xlsx](sources/amelioration.xlsx), fourni par le joueur. Le code de référence est `src/researchBalance.ts`. Les coûts remplis dans le classeur sont repris tels quels ; les colonnes « précédent » et « prérequis » sont cumulées et les dépendances de production / stockage sont ajoutées automatiquement.

## Progression retenue

- Herbe gratuite → While (5 foins) → Vitesse (20 foins).
- Vitesse → Expansion 1 (30 foins) → move() (30 foins). Passage 1×1 → 3×1 puis 3×3 pour 20 bois. L’indication « 1×1 → 4×4 » d’Expansion 3 est corrigée en 3×3 → 4×4. La suite va jusqu’à 10×10. Le bouclage garde la priorité aux passages sur un bloc de béton libre adjacent, pour ne pas bloquer la logistique hors du champ.
- Vitesse → plant() (50 foins) → Buisson (50 foins) → Carottes (50 bois) → Arbre (50 bois + 70 carottes).
- Conditions et opérateurs : 150 foins + 10 bois ; Journal : 150 foins + 50 bois ; Variables : 100 bois + 150 carottes.
- can_harvest() reste une recherche séparée (50 foins + 10 bois). La description de Vitesse annonce cette étape pédagogique ; elle ne contourne pas les coûts renseignés des conditions et du capteur.
- Les exemples sont convertis en TypeScript (`true`, `false`, `else if`, `===`, `&&`, `Math.floor`). `console.log` est relié au journal du robot comme `print`.
- Le blé n’est pas supprimé : il devient une branche après Carottes, afin de conserver la chaîne Moulin → Farine → Four. La citrouille prolonge Carottes et Arbre.

## Règles pour les lignes non renseignées

Les choix ci-dessous complètent le classeur ; ce ne sont pas des valeurs explicitement fournies :

- Herbe, buisson, carotte, arbre et citrouille : 10 niveaux, rendement doublé par niveau. Les recherches sont multipliées par 5 d’un niveau au suivant, comme les 250 puis 1 250 bois de Carottes 2/3. Herbe 2 et Arbre 2 conservent leur prix renseigné de 300 foins. Arbre 2 donne 10 bois, puis double à chaque niveau ; l’indication isolée « 200 % → 400 % » est interprétée comme une progression de doublement, avec la base de 5 bois du descriptif principal.
- Eau : 9 niveaux, débit initial de 1 réservoir/10 s ; doublement par niveau. Coûts : 50, 200, 800 bois, puis ×4. Un réservoir = 0,25 d’humidité ; croissance ×1 à ×5 ; perte de 1 % de l’humidité restante par seconde. Le nombre de réservoirs et le reliquat de production sont sauvegardés. Les puits physiques restent distincts et leur débit demeure de 1 eau/s.
- Dépôts : capacité 200 au départ, puis 400 pour 500 or au niveau 2. Niveaux 3–10 : capacité ×5 et coût d’amélioration ×5. La vente peut se faire progressivement : l’or ne consomme pas le stockage des dépôts. Les recherches qui dépassent un dépôt de niveau 10 exigent aussi des terrains pour construire suffisamment de dépôts.
- Moulin et four : 5 niveaux ; cycle divisé par 2 à chaque niveau, recettes inchangées. Coût à partir du niveau 2 : 200 bois + 100 carottes, puis ×5. Puits/citernes : suite de la capacité existante jusqu’au niveau 5, sans changer les recettes d’eau passive.
- Autres recherches industrielles : conservées, avec dépendances recalculées selon les ressources et capacités réellement accessibles.

Les recherches ont toutes un effet jouable ; les déclarations de variables et de fonctions restent utilisables avant leur jalon de recherche, comme auparavant, pour préserver l’expérimentation TypeScript. Les sols Perlite et Loam cités dans le texte n’ont ni déblocage ni définition dans le classeur : aucun faux nœud payant n’est ajouté pour ces sols. Les deux sols existants restent utilisables selon les cultures.

## Économie et compatibilité

Le nouveau fermier a une soute de 20 unités et coûte 500 or ; transporteur 500 or ; drone 1 000 or ; dépôt 500 or ; carotte vendue 5 or. Le fermier et le dépôt initiaux restent offerts.

Les nouvelles parties sont marquées `researchRevision: 2`. Les sauvegardes antérieures à ce champ migrent vers les nouvelles règles, en accordant `plant()` et `move()` pour conserver l’accès aux commandes des programmes existants. Le code, les objets et les recherches ne sont pas supprimés. La capacité de dépôt déjà obtenue est conservée comme plancher (500 / 2 500 / 10 000), même si le nouveau palier correspondant est inférieur. Les semis futurs suivent désormais les coûts du classeur : vérifier en particulier le foin nécessaire aux carottes. Les cultures déjà semées gardent leur rendement jusqu’à leur récolte. Les anciennes campagnes de missions et la récolte non destructive des toutes premières sauvegardes restent compatibles. Le marqueur explicite `researchRevision: 1` permet encore de lire les règles agricoles historiques, notamment dans les tests de régression.

Pour recommencer le nouveau tutoriel, utiliser Compte → Mes parties → Nouvelle partie ; la ferme précédente est conservée. Les emplacements constructibles restent hors de la future zone de 10×10 ; une ancienne implantation sur le bord 7 doit être retirée/déplacée avant une expansion qui la recouvrirait.
