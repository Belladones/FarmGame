# Économie et équipements — 10 novembre 2026

Cette version applique la proposition acceptée dans la conversation. Elle remplace les multiplicateurs de prix ×5 du premier classeur pour les cinq cultures concernées et sépare les améliorations locales des recherches communes.

## Cultures

Le rendement est doublé à chaque niveau. Pour atteindre le niveau N ≥ 2 : **prix du niveau 2 × 4^(N−2)**.

| Culture | Prix du niveau 2 | Prix du niveau 10 | Rendement au niveau 10 |
|---|---:|---:|---:|
| Herbe | 300 foins | 19 660 800 foins | 512 foins |
| Buisson | 250 foins | 16 384 000 foins | 512 bois |
| Carottes | 250 bois | 16 384 000 bois | 512 carottes |
| Arbre | 300 foins | 19 660 800 foins | 2 560 bois |
| Citrouille | 1 250 carottes | 81 920 000 carottes | 2 048 citrouilles |

Pour l’arbre : niveau 9 = 25 600 %, niveau 10 = 51 200 %. Le passage coûte exactement 19 660 800 foins, affiché sous forme compacte « 19,7 M ». Les recherches de cultures restent communes et une carte présente le niveau actuel et le prochain prix. Les déblocages initiaux et les neuf extensions sont conservés ; le blé reste la branche historique de transformation.

## Robots

Atelier → Améliorer un robot : cliquez sur l’atelier posé dans la ferme, puis sélectionnez le robot. Les recherches Technologie autorisent les familles d’équipements ; les installations sont payées pour **un robot précis**, jamais pour toute la flotte. Les capteurs doivent aussi être installés individuellement après leur recherche.

| Équipement | Premier prix | Effet par niveau | Modèles |
|---|---|---|---|
| Soute | 100 bois + 50 foins | Capacité ×2 | Tous |
| Motorisation | 150 bois + 50 carottes | Vitesse ×1,25 | Tous |
| Outils | 100 bois + 100 carottes | Vitesse d’action ×1,25 | Fermier |
| Manutention | 200 bois + 50 carottes | Vitesse des transferts ×2 | Tous |
| Réservoir | 100 bois + 50 carottes | Capacité d’eau ×2 | Fermier et drone |
| Application | 100 bois + 100 carottes | Consommation ×0,8 | Fermier et drone |

Les six familles commencent au niveau 1, vont jusqu’au niveau 5 et coûtent ×4 à chaque amélioration. Exemple : soute du fermier 20 → 40 → 80 → 160 → 320 unités. Le transporteur conserve sa spécialité de logistique, le drone l’entretien et le transport léger ; ni l’un ni l’autre ne peut cultiver.

Capteurs : maturité (50 foins + 10 bois), analyse (100 bois + 50 carottes), humidité (15 carottes), obstacles (60 bois + 20 carottes). Installation unique par robot, après la recherche correspondante. La détection d’obstacles est disponible sur tous les modèles ; les trois capteurs agricoles sur fermier et drone. Les coordonnées sont une fonction de navigation intégrée, autorisée par la recherche Coordonnées.

Un atelier **construit** est nécessaire et le robot doit être à l’arrêt avec son action terminée. Aucun trajet vers l’atelier n’est imposé dans cette première version. Atelier 1 : équipements jusqu’au niveau 2 ; Atelier 2 : jusqu’au niveau 4 ; Atelier 3 : jusqu’au niveau 5. Les équipements sont permanents et conservés au garage, dans les sauvegardes et après réparation.

## Bâtiments

Magasin → Mon exploitation → Améliorer [bâtiment]. Chaque bâtiment possède ses niveaux, également conservés lorsqu’il est rangé et réinstallé. Une machine déjà en cycle termine ce cycle à sa vitesse précédente ; la nouvelle vitesse s’applique aux suivants, sans rendre d’ingrédients ni offrir de production.

| Bâtiment | Achat en or | Première amélioration | Effet |
|---|---:|---|---|
| Dépôt | 500 | 500 or | Capacité ×4, 10 niveaux |
| Atelier | 500 | 200 bois + 100 carottes | Équipements 1–2, puis 3–4, puis 5 ; 3 niveaux |
| Puits | 300 | 100 bois + 50 carottes | Débit ×2, 5 niveaux |
| Citerne | 200 | 150 bois | Capacité ×4, 5 niveaux |
| Moulin | 500 | 200 bois + 100 carottes | Débit ×2, 5 niveaux |
| Four | 1 000 | 300 bois + 100 planches | Débit ×2, 5 niveaux |
| Scierie | 750 | 250 bois + 100 carottes | Débit ×2, 5 niveaux |
| Composteur | 750 | 200 bois + 150 carottes | Débit ×2, 5 niveaux |

Les prix d’amélioration sont multipliés par 4 à chaque passage. Les recettes et tampons de machines restent inchangés. Le puits produit initialement 1 eau/s, la citerne stocke initialement 400 eaux et n’en produit pas. Les réserves connectées continuent à partager leur eau. L’eau passive reste un secours plafonné à 10 réservoirs ; les réserves déjà accumulées au-dessus de 10 ne sont pas détruites.

Le dépôt commence à 200 unités : niveau 2 = 800 ; 3 = 3 200 ; 6 = 204 800 ; 9 = 13 107 200 ; 10 = 52 428 800. Le prix du passage au niveau 10 est 32 768 000 or. Les ressources de tous les dépôts construits s’additionnent. Le jeu vérifie la capacité **réelle** avant une recherche, au lieu d’exiger un ancien drapeau de recherche Stockage ; plusieurs dépôts peuvent financer une même recherche.

## Recherches et sauvegardes

Construction précède Robotique et atelier (20 bois). Les recherches d’équipements autorisent leur installation, les procédés industriels débloquent les bâtiments. Les anciens niveaux globaux de stockage, de moteurs, de soutes, d’outils et de machines ne sont plus achetables dans les arbres : leurs identifiants restent reconnus pour migrer les sauvegardes.

`assetProgression: 1` identifie le nouveau fonctionnement. À la première reprise, les anciens bonus sont reportés sur les robots et bâtiments déjà possédés, y compris ceux en inventaire. Des planchers préservent les anciennes capacités et vitesses supérieures aux nouvelles limites. Les nouveaux achats commencent à leur niveau de base et n’héritent pas de ces bonus. Aucune migration SQL n’est nécessaire : les équipements font partie du JSONB de chaque sauvegarde. L’API valide leurs niveaux avant stockage.
