// Appels Strava. Ce fichier ne tourne que côté serveur : il reçoit le secret client en paramètre, jamais depuis le navigateur.
const AUTHORIZE = "https://www.strava.com/oauth/authorize";
const TOKEN = "https://www.strava.com/api/v3/oauth/token";
const ACTIVITIES = "https://www.strava.com/api/v3/athlete/activities";

export type StravaSummary = {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time?: number;
  total_elevation_gain?: number;
  average_heartrate?: number; // non confirmé dans SummaryActivity : optionnel
  max_heartrate?: number;
  gear_id?: string | null;
  map?: { summary_polyline?: string | null };
};

export type ActivityRow = {
  source: "strava";
  external_id: string;
  name: string;
  sport: string | null;
  started_at: string;
  distance_m: number;
  moving_time_s: number;
  elapsed_time_s: number | null;
  elevation_gain_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  gear_id: string | null;
  polyline: string | null;
};

export type Tokens = { access_token: string; refresh_token: string; expires_at: number };

export const authorizeUrl = ({ clientId, redirectUri, state }: { clientId: string; redirectUri: string; state: string }) => {
  const u = new URL(AUTHORIZE);
  u.search = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code",
    approval_prompt: "auto", scope: "activity:read_all", state,
  }).toString();
  return u.toString();
};

export const needsRefresh = (expiresAt: number, nowS: number, marginS: number) => expiresAt - nowS <= marginS;

// (source, external_id) est la clé unique en base : l'upsert n'ajoute jamais de doublon.
export const mapActivity = (a: StravaSummary): ActivityRow => ({
  source: "strava",
  external_id: String(a.id),
  name: a.name,
  sport: a.sport_type ?? a.type ?? null,
  started_at: a.start_date,
  distance_m: a.distance,
  moving_time_s: a.moving_time,
  elapsed_time_s: a.elapsed_time ?? null,
  elevation_gain_m: a.total_elevation_gain ?? null,
  avg_hr: a.average_heartrate ?? null,
  max_hr: a.max_heartrate ?? null,
  gear_id: a.gear_id ?? null,
  polyline: a.map?.summary_polyline || null,
});

async function tokenRequest(body: Record<string, string>) {
  const r = await fetch(TOKEN, { method: "POST", body: new URLSearchParams(body) });
  if (!r.ok) throw new Error(`Strava token ${r.status}`);
  return r.json();
}

export const exchangeCode = (clientId: string, clientSecret: string, code: string): Promise<Tokens & { athlete: { id: number } }> =>
  tokenRequest({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code" });

// Le refresh_token peut changer à chaque rafraîchissement : l'appelant doit stocker le nouveau.
export const refreshTokens = (clientId: string, clientSecret: string, refreshToken: string): Promise<Tokens> =>
  tokenRequest({ client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token", refresh_token: refreshToken });

export async function fetchActivities(accessToken: string, afterEpoch: number | null, maxPages = 10): Promise<StravaSummary[]> {
  const all: StravaSummary[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const q = new URLSearchParams({ per_page: "100", page: String(page) });
    if (afterEpoch) q.set("after", String(afterEpoch));
    const r = await fetch(`${ACTIVITIES}?${q}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) throw new Error(`Strava activities ${r.status}`);
    const batch: StravaSummary[] = await r.json();
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}
