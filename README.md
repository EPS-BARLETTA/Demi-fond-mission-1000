# Demi-fond · Mission 1000

Carnet EPS du professeur, réservé aux sixièmes. Les classes et résultats restent sur l’appareil, dans le navigateur. Aucune donnée d’élève n’est envoyée à un serveur.

## Mise en ligne

Hébergement statique : tous les fichiers sont à la racine, sans compilation. Compatible Vercel (Framework Preset: Other) ou GitHub Pages (Settings → Pages → main → / root).

## Relevés et séances

- Repères : nombre de tours sur 3 minutes et sur 5 minutes.
- Repères : nombre de tours sur deux courses de 6 minutes.
- S4 : temps des deux 500 m.
- S5 et S6 : répétition puis évaluation du 1000 m.

Dans Réglages, on peut choisir « Tours sur une durée » ou « Temps sur une distance ». Le bouton « Longueur de la piste » définit la longueur d’un tour pour la classe. Une longueur renseignée dans les réglages d’une séance prend priorité pour cette séance. La longueur d’un tour est facultative : sans cette donnée, les tours sont conservés, mais les distances et vitesses ne sont pas supposées. Avec une longueur approximative, les calculs sont eux aussi approximatifs. Modifier cette longueur recalcule les résultats existants.

Pour les courses chronométrées, entrer `3:15` ou `195` secondes. Pour les durées fixes, entrer seulement le nombre de tours. Enregistrement à la sortie du champ. Ajouter des séances pour d’autres relevés ou d’autres dates. Une séance ne doit pas changer de format ou de durée après saisie des résultats.

La mise à jour conserve les classes, les évaluations et les séances contenant déjà des résultats de Mission 1000. Les séances initiales vides sont remplacées par les deux formats de relevés ci-dessus. Le cycle Première a été retiré.

## Classes et badges

Créer une classe, coller un élève par ligne ou importer TXT / CSV (Nom Prénom ou Nom ; Prénom). Les doublons exacts sont ignorés. Les listes sont affichées en ordre alphabétique, mais les résultats sont associés par identifiants d’élèves, pas par numéro de ligne.

Six badges : régularité, autonomie, entraide, engagement, sécurité, coopération/mixité. Chaque badge reste non évalué ou reçoit 0, 1 ou 2 points. Les points sont validés par le professeur. La suggestion de régularité compare les temps sur deux distances identiques, ou les tours sur deux durées identiques : écart relatif au premier relevé, seuils 10 % et 20 %. Aucune comparaison entre 3 et 5 minutes.

Performance sur 6 saisie manuellement ; badges sur 12. La note /18 n’est affichée qu’une fois les six badges et la performance évalués. Sinon, seuls les points observés sont affichés.

## Bilans et sauvegardes

Le bilan du cycle propose un export HTML autonome : tableau général de classe, noms cliquables ouvrant les fiches avec toutes les courses, les tours, les badges et observations. Ce fichier s’ouvre sans connexion et propose une impression de tous les bilans. Il constitue une copie au moment de l’export, pas une sauvegarde réimportable. Export CSV également disponible.

Pour réimporter ou transmettre les données à un autre appareil, utiliser la sauvegarde JSON. L’import remplace les données après confirmation. Exporter une sauvegarde après chaque séance, notamment avant une mise à jour.

## Hors connexion

Ouvrir le site avec Internet avant l’utilisation hors connexion. Le service worker met en cache les fichiers. Sur iPad, ajouter le site à l’écran d’accueil depuis Safari. Après mise à jour, rouvrir avec Internet puis fermer les anciennes fenêtres pour permettre l’activation du nouveau service worker.

Les données dépendent du navigateur, de l’appareil et de l’adresse exacte du site. Effacer les données du navigateur ou changer d’adresse peut les rendre indisponibles. Ne pas déposer les sauvegardes d’élèves dans le dépôt public.

## Vitesse et VMA estimée sur 6 minutes

Distance = tours × longueur de piste. Kilomètres = distance / 1000. Vitesse moyenne = distance / durée en secondes × 3,6. Sur une course de 360 secondes, la VMA estimée affichée est distance en mètres / 100. Elle représente une estimation de VMA seulement si l’élève a couru la plus grande distance possible à effort maximal ; sinon la mesure décrit simplement son allure moyenne. Chaque course de 6 minutes est affichée séparément, sans transformer le cumul des deux courses en test de VMA.
