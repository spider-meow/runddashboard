# Plan

Dashboard de running perso. Un seul utilisateur (toi). Gratuit : Vercel Hobby + Supabase Free.

## Contraintes vérifiées

| Sujet | Fait | Conséquence |
|---|---|---|
| Vercel Hobby, cron | 1 exécution par jour max, précision à l'heure ([doc](https://vercel.com/docs/cron-jobs/usage-and-pricing)) | Le cron ne suffit pas pour une sync « live ». Il sert de filet de sécurité quotidien. La sync principale passe par le webhook Strava. |
| Supabase Free | projet mis en pause après ~1 semaine sans activité ([doc](https://supabase.com/docs/guides/platform/free-project-pausing)) | Le cron quotidien fait aussi une requête légère : il garde la base éveillée. |
| Strava webhook | 1 abonnement par app, événements « fins » (id d'objet seulement), pas signés ([doc](https://developers.strava.com/docs/webhooks/)) | Chaque événement déclenche un appel API pour récupérer l'activité. Vérifier le `verify_token` et ne faire confiance qu'à l'id, jamais au contenu. |
| Strava quotas | par app, fenêtre de 15 min + quota journalier ; valeurs exactes sur `strava.com/settings/api` (sources divergentes : 100/1000 ou 200/2000) | Un seul utilisateur : largement suffisant. Backfill initial paginé et reprenable. |

## Choix techniques

- **Next.js (App Router) + TypeScript**, déployé sur Vercel. Un seul dépôt.
- **Supabase** : Postgres seul, sans Auth. Le dashboard est **privé** : d'après la presse, l'accord API de Strava limite l'affichage des données d'un athlète à lui-même (texte de l'accord non vérifié), et un tracé GPS peut révéler son domicile. Le login Strava, limité à `OWNER_ATHLETE_ID`, pose un cookie de session signé (HMAC). RLS activée sans aucune policy ; le serveur accède aux tables avec la clé secrète Supabase.
- **Pas de lib de graphiques** : SVG maison (les maquettes le prouvent, et c'est le plus petit code). À rediscuter si besoin d'interactions complexes.
- **Pas de carte à tuiles au début** : le tracé est dessiné en SVG seul, sur fond neutre. Fond de carte (MapLibre + tuiles libres) en phase ultérieure.
- **Pas de tests écrits pour les maquettes**. À partir du prototype : tests sur les fonctions pures (Riegel, allures, dédup, parseur GPX) avant le code, puis un smoke test de bout en bout.

## Secrets et sécurité

- `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` : variables Vercel, jamais préfixées `NEXT_PUBLIC_`. Seuls `NEXT_PUBLIC_SUPABASE_URL` et la clé `anon` sont côté navigateur.
- OAuth Strava : routes `/api/strava/connect` (redirection avec `state` aléatoire stocké en cookie httpOnly) et `/api/strava/callback` (échange du code, stockage des tokens dans une table inaccessible au client).
- Tokens Strava dans `strava_connections`, RLS sans aucune policy pour le rôle `anon`/`authenticated` : lecture uniquement via la clé service côté serveur.
- Aucun fichier `.env` committé. Dépôt public : aucun vrai GPS, aucune donnée perso dans le repo.

## Schéma (v1)

```sql
create table strava_connections (
  athlete_id bigint primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,              -- epoch en secondes, comme Strava
  scope text,
  updated_at timestamptz default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('strava','gpx','fit')),
  external_id text not null,               -- id Strava, ou hash du fichier importé
  name text, sport text,
  started_at timestamptz not null,
  distance_m real not null,
  moving_time_s int not null,
  elapsed_time_s int,
  elevation_gain_m real,
  avg_hr real, max_hr real,
  gear_id text,
  polyline text,                           -- tracé simplifié pour les cartes
  splits_km jsonb,                         -- [{km, time_s, elev_m, hr}]
  raw jsonb,
  created_at timestamptz default now(),
  unique (source, external_id)             -- la déduplication
);
create index on activities (started_at desc);

create table races (                       -- courses à venir
  id uuid primary key default gen_random_uuid(),
  name text not null, date date not null,
  distance_m real not null, elevation_gain_m real,
  target_pace_s_per_km real,
  course_polyline text, checkpoints jsonb, notes text
);

create table user_prefs (                  -- personnalisation
  id int primary key default 1 check (id = 1),
  theme text default 'ember',
  accent text,
  widgets jsonb                            -- [{id, visible, order, size}]
);
```

Dédup : `insert … on conflict (source, external_id) do update`. Une activité Strava resynchronisée ou modifiée met à jour la ligne, ne la double jamais. Un import GPX/FIT a pour `external_id` un hash du contenu ; le même fichier deux fois n'ajoute rien. Pas de dédup croisée Strava/fichier en v1 (à décider en phase 4).

## Formules

- **Riegel** : `T2 = T1 × (D2 / D1)^1.06`. Base : meilleure performance récente sur 5 à 21 km, pas un effort isolé.
- **Ajustement au dénivelé** : correction par pente style Minetti/Strava GAP, calculée sur le profil de la course visée, et comparée au profil de la course de référence. Les coefficients sont à calibrer sur tes données réelles. La projection affiche une fourchette, pas un chiffre unique.
- **Objectif Garches** : 16,2 km × 4:50/km = 4698 s = **1:18:18**.

## État (17 novembre 2026)

Faits : phases 1 à 8 sauf le fond de carte et les chaussures. Voir le README. Restent : appliquer `0002_features.sql`, déployer, créer l'abonnement webhook, calibrer le modèle de relief sur de vraies sorties.

## Phases

0. **Maquettes** (ce lot). Écrans HTML statiques, thèmes, mouvement. Validation avant tout code.
1. **Prototype minimal** : connexion Strava (OAuth), table `activities`, écran avec la dernière course. Rien d'autre.
2. **Sync** : backfill, webhook, cron quotidien, déduplication.
3. **Écrans** : accueil complet, historique, records.
4. **Import GPX/FIT** (plan B) et dédup croisée.
5. **Projections** Riegel + dénivelé ; suivi des chaussures (`gear`).
6. **Fiches de course** et repères de passage.
7. **Personnalisation persistée** (widgets, thème, accent dans `user_prefs`).
8. **Fond de carte** et finitions de mouvement.

## Hors prototype (volontairement)

Plans d'entraînement, social, notifications, application native, IA.

## Questions ouvertes

- Direction visuelle par défaut (thème Ember sombre proposé, voir `DESIGN.md`).
- Lien exact du dépôt « StravaDashboard ».
- ~~Authentification~~ : tranché, dashboard privé (voir plus haut). Le prototype a deux tables (`strava_connections` et `activities`) : le refresh token Strava change à chaque rafraîchissement, il faut donc le stocker.
