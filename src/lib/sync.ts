import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeStream } from "./analyze";
import { fetchActivities, fetchGear, fetchStreams, mapActivity, needsRefresh, refreshTokens } from "./strava";

export const RUN_SPORTS = ["Run", "TrailRun", "VirtualRun"];

// Jeton d'accès valide : rafraîchi si besoin. Le refresh_token change à chaque fois, on stocke le nouveau.
export async function getAccessToken(db: SupabaseClient, athleteId: number): Promise<string> {
  const { data: conn } = await db.from("strava_connections").select("*").eq("athlete_id", athleteId).maybeSingle();
  if (!conn) throw new Error("Strava n'est pas connecté");
  if (!needsRefresh(conn.expires_at, Math.floor(Date.now() / 1000), 60)) return conn.access_token;
  const t = await refreshTokens(process.env.STRAVA_CLIENT_ID!, process.env.STRAVA_CLIENT_SECRET!, conn.refresh_token);
  const { error } = await db.from("strava_connections")
    .update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, updated_at: new Date().toISOString() })
    .eq("athlete_id", athleteId);
  if (error) throw new Error(error.message);
  return t.access_token;
}

// Analyse (splits, records, profil) des courses pas encore analysées. Limité pour rester sous les quotas Strava ;
// ce qui reste est repris à la synchro suivante.
export async function analyzePending(db: SupabaseClient, accessToken: string, limit = 30): Promise<number> {
  const { data: todo, error } = await db.from("activities").select("external_id").eq("source", "strava").in("sport", RUN_SPORTS).is("analyzed_at", null).order("started_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  let done = 0;
  for (const a of todo ?? []) {
    const s = await fetchStreams(accessToken, a.external_id);
    const r = s ? analyzeStream(s) : null; // sans flux : on marque quand même comme analysée pour ne pas réessayer sans fin
    const { error: e } = await db.from("activities").update({
      splits: r?.splits ?? null, best_efforts: r?.best_efforts ?? null, elev_profile: r?.elev_profile ?? null, analyzed_at: new Date().toISOString(),
    }).eq("source", "strava").eq("external_id", a.external_id);
    if (e) throw new Error(e.message);
    done++;
  }
  return done;
}

// Lit les paires de chaussures que la base ne connaît pas encore (une requête Strava par nouvelle paire).
export async function syncGear(db: SupabaseClient, accessToken: string, gearIds: (string | null | undefined)[]): Promise<number> {
  const wanted = [...new Set(gearIds.filter((g): g is string => !!g))];
  if (!wanted.length) return 0;
  const { data: known, error } = await db.from("gear").select("id").in("id", wanted);
  if (error) throw new Error(error.message);
  const have = new Set((known ?? []).map((g) => g.id));
  const rows = [];
  for (const id of wanted.filter((g) => !have.has(g))) {
    const g = await fetchGear(accessToken, id);
    if (g) rows.push({ ...g, updated_at: new Date().toISOString() });
  }
  if (rows.length) {
    const { error: e } = await db.from("gear").upsert(rows);
    if (e) throw new Error(e.message);
  }
  return rows.length;
}

// Synchronise les activités. Relançable à volonté : l'upsert sur (source, external_id) évite les doublons.
export async function syncActivities(db: SupabaseClient, athleteId: number): Promise<{ fetched: number; analyzed: number; analysisError?: string }> {
  const accessToken = await getAccessToken(db, athleteId);

  // 1re synchro : tout l'historique (10 pages max). Ensuite : depuis la dernière activité connue, avec 7 jours de recul pour les modifications.
  const { data: last } = await db.from("activities").select("started_at").eq("source", "strava").order("started_at", { ascending: false }).limit(1);
  const after = last?.[0] ? Math.floor(Date.parse(last[0].started_at) / 1000) - 7 * 86400 : null;

  const acts = await fetchActivities(accessToken, after);
  if (acts.length) {
    const { error } = await db.from("activities").upsert(acts.map(mapActivity), { onConflict: "source,external_id" });
    if (error) throw new Error(error.message);
  }

  // Le matériel et l'analyse sont des bonus : s'ils échouent (quota, migration pas encore appliquée), la synchro réussit quand même.
  // On part de toutes les paires utilisées en base (pas seulement des activités reçues cette fois) : la 1re synchro ne voit que 7 jours.
  try {
    const { data: used } = await db.from("activities").select("gear_id").not("gear_id", "is", null);
    await syncGear(db, accessToken, (used ?? []).map((r) => r.gear_id));
  } catch (e) { console.error("Lecture du matériel échouée", e); }
  try {
    return { fetched: acts.length, analyzed: await analyzePending(db, accessToken) };
  } catch (e) {
    console.error("Analyse des activités échouée", e);
    return { fetched: acts.length, analyzed: 0, analysisError: e instanceof Error ? e.message : String(e) };
  }
}
