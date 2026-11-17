# rundashboard

Dashboard de running perso, pour s'amuser. Next.js (TypeScript) + Supabase + Vercel, données Strava.

**État : prototype.** Connexion Strava, table d'activités, écran avec la dernière course. Le reste est dans [docs/PLAN.md](docs/PLAN.md).

| Quoi | Où |
|---|---|
| Plan, schéma, phases | [docs/PLAN.md](docs/PLAN.md) |
| Design (thème Poster par défaut) | [DESIGN.md](DESIGN.md) |
| Maquettes HTML des écrans suivants | [maquettes/](maquettes/index.html) |

## Dashboard privé

L'accord API de Strava interdit d'afficher les données d'un athlète à quelqu'un d'autre. Seul l'athlète `OWNER_ATHLETE_ID` peut se connecter : le retour OAuth refuse tout autre compte et pose un cookie de session signé. Sans ce cookie, la page n'affiche que le bouton de connexion.

## Mise en route (à faire par toi, secrets compris)

1. **Strava** : crée une application sur <https://www.strava.com/settings/api>. « Authorization Callback Domain » : `localhost` pour le local, puis ton domaine Vercel. Note l'ID client et le secret client.
2. **Supabase** : crée un projet gratuit, puis colle `supabase/migrations/0001_init.sql` dans le SQL editor. Récupère l'URL et la clé secrète (`sb_secret_…`) dans Project Settings > API Keys.
3. **Variables** : `cp .env.example .env.local` puis remplis-le. Ton identifiant d'athlète est le nombre dans l'URL de ton profil Strava (`strava.com/athletes/<id>`). `SESSION_SECRET` : une chaîne aléatoire de 32 caractères ou plus.
4. **Lancer** : `npm install`, `npm run dev`, ouvre <http://localhost:3000> et clique « Se connecter avec Strava ».

Sur Vercel, saisis les mêmes variables dans Project Settings > Environment Variables. Aucune n'est préfixée `NEXT_PUBLIC_` : aucune n'atteint le navigateur.

## Commandes

```bash
npm test         # tests unitaires (allure, tracé, session, mapping Strava)
npm run typecheck
npm run build
```

## Ce que le prototype ne fait pas encore

Webhook et cron de synchronisation, historique, records, projections, import GPX/FIT, personnalisation. Voir le plan.
