-- Matériel (chaussures) lu depuis Strava. Les kilomètres affichés sont recalculés à partir des courses en base (activities.gear_id).
create table gear (
  id          text primary key,           -- identifiant Strava, par exemple "g12345678"
  name        text not null,
  brand_name  text,
  model_name  text,
  distance_m  real,                       -- cumul vu par Strava à la dernière lecture
  updated_at  timestamptz not null default now()
);

-- Même règle que les autres tables : RLS sans policy, accès serveur uniquement.
alter table gear enable row level security;
revoke all on gear from anon, authenticated;
