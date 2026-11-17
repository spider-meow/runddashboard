-- Jetons Strava. Le refresh_token change à chaque rafraîchissement, donc cette table est mise à jour en continu.
create table strava_connections (
  athlete_id    bigint primary key,
  access_token  text   not null,
  refresh_token text   not null,
  expires_at    bigint not null,            -- epoch en secondes, tel que Strava le renvoie
  scope         text,
  updated_at    timestamptz not null default now()
);

create table activities (
  id               uuid primary key default gen_random_uuid(),
  source           text not null check (source in ('strava', 'gpx', 'fit')),
  external_id      text not null,           -- id Strava, ou empreinte du fichier importé
  name             text not null,
  sport            text,
  started_at       timestamptz not null,
  distance_m       real not null,
  moving_time_s    int  not null,
  elapsed_time_s   int,
  elevation_gain_m real,
  avg_hr           real,
  max_hr           real,
  gear_id          text,
  polyline         text,                    -- tracé simplifié pour la carte
  created_at       timestamptz not null default now(),
  unique (source, external_id)              -- la déduplication : un upsert ne crée jamais de doublon
);
create index activities_started_at_idx on activities (started_at desc);

-- RLS activée et AUCUNE policy : le navigateur (clé publique) ne peut rien lire ni écrire.
-- Seul le serveur, avec la clé secrète Supabase (qui contourne la RLS), accède à ces tables.
alter table strava_connections enable row level security;
alter table activities         enable row level security;
revoke all on strava_connections, activities from anon, authenticated;
