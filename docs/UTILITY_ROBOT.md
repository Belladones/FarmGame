# Robot fourni pour Luma

Source : archive utilisateur conservée dans `docs/sources/utility-robot.zip`. Le modèle utilisé est `Utility_Robot.obj` dans l’archive imbriquée `source/240158f2930246519038113e3bbd50ee.zip`.

Le GLB actif est `public/models/luma/utility-robot.glb`. Il intègre les images `_Midterm_Robot_DF.jpg` (couleur), `_Midterm_Robot_NM.jpg` (normales) et `_Midterm_Robot_EM.jpg` (émission) du dossier `textures`. Les UV et la géométrie sont conservés. Le contrôleur normalise ensuite la taille et ajoute la lévitation, l’orientation vers la caméra et les cosmétiques sans déformer la source. Le modèle OBJ ne contient pas de squelette ou de clips d’animation. La conversion sépare ses composants rigides et leur ajoute cinq pivots (tête, bras et jambes), sans modifier leurs UV ni leur forme au repos. Le contrôleur anime uniquement le pivot de la tête pour suivre le pointeur, avec accessoires solidaires de la tête ; les bras et les jambes restent dans leur pose d’origine. Le corps tourne également vers le pointeur, avec un lissage plus lent que celui de la tête. Le suivi fonctionne sur toute la fenêtre et revient au repos lorsque le pointeur en sort. Les déplacements suivent les trajets libres de l’interface avec accélération, freinage, pauses, inclinaison et réaction au pointeur ; la réduction des mouvements désactive ces animations.

Pour reproduire la conversion avec Blender 4.3 :

```sh
mkdir -p /tmp/utility-robot/mesh
unzip docs/sources/utility-robot.zip -d /tmp/utility-robot
unzip /tmp/utility-robot/source/240158f2930246519038113e3bbd50ee.zip -d /tmp/utility-robot/mesh
blender --background --python scripts/prepare-utility-robot.py -- /tmp/utility-robot public/models/luma/utility-robot.glb
```

Avec Vite lancé, régénérer les portraits :

```sh
FARM_URL=http://localhost:5173 npm run assets:luma:previews
```

Les identifiants de cosmétiques et les sauvegardes sont inchangés. Les portraits et le personnage affiché utilisent le même modèle. Le précédent modèle procédural sert de secours en cas d’erreur de chargement. Le modèle est purement décoratif : il n’est pas ajouté à la flotte agricole et ne bloque pas les commandes de l’interface.

## Peinture, stickers et lentille

Le shader `src/robotPaint.ts` remplace uniquement les pixels de peinture jaune. Les couleurs des pièces mécaniques, des inscriptions et les cartes de relief sont préservées. La lentille utilise un masque de sa zone dans l’atlas : le changement de couleur concerne sa surface et sa lumière, sans recolorer les autres voyants rouges.

`src/robotStickers.ts` projette de vrais décalques sur les panneaux de la tête avec `DecalGeometry`. Ils restent collés à leur support et accompagnent le mouvement de tête ; les anciens objets ruban, fleur et halo ne sont plus affichés. Les trois choix se cumulent : peinture, sticker et lentille. Les 64 portraits utilisent les mêmes shaders et les mêmes décalques que le personnage.

Les identifiants historiques sont conservés pour préserver les déblocages : `pearl` correspond à Jaune, `rose` à Rose, `mint` à Rouge et `cosmic` à Noir ; `ribbon`, `flower`, `halo` correspondent aux stickers Étoile, Fleur et Circuit. Les seuils de missions restent inchangés. Une ancienne sauvegarde sans champ `lens` reçoit la lentille rouge d’origine. Les couleurs de lentille cyan/violet/vert se débloquent à 1/3/5 missions récompensées, indépendamment de la coque et du sticker.

## Trois stickers et placements persistants

`companion.stickers` contient au maximum trois entrées `{ id, slot, rotation }`. Cinq panneaux sûrs sont disponibles : quatre zones de la tête autour de la lentille et le torse. Les slots sont uniques. L’emplacement et l’angle sont tirés au sort lors de l’ajout, jamais pendant le rendu ou le chargement ; une ancienne sauvegarde migre son sticker unique vers la zone historique en haut à droite. Le menu permet d’ajouter plusieurs exemplaires, de retirer chaque entrée et de redistribuer les positions. La validation serveur protège la limite, les indices, les doublons et les angles.

Les portraits sont désormais calculés avec le même modèle et les mêmes placements que le personnage. Un seul moteur hors écran et un seul modèle sont partagés ; les images sont mises en cache, sans boucle d’animation pour les portraits. Les PNG existants servent uniquement de secours pendant leur chargement.

## Collection de la planche fournie

La planche envoyée dans le chat a été détourée avec l’outil d’image, puis enregistrée dans `public/models/luma/stickers/atlas.png`. `src/stickerLibrary.ts` définit les 35 découpes individuelles. Les proportions des dessins sont conservées sur les vignettes et les décalques 3D. Les trois régions dont les rectangles touchent un dessin voisin ont un contour de sélection supplémentaire (`stickerContours.ts`), utilisé à la fois pour les vignettes et pour le masque des décalques.

Les 35 stickers sont disponibles sans coût ni mission supplémentaire. Les anciens stickers et déblocages restent conservés. L’atlas transparent est chargé avant le modèle et réutilisé par les portraits ; les découpes utilisent des textures partageant la même image, sans charger 35 fichiers. La limite de trois stickers, les emplacements distincts, le retrait et la sauvegarde des inclinaisons restent identiques.
