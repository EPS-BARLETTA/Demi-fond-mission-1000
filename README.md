# Demi-fond · Mission 1000

Application statique de suivi EPS pour le professeur. Aucune donnée d’élève n’est envoyée à un serveur. Les listes, temps et évaluations sont conservés dans le navigateur de l’appareil utilisé.

## Mise en ligne

Les quatre fichiers `index.html`, `sw.js`, `manifest.webmanifest` et `icon.svg` doivent être placés ensemble à la racine du dépôt. GitHub : Settings → Pages → Deploy from a branch → main → / (root) → Save. Le lien du site sera affiché par GitHub après publication. Aucune compilation nécessaire. Compatible également avec un hébergement statique Vercel.

## Utilisation

1. Gérer les classes : coller un élève par ligne ou importer TXT / CSV (une colonne Nom Prénom ou deux colonnes Nom ; Prénom).
2. Choisir le cycle et la séance. Mission 1000 démarre sur S4, 2 × 500 m.
3. Réglages : date, distances et consigne. `0` désigne une distance libre, utile pour les séances de durée fixe. Les distances ne peuvent plus changer après saisie d’un temps ; ajouter une séance dans ce cas.
4. Saisir le temps sous la forme 3:15 ou 195 (secondes). Vitesse moyenne pondérée et kilomètres sont calculés seulement sur les courses renseignées. Les absents/inaptes ne contribuent pas au kilométrage. Leurs temps sont conservés si leur statut change.
5. Badges : non évalué, 0, 1 ou 2 points. Les critères sont proposés, adaptables pédagogiquement, et validés par le professeur. La suggestion de régularité nécessite deux courses de même distance : écart absolu / premier temps, seuils 10 % et 20 %.
6. Bilan : performance saisie manuellement sur 6, badges sur 12 ; note /18 uniquement quand les six badges et la performance ont été évalués. Sinon le bilan affiche les points observés. Export CSV du bilan et impression.
7. Exporter la sauvegarde JSON après chaque séance. Pour passer sur un autre appareil, importer cette sauvegarde. L’import remplace les données après confirmation.

Mission 1000 comporte six séances. Le cycle Première reprend 250 / 250 / 500 / 250 / 250 / 500 m. On peut ajouter des séances et régler leurs distances dans chaque cycle.

## Hors connexion et mises à jour

Ouvrir le site au moins une fois avec Internet pour préparer le cache. Sur iPad, ajouter le site à l’écran d’accueil depuis Safari. Le service worker fournit les fichiers en cas de coupure ; les données restent locales. Après modification des fichiers, incrémenter le nom CACHE dans sw.js et rouvrir avec Internet. Une nouvelle version du service worker attend la fermeture des anciennes fenêtres avant activation. Aucun rechargement forcé pendant la saisie.

Les données dépendent de l’appareil, du navigateur et de l’adresse exacte du site : changer d’adresse, effacer les données du navigateur ou utiliser la navigation privée peut les rendre indisponibles. Exporter/importer permet de les transférer. Ne jamais déposer les sauvegardes d’élèves dans un dépôt public.
