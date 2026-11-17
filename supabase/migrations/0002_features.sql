-- Analyse calculée localement à partir du flux (temps, distance, altitude) : même code pour Strava, GPX et FIT.
alter table activities
  add column splits       jsonb,         -- [{km, time_s, elev_m, partial}]
  add column best_efforts jsonb,         -- {"1K": secondes, "5K": ..., "10K": ..., "15K": ..., "Semi": ...}
  add column elev_profile jsonb,         -- [[km, altitude_m], ...] sous-échantillonné
  add column analyzed_at  timestamptz;   -- null = à analyser à la prochaine synchro

-- Courses à venir.
create table races (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  race_date         date not null,
  distance_m        real not null,
  elevation_gain_m  real,
  target_pace_s     real,                -- objectif en secondes par km
  course_polyline   text,                -- tracé importé depuis un GPX
  course_profile    jsonb,               -- [[km, altitude_m], ...]
  checkpoints       jsonb not null default '[]',   -- [{km, name, note}]
  notes             text,
  created_at        timestamptz not null default now()
);

-- Personnalisation : une seule ligne (dashboard à un seul utilisateur).
create table user_prefs (
  id      int primary key default 1 check (id = 1),
  theme   text not null default 'poster',
  accent  text,
  widgets jsonb not null default '{}'    -- {"home": [{id, visible, size}], "historique": [...]}
);
insert into user_prefs (id) values (1);

-- Même règle que 0001 : RLS sans policy, accès serveur uniquement avec la clé secrète.
alter table races      enable row level security;
alter table user_prefs enable row level security;
revoke all on races, user_prefs from anon, authenticated;

-- La prochaine course.
insert into races (name, race_date, distance_m, elevation_gain_m, target_pace_s, checkpoints, notes)
values ('Les Collines de Garches', '2026-11-22', 16200, 275, 290,
  '[{"km":5,"name":"5 km","note":""},{"km":10,"name":"10 km","note":""},{"km":15,"name":"15 km","note":""},{"km":16.2,"name":"Arrivée","note":""}]',
  'Objectif 4:50 /km, soit 1:18:18.');
