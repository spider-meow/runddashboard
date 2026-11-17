# rundashboard

Dashboard de running perso, pour s'amuser. Next.js (TypeScript) + Supabase + Vercel, données Strava.

| Écran | Ce qu'il montre |
|---|---|
| Accueil | Prochaine course (tracé animé, compte à rebours, projection), profil de dénivelé, dernière course, allure au km, volume, chaussures, records |
| Historique | Volume et allure par semaine, records personnels, dernières sorties |
| Projections | Riegel ajusté au relief, avec fourchette, calculateur modifiable |
| Courses | Courses à venir et passées, fiche de course (modifier, tracé GPX, profil, repères de passage, objectif, supprimer) |
| Données | État de la connexion Strava, synchronisation, import de fichiers GPX/FIT, déconnexion |

L'app n'a qu'un thème, Poster, avec son accent d'origine : pas de réglages à gérer. (La table `user_prefs` de la migration 0002 n'est plus lue ; elle reste en base, inoffensive.)

Plan : [docs/PLAN.md](docs/PLAN.md). Design : [DESIGN.md](DESIGN.md). Maquettes d'origine : [maquettes/](maquettes/index.html).

## Dashboard privé

D'après la presse, l'accord API de Strava (en vigueur depuis novembre 2024) limite l'affichage des données d'un athlète à cet athlète. Je n'ai pas lu le texte de l'accord : à confirmer. Dans tous les cas, un tracé GPS peut révéler où tu habites. Seul l'athlète `OWNER_ATHLETE_ID` peut se connecter : le retour OAuth refuse tout autre compte et pose un cookie de session signé. Sans ce cookie, toutes les pages renvoient à l'accueil, qui n'affiche que le bouton de connexion.

## Mise en route (à faire par toi, secrets compris)

1. **Strava** : crée une application sur <https://www.strava.com/settings/api>. « Authorization Callback Domain » : ton domaine (par exemple `run.harbi.eu`). `localhost` est autorisé par Strava pour le développement.
2. **Supabase** : crée un projet gratuit, puis colle dans le SQL editor, dans l'ordre, `supabase/migrations/0001_init.sql`, `0002_features.sql` puis `0003_gear.sql`. Récupère l'URL et la clé secrète (`sb_secret_…`) dans Project Settings > API Keys.
3. **Variables** : `cp .env.example .env.local` puis remplis-le. Ton identifiant d'athlète est le nombre dans l'URL de ton profil Strava. `SESSION_SECRET` : 32 caractères aléatoires ou plus. `STRAVA_WEBHOOK_VERIFY_TOKEN` : une chaîne de ton choix.
4. **Lancer** : `npm install`, `npm run dev`, ouvre <http://localhost:3000>, clique « Se connecter avec Strava ». La première synchronisation récupère tes courses et analyse les 30 plus récentes (splits au km, records, profil) ; « Resynchroniser » dans « Données » reprend le reste.

## Déploiement (Vercel)

Importe le repo, saisis les mêmes variables dans Project Settings > Environment Variables (aucune n'est `NEXT_PUBLIC_`), puis ajoute ton domaine.

- **Cron quotidien** : `vercel.json` appelle `/api/strava/sync` chaque jour. Il garde aussi la base Supabase gratuite éveillée (elle se met en pause après environ une semaine sans activité). Définis `CRON_SECRET` : Vercel l'envoie dans l'en-tête `Authorization`.
- **Webhook Strava** (nouvelles courses presque instantanées) : une fois l'app en ligne, lance une seule fois `node --env-file=.env.local scripts/strava-subscribe.mjs https://ton-domaine/api/strava/webhook`. Strava appelle l'URL pour la valider : `STRAVA_WEBHOOK_VERIFY_TOKEN` doit déjà être défini sur Vercel.

## Données et fichiers

- **Déduplication** : la clé unique `(source, external_id)` fait qu'une synchro ne crée jamais de doublon. Un fichier importé a pour identifiant l'empreinte SHA-256 de son contenu : le même fichier deux fois n'ajoute rien. Pas de dédoublonnage entre une course Strava et le même parcours importé en fichier.
- **GPX / FIT** : l'import calcule distance, allures, splits, records et dénivelé à partir des points. Le fichier doit contenir l'heure de chaque point, et peser 4 Mo au plus (Vercel refuse les requêtes de plus de 4,5 Mo).
- **Relief** : le coût du relief est un modèle simple (+3,3 % de temps par % de montée, −1,8 % par % de descente), à calibrer sur tes sorties.

## Au clavier, au lecteur d'écran, ou par un agent

Le site est pensé pour être lisible sans les yeux : HTML natif (liens, boutons, champs avec étiquette), un seul titre de niveau 1 par page, un titre d'onglet propre à chaque écran, un lien « Aller au contenu », une navigation avec libellés visibles et page courante annoncée. Les graphiques ont un résumé chiffré en texte (total, maximum, extrêmes). Rien ne dépend du survol ni du glisser-déposer.

- **Formulaires** : chaque champ a son étiquette, son aide et son erreur reliées (`aria-describedby`, `aria-invalid`). Après une erreur, le focus va au premier champ fautif et rien de ce qui a été saisi n'est perdu. Les boutons passent en « occupé » pendant l'action. Les résultats s'annoncent dans une zone `aria-live`.
- **Suppression** : en deux temps, sans boîte de dialogue du navigateur (elles bloquent les automates).
- **Repères stables** : chaque carte porte `data-widget="…"` (par exemple `race`, `upcoming`, `edit`, `track`, `strava`, `import`).
- **Adresses** : `/` accueil, `/historique`, `/projections`, `/courses`, `/courses/<id>` (fiche : modifier, importer un tracé, supprimer), `/donnees` (synchroniser, importer une sortie, se déconnecter). Tout est derrière la connexion Strava du propriétaire et marqué `noindex`.
- **Synchroniser** : le bouton appelle `POST /api/strava/sync` (réponse JSON avec `Accept: application/json`) ; `GET` n'accepte que le jeton `CRON_SECRET`.

## Fond de carte

Sous le tracé, des tuiles [OpenStreetMap](https://www.openstreetmap.org/copyright) (assombries en CSS pour le thème sombre). Le serveur ne fait que calculer quelles tuiles afficher : **c'est ton navigateur qui les télécharge chez tile.openstreetmap.org**, qui voit donc la zone affichée, ton adresse IP et le site d'où tu viens. Le tracé exact n'est jamais envoyé, mais une zone zoomée peut suffire à deviner où tu habites si ta course part de chez toi.

- `MAP_TILES=off` : carte schématique sans aucun tiers (le tracé s'affiche, sans fond).
- `MAP_TILE_URL=https://…/{z}/{x}/{y}.png` : autre fournisseur. La [politique d'OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) tolère un usage léger comme celui-ci, pas un site très fréquenté. Les tuiles CARTO ont été essayées : elles exigent une clé API et affichent un filigrane sans elle.

## Vitesse

- Les listes ne chargent ni tracé, ni splits, ni profil (seule la dernière sortie est lue en entier) : ~8 fois moins de données par sortie.
- Les préférences ne sont lues qu'une fois par requête, les polices sont hébergées par l'app (aucun appel à Google Fonts), le lien de navigation cliqué affiche un trait de progression pendant que la page arrive.
- **Région des fonctions Vercel** : c'est probablement le réglage qui compte le plus. Chaque page fait des allers-retours vers Supabase ; si les fonctions Vercel sont à Washington (réglage par défaut) et ta base en Europe, chacun coûte 80 à 100 ms de plus. Dans Vercel > Settings > Functions, choisis la région la plus proche de ta base Supabase (affichée dans Supabase > Project Settings).

## Commandes

```bash
npm test         # tests unitaires
npm run typecheck
npm run build
```

## Limites connues

La synchronisation initiale plafonne à 1 000 activités. Les chaussures viennent de l'équipement Strava affecté à tes sorties (lecture non vérifiée sur une vraie paire : aucune de tes courses n'en a). Sur mobile, le texte des graphiques est agrandi par CSS, sans redessin au redimensionnement.
