# Demi-fond · Mission 1000

Carnet EPS du professeur pour les sixièmes. Application statique, sans compilation, compatible Vercel (Other) ou GitHub Pages. Classes et résultats conservés dans le navigateur ; aucune donnée d’élève envoyée à un serveur.

## Cycle

- S1 : découverte de l’allure et badges ; aucune performance à saisir.
- S2 : travail de régularité et relevé facultatif sur 6 minutes pour estimer la VMA.
- S3 : routine, 3 / 5 / 6 minutes en tours ; défi 1 et 2 minutes sans indicateur, non noté.
- S4 : 2 × 500 m ; repère de régularité pour l’entraînement, hors note finale.
- S5 : premier 1000 m avec temps cumulé à 500 m et temps final.
- S6 : deuxième 1000 m avec passage à 500 m ; meilleure performance et meilleure régularité de S5 ou S6 retenues séparément.

Les listes de classes et les relevés existants sont préservés. Les anciennes séances « Repères » sont réparties dans S2 et S3 ; les anciens relevés non convertibles restent archivés.

## Note sur 20

**Badges /12 + performance /6 + indice /2.** Les composantes sont affichées séparément dans le bilan et la fiche élève. La note finale n’est affichée que lorsque les sept badges, une performance sur 1000 m et la régularité du 1000 m sont renseignés. Sinon, seuls les points observés sont affichés.

### Badges /12

Sept badges : régularité observée pendant la course, autonomie, entraide, engagement, sécurité, coopération/mixité, « Je ne marche pas ». Non évalué reste distinct de zéro.

Quatre niveaux : rouge 0, orange 1, vert clair 1,75, vert foncé 2 points. La somme sur 14 est ramenée sur 12. Tous verts clairs : 10,5/12 ; tous verts foncés : 12/12. Les niveaux existants sont conservés et reprennent le barème actuel lors du calcul.

Grille tactile : premier clic sur une case vide = acquis, puis super, non acquis, en cours, acquis. Enregistrement immédiat. « Classe : acquis » applique le niveau vert clair à une colonne pour les élèves présents à la séance choisie ; ajuster ensuite les exceptions. Mode effacement et annulation de la dernière action disponibles. Le défilement de la grille est conservé après un clic.

### Performance /6

Meilleur temps sur 1000 m de S5 ou S6, parmi les courses renseignées avec statut Présent. Vitesse = 3600 / temps en secondes.

| Vitesse km/h | Points /6 |
|---|---:|
| moins de 8 | 0 |
| 8 à moins de 9 | 1 |
| 9 à moins de 10 | 2 |
| 10 à moins de 11 | 3 |
| 11 à moins de 12 | 4 |
| 12 à moins de 13 | 5 |
| 13 et plus | 6 |

Une correction manuelle facultative de la performance sur 6 reste possible dans Notes. Laisser ce champ vide pour le calcul automatique. Les 5 minutes donnent un repère provisoire et une projection du chrono par 500 m. Les 6 minutes ne contribuent pas à la note de performance.

### Régularité du 1000 m /2

En S5 et S6, l’observateur relève le temps cumulé à 500 m, puis le temps final à 1000 m sans arrêter ni remettre à zéro le chrono au passage. Premier 500 = temps au passage. Second 500 = temps final moins le passage.

Écart % = différence absolue des deux moitiés / moitié la plus rapide × 100. Indice /100 = maximum de 0 et (100 − 5 × écart %). Points /2 = indice /50, arrondi au centième.

La meilleure régularité de S5 ou S6 est retenue, même si elle provient d’une autre course que la meilleure performance. Le relevé de S4 est conservé comme entraînement, hors note finale. Sans passage à 500 m, la performance reste calculable mais la régularité et la note finale restent à compléter. Les anciens temps finaux sont conservés ; aucun passage n’est inventé.

Le champ `sec500` est ajouté au relevé existant du 1000 m, sans créer une seconde course ni doubler la distance. Un passage positif inférieur au temps final est requis ; un relevé partiel peut être conservé avant la saisie de l’arrivée. La sauvegarde JSON, les fiches et les bilans HTML conservent le passage.

## Saisie et sauvegardes

Gérer les classes : coller un élève par ligne ou importer TXT/CSV (Nom Prénom ou Nom ; Prénom). Les doublons exacts sont ignorés. Les résultats suivent les identifiants des élèves, pas les numéros de ligne.

Tours : saisir uniquement le nombre. « Longueur de la piste » définit les mètres d’un tour pour la classe et la séance sélectionnées. Une option applique aussi cette longueur aux séances suivantes sans relevé. Les longueurs des autres séances et des autres classes sont conservées ; les anciennes distances ne sont pas recalculées lors du changement de piste pour une nouvelle séance. Les longueurs par classe et séance sont incluses dans la sauvegarde JSON. Sans longueur, aucun kilométrage ou vitesse n’est supposé. Une longueur approximative produit des calculs approximatifs. Temps : saisir 3:15 ou 195 secondes. Enregistrement à la sortie du champ. Les absents et inaptes ne contribuent pas au kilométrage ni aux résultats calculés.

Bilan HTML autonome : tableau général avec noms cliquables, fiches individuelles avec toutes les courses, projections, badges et les trois composantes de la note /20. Export CSV et impression disponibles. Le HTML est une copie au moment de l’export, pas une sauvegarde réimportable.

Exporter la sauvegarde JSON après chaque séance. Importer sur un autre appareil pour transférer les données. L’import remplace les données après confirmation. Ne pas déposer les sauvegardes d’élèves dans le dépôt public.

## Hors connexion

Ouvrir le site avec Internet pour préparer le cache. Sur iPad, ajouter à l’écran d’accueil depuis Safari. Après une mise à jour, rouvrir avec Internet et fermer les anciennes fenêtres pour activer le nouveau service worker. Les données dépendent de l’appareil, du navigateur et de l’adresse exacte du site.

Sur 6 minutes, la distance en mètres /100 donne la vitesse moyenne, affichée comme estimation de VMA pour une course à effort maximal. Sinon elle décrit l’allure moyenne. Chaque course est traitée séparément.

## Écran simple S4 à S6

S4 : présence et deux temps de 500 m, repère de régularité hors note. S5 et S6 : présence, passage à 500 m et temps final du 1000 m. La meilleure performance et la meilleure régularité sont calculées. Aucun temps à annoncer. Le nombre de tours est affiché avec la longueur de piste de la séance. Le badge « Je ne marche pas » se règle directement par niveau, sans changer les autres badges. En S6, le premier temps de S5 reste visible. Le déroulé de la séance est disponible dans un panneau dépliable.

« Fiche observateur A4 » télécharge le PDF inclus dans l’application : quatre fiches individuelles sur une page A4, dix cases à cocher, espaces pour les temps cumulés à 500 et 1000 m. La fiche est conçue pour une piste mesurée à 100 m et est ajoutée au cache hors connexion.

La clé de stockage `mission1000-v1`, les identifiants, les anciens relevés et les validations sont conservés. Version interface et cache : v10.

La fiche observateur PDF est générée sur l’appareil à partir de la longueur de piste de la séance sélectionnée : quatre cartes A4, tours complets à cocher, repères exacts 500 m et 1000 m (tours et mètres supplémentaires). Le chrono reste cumulé.
