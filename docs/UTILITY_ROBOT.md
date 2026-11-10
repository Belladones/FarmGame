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
