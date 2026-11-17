import type { Split } from "./analyze";
import type { Checkpoint } from "./checkpoints";
import { db } from "./db";
import { THEMES, type Theme, type Widget } from "./prefs";
import { RUN_SPORTS } from "./sync";

export type Run = {
  id: string;
  source: string;
  external_id: string;
  name: string;
  started_at: string;
  distance_m: number;
  moving_time_s: number;
  elevation_gain_m: number | null;
  avg_hr: number | null;
  polyline: string | null;
  splits: Split[] | null;
  best_efforts: Record<string, number> | null;
  elev_profile: [number, number][] | null;
  analyzed_at: string | null;
};

export type Race = {
  id: string;
  name: string;
  race_date: string;
  distance_m: number;
  elevation_gain_m: number | null;
  target_pace_s: number | null;
  course_polyline: string | null;
  course_profile: [number, number][] | null;
  checkpoints: Checkpoint[];
  notes: string | null;
};

export type Prefs = { theme: Theme; accent: string | null; widgets: Record<string, Widget[]> };
export const DEFAULT_PREFS: Prefs = { theme: "poster", accent: null, widgets: {} };

// « select * » : les colonnes ajoutées par la migration 0002 arrivent à null tant qu'elle n'est pas appliquée.
export async function getRuns(): Promise<Run[]> {
  const { data, error } = await db().from("activities").select("*").in("sport", RUN_SPORTS).order("started_at", { ascending: false }).limit(1000);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, splits: r.splits ?? null, best_efforts: r.best_efforts ?? null, elev_profile: r.elev_profile ?? null, analyzed_at: r.analyzed_at ?? null }));
}

// Table absente = migration 0002 pas encore appliquée : les pages affichent un bandeau au lieu de planter.
const missingTable = (e: { code?: string; message?: string } | null) => !!e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message ?? ""));

export async function getRaces(): Promise<{ races: Race[]; migrationMissing: boolean }> {
  const { data, error } = await db().from("races").select("*").order("race_date", { ascending: true });
  if (missingTable(error)) return { races: [], migrationMissing: true };
  if (error) throw error;
  return { races: (data ?? []) as Race[], migrationMissing: false };
}

export async function getRace(id: string): Promise<Race | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db().from("races").select("*").eq("id", id).maybeSingle();
  if (error && !missingTable(error)) throw error;
  return (data as Race) ?? null;
}

export async function getPrefs(): Promise<Prefs> {
  const { data, error } = await db().from("user_prefs").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return DEFAULT_PREFS;
  return {
    theme: (THEMES as readonly string[]).includes(data.theme) ? data.theme : "poster",
    accent: data.accent ?? null,
    widgets: data.widgets && typeof data.widgets === "object" ? data.widgets : {},
  };
}
