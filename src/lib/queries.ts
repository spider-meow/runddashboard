import type { Split } from "./analyze";
import type { Checkpoint } from "./checkpoints";
import { db } from "./db";
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
  gear_id: string | null;
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

// Liste légère : sans tracé, splits ni profil (plusieurs Ko par sortie, inutiles pour les totaux, records et tableaux).
export type RunSummary = Omit<Run, "polyline" | "splits" | "elev_profile">;
const SUMMARY_COLS = "id,source,external_id,name,started_at,distance_m,moving_time_s,elevation_gain_m,avg_hr,gear_id,best_efforts,analyzed_at";

const withDefaults = (r: Record<string, unknown>) => ({ ...r, splits: r.splits ?? null, best_efforts: r.best_efforts ?? null, elev_profile: r.elev_profile ?? null, analyzed_at: r.analyzed_at ?? null, polyline: r.polyline ?? null });

// Les colonnes ajoutées par la migration 0002 n'existent pas tant qu'elle n'est pas appliquée : dans ce cas on relit avec « * » (elles arrivent à null).
export async function getRuns(): Promise<RunSummary[]> {
  const base = () => db().from("activities");
  let res = await base().select(SUMMARY_COLS).in("sport", RUN_SPORTS).order("started_at", { ascending: false }).limit(1000);
  if (res.error) res = await base().select("*").in("sport", RUN_SPORTS).order("started_at", { ascending: false }).limit(1000);
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((r) => withDefaults(r) as unknown as RunSummary);
}

// La dernière sortie en entier (splits, profil) : une seule ligne lourde au lieu de mille.
export async function getLastRun(): Promise<Run | null> {
  const { data, error } = await db().from("activities").select("*").in("sport", RUN_SPORTS).order("started_at", { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ? (withDefaults(data[0]) as unknown as Run) : null;
}

// Table absente = migration 0002 pas encore appliquée : les pages affichent un bandeau au lieu de planter.
const missingTable = (e: { code?: string; message?: string } | null) => !!e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message ?? ""));

export async function getRaces(): Promise<{ races: Race[]; migrationMissing: boolean }> {
  const { data, error } = await db().from("races").select("*").order("race_date", { ascending: true });
  if (missingTable(error)) return { races: [], migrationMissing: true };
  if (error) throw new Error(error.message);
  return { races: (data ?? []) as Race[], migrationMissing: false };
}

export async function getRace(id: string): Promise<Race | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db().from("races").select("*").eq("id", id).maybeSingle();
  if (error && !missingTable(error)) throw new Error(error.message);
  return (data as Race) ?? null;
}

export async function getGear(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await db().from("gear").select("id,name");
  if (error) return []; // table absente (migration 0003 pas appliquée) : pas de chaussures, sans bruit
  return data ?? [];
}

// Juste « la table des courses existe-t-elle » : évite de relire tous les tracés pour un simple bandeau.
export async function racesTableMissing(): Promise<boolean> {
  const { error } = await db().from("races").select("id").limit(1);
  return missingTable(error);
}
