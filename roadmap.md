# Roadmap

Ce qui reste à faire, par ordre de priorité. Cochez au fur et à mesure.

## À faire de ton côté (rien ne se débloque sans toi)

- [ ] **Appliquer les repères de passage de Garches** : coller le bloc proposé dans « Repères de passage » de la fiche (`/courses/<id>`), puis ajuster les consignes à ta façon de courir.
- [ ] **Connexion Strava en ligne** : se connecter sur <https://run.harbi.eu> et vérifier que la première synchro récupère les courses.
- [ ] **`CRON_SECRET` sur Vercel** : le définir (Settings > Environment Variables) puis redéployer, sinon le cron quotidien (et donc la base Supabase éveillée) ne marche pas.
- [ ] **Région des fonctions Vercel** : Settings > Functions, choisir la région la plus proche de la base Supabase (réglage probablement le plus rentable pour la vitesse).
- [ ] **Jetons Strava** : attendre plus de 6 h puis cliquer « Resynchroniser » dans Données ; « Jetons mis à jour » doit changer.
- [ ] **Chaussures** : affecter une paire à une sortie dans Strava (par exemple celle du 14 nov.), resynchroniser, vérifier le widget.
- [ ] **Webhook Strava** (optionnel, nouvelles courses presque instantanées) : `STRAVA_WEBHOOK_VERIFY_TOKEN` identique dans `.env.local` et sur Vercel, redéployer, puis `node --env-file=.env.local scripts/strava-subscribe.mjs https://run.harbi.eu/api/strava/webhook`.
- [ ] **Vrai fichier FIT** d'une montre : l'importer dans Données (le décodeur n'a été testé que sur un fichier fabriqué).

## Fonctionnalités proposées

- [x] **Page de détail d'une sortie** (`/historique/<id>`) : carte, splits, profil, et lignes de l'historique cliquables. Après un import, le lien « Voir » pointerait dessus.
- [x] **Supprimer une sortie importée** depuis l'interface (aujourd'hui impossible).
- [x] **Doublons Strava / fichier** : repérer une sortie importée en fichier qui existe déjà côté Strava (même début, même distance).
- [x] **Calibrer le modèle de relief** (+3,3 % par % de montée, −1,8 % par % de descente) sur tes vraies sorties.
- [x] **Course : « utiliser cette projection comme objectif »** depuis le calculateur.
- [ ] **Historique de plus de 1 000 activités** : la synchro initiale plafonne là.

## Qualité et vitesse

- [ ] **Mesurer en production** (Vercel) les temps de réponse après le changement de région ; en local, seul l'aller-retour vers Supabase compte.
- [x] **Cache des lectures** (`unstable_cache` + invalidation après chaque écriture) si les pages restent lentes une fois la région réglée.
- [ ] **Fournisseur de tuiles** : OpenStreetMap tolère un usage léger ; prévoir `MAP_TILE_URL` si le site grossit. `MAP_TILES=off` coupe tout tiers.
- [x] **Infobulles des graphiques au toucher** : aujourd'hui seulement au survol (`<title>`), rien sur téléphone.
- [x] **Tests de bout en bout** (Playwright) des parcours création / édition / suppression de course et import, aujourd'hui vérifiés à la main dans le navigateur.
- [ ] **Vérification visuelle sur téléphone** des écrans autres que Courses (accueil, historique, projections, fiche).

## Nettoyage

- [ ] **Supprimer la table `user_prefs`** (migration) : plus lue depuis le retrait de « Personnaliser », elle reste en base.
- [ ] **CSS mort** : les règles du tiroir et des thèmes viennent de `maquettes/assets/base.css`, partagé avec les maquettes ; à séparer si les maquettes ne servent plus.
- [ ] **Autres thèmes dans `tokens.css`** : Sunrise et Midnight ne servent plus que dans les maquettes.

## Déjà fait (pour mémoire)

Cache des lectures (`unstable_cache`, étiquette `data`, invalidée par chaque écriture), cache du routeur (`staleTimes`) et préchargement complet de la navigation, direction « affiche » (héros typographique, sections ouvertes), page de détail d'une sortie avec suppression et repérage des doublons, infobulles tactiles, objectif depuis le calculateur. Strava OAuth + synchro dédupliquée, import GPX/FIT, splits / records / profil, projections Riegel + relief, fiches de course, fond de carte OSM, passe de vitesse, retrait de « Personnaliser », actions et formulaires refaits, accessibilité. Calibrage du relief sur les sorties, tests de bout en bout Playwright (`npm run e2e`), squelettes de chargement fidèles. Détail : [docs/PLAN.md](docs/PLAN.md).
