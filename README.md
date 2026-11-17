# rundashboard

Dashboard de running perso, pour s'amuser. Next.js (TypeScript) + Supabase + Vercel, données Strava.

| Écran | Ce qu'il montre |
|---|---|
| Accueil | Prochaine course (tracé animé, compte à rebours, projection), profil de dénivelé, dernière course, allure au km, volume, chaussures, records |
| Historique | Volume et allure par semaine, records personnels, dernières sorties |
| Projections | Riegel ajusté au relief, avec fourchette, calculateur modifiable |
| Courses | Fiches de course : tracé GPX, profil, repères de passage, objectif |
| Données | État de la connexion Strava, import de fichiers GPX/FIT |

Chaque écran a un bouton « Personnaliser » : thème (Poster par défaut, Sunrise, Midnight), couleur d'accent, widgets à afficher, masquer, réordonner (glisser-déposer ou flèches) et redimensionner. Les choix sont enregistrés dans la base.

Plan : [docs/PLAN.md](docs/PLAN.md). Design : [DESIGN.md](DESIGN.md). Maquettes d'origine : [maquettes/](maquettes/index.html).

## Dashboard privé

D'après la presse, l'accord API de Strava (en vigueur depuis novembre 2024) limite l'affichage des données d'un athlète à cet athlète. Je n'ai pas lu le texte de l'accord : à confirmer. Dans tous les cas, un tracé GPS peut révéler où tu habites. Seul l'athlète `OWNER_ATHLETE_ID` peut se connecter : le retour OAuth refuse tout autre compte et pose un cookie de session signé. Sans ce cookie, toutes les pages renvoient à l'accueil, qui n'affiche que le bouton de connexion.

## Mise en route (à faire par toi, secrets compris)

1. **Strava** : crée une application sur <https://www.strava.com/settings/api>. « Authorization Callback Domain » : ton domaine (par exemple `run.harbi.eu`). `localhost` est autorisé par Strava pour le développement.
2. **Supabase** : crée un projet gratuit, puis colle dans le SQL editor, dans l'ordre, `supabase/migrations/0001_init.sql` puis `0002_features.sql`. Récupère l'URL et la clé secrète (`sb_secret_…`) dans Project Settings > API Keys.
3. **Variables** : `cp .env.example .env.local` puis remplis-le. Ton identifiant d'athlète est le nombre dans l'URL de ton profil Strava. `SESSION_SECRET` : 32 caractères aléatoires ou plus. `STRAVA_WEBHOOK_VERIFY_TOKEN` : une chaîne de ton choix.
4. **Lancer** : `npm install`, `npm run dev`, ouvre <http://localhost:3000>, clique « Se connecter avec Strava ». La première synchronisation récupère tes courses et analyse les 30 plus récentes (splits au km, records, profil) ; « Resynchroniser » dans « Données » reprend le reste.

## Déploiement (Vercel)

Importe le repo, saisis les mêmes variables dans Project Settings > Environment Variables (aucune n'est `NEXT_PUBLIC_`), puis ajoute ton domaine.

- **Cron quotidien** : `vercel.json` appelle `/api/strava/sync` chaque jour. Il garde aussi la base Supabase gratuite éveillée (elle se met en pause après environ une semaine sans activité). Définis `CRON_SECRET` : Vercel l'envoie dans l'en-tête `Authorization`.
- **Webhook Strava** (nouvelles courses presque instantanées) : une fois l'app en ligne, lance une seule fois `node --env-file=.env.local scripts/strava-subscribe.mjs https://ton-domaine/api/strava/webhook`. Strava appelle l'URL pour la valider : `STRAVA_WEBHOOK_VERIFY_TOKEN` doit déjà être défini sur Vercel.

## Données et fichiers

- **Déduplication** : la clé unique `(source, external_id)` fait qu'une synchro ne crée jamais de doublon. Un fichier importé a pour identifiant l'empreinte SHA-256 de son contenu : le même fichier deux fois n'ajoute rien. Pas de dédoublonnage entre une course Strava et le même parcours importé en fichier.
- **GPX / FIT** : l'import calcule distance, allures, splits, records et dénivelé à partir des points. Le fichier doit contenir l'heure de chaque point.
- **Relief** : le coût du relief est un modèle simple (+3,3 % de temps par % de montée, −1,8 % par % de descente), à calibrer sur tes sorties.

## Commandes

```bash
npm test         # tests unitaires
npm run typecheck
npm run build
```

## Limites connues

La synchronisation initiale plafonne à 1 000 activités. Les chaussures viennent de l'équipement Strava affecté à tes sorties (lecture non vérifiée sur une vraie paire : aucune de tes courses n'en a). La carte est un schéma dessiné à partir du tracé, sans fond de carte : aucun service tiers ne voit où tu cours. Sur mobile, le texte des graphiques est agrandi par CSS, sans redessin au redimensionnement.
