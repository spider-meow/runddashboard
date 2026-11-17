import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchActivities, mapActivity, needsRefresh, refreshTokens } from "./strava";

// Synchronise les activités de l'athlète. Relançable à volonté : l'upsert sur (source, external_id) évite les doublons.
export async function syncActivities(db: SupabaseClient, athleteId: number): Promise<number> {
  const { data: conn } = await db.from("strava_connections").select("*").eq("athlete_id", athleteId).maybeSingle();
  if (!conn) throw new Error("Strava n'est pas connecté");

  let accessToken: string = conn.access_token;
  if (needsRefresh(conn.expires_at, Math.floor(Date.now() / 1000), 60)) {
    const t = await refreshTokens(process.env.STRAVA_CLIENT_ID!, process.env.STRAVA_CLIENT_SECRET!, conn.refresh_token);
    const { error } = await db.from("strava_connections")
      .update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, updated_at: new Date().toISOString() })
      .eq("athlete_id", athleteId);
    if (error) throw error;
    accessToken = t.access_token;
  }

  // 1re synchro : tout l'historique (10 pages max). Ensuite : depuis la dernière activité connue, avec 7 jours de recul pour les modifications.
  const { data: last } = await db.from("activities").select("started_at").eq("source", "strava").order("started_at", { ascending: false }).limit(1);
  const after = last?.[0] ? Math.floor(Date.parse(last[0].started_at) / 1000) - 7 * 86400 : null;

  const acts = await fetchActivities(accessToken, after);
  if (acts.length) {
    const { error } = await db.from("activities").upsert(acts.map(mapActivity), { onConflict: "source,external_id" });
    if (error) throw error;
  }
  return acts.length;
}
