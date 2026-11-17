type RunRef = { id: string; source: string; started_at: string; distance_m: number };

const START_TOLERANCE_MS = 10 * 60 * 1000; // une montre et Strava ne s'accordent pas à la seconde sur le départ
const DISTANCE_TOLERANCE = 0.03;            // ni au mètre sur la distance (GPS lissé, pauses)

// Sorties importées d'un fichier (GPX/FIT) qui existent déjà côté Strava : même départ (à 10 min près) et même distance (à 3 % près).
// Renvoie, pour chaque sortie importée en doublon, l'identifiant de la sortie Strava correspondante.
export function findDuplicates(runs: RunRef[]): Map<string, string> {
  const strava = runs.filter((r) => r.source === "strava").map((r) => ({ id: r.id, t: Date.parse(r.started_at), d: r.distance_m }));
  const out = new Map<string, string>();
  for (const r of runs) {
    if (r.source === "strava") continue;
    const t = Date.parse(r.started_at);
    const twin = strava.find((s) => Math.abs(s.t - t) <= START_TOLERANCE_MS && Math.abs(s.d - r.distance_m) <= DISTANCE_TOLERANCE * s.d);
    if (twin) out.set(r.id, twin.id);
  }
  return out;
}
