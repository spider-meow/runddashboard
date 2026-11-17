// Analyse d'un flux (distance cumulée en m, temps en s, altitude en m). Même code pour Strava, GPX et FIT.
export type Stream = { distance: number[]; time: number[]; altitude?: number[] | null };
export type Split = { km: number; time_s: number; elev_m: number; partial: boolean };
export type Analysis = {
  splits: Split[];
  best_efforts: Record<string, number>;
  elev_profile: [number, number][];
  elevation_gain_m: number;
};

const BEST: Record<string, number> = { "1K": 1000, "5K": 5000, "10K": 10000, "15K": 15000, Semi: 21097.5 };
const round1 = (v: number) => Math.round(v * 10) / 10;

// Valeur interpolée linéairement à la distance d (dist est croissant).
function at(dist: number[], vals: number[], d: number): number {
  const last = dist.length - 1;
  if (d <= dist[0]) return vals[0];
  if (d >= dist[last]) return vals[last];
  let lo = 0, hi = last;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (dist[m] <= d) lo = m; else hi = m; }
  const span = dist[hi] - dist[lo];
  return span === 0 ? vals[lo] : vals[lo] + ((vals[hi] - vals[lo]) * (d - dist[lo])) / span;
}

// Dénivelé positif avec hystérésis de 1 m : le bruit de l'altimètre ne compte pas.
export function elevationGain(altitude: number[], threshold = 1): number {
  if (!altitude.length) return 0;
  let ref = altitude[0], gain = 0;
  for (const a of altitude) {
    if (a - ref >= threshold) { gain += a - ref; ref = a; }
    else if (ref - a >= threshold) ref = a;
  }
  return Math.round(gain);
}

// Profil [km, altitude] sous-échantillonné à environ 150 points.
export function elevProfile(distance: number[], altitude: number[], maxPoints = 150): [number, number][] {
  if (altitude.length < 2) return [];
  const step = Math.max(1, Math.floor(altitude.length / maxPoints));
  const out: [number, number][] = [];
  for (let i = 0; i < altitude.length; i += step) out.push([Math.round(distance[i]) / 1000, round1(altitude[i])]);
  const l = altitude.length - 1;
  if ((l % step) !== 0) out.push([Math.round(distance[l]) / 1000, round1(altitude[l])]);
  return out;
}

export function analyzeStream(s: Stream): Analysis {
  const { distance, time, altitude } = s;
  const n = distance.length;
  const empty: Analysis = { splits: [], best_efforts: {}, elev_profile: [], elevation_gain_m: 0 };
  if (n < 2 || time.length !== n) return empty;
  const total = distance[n - 1];

  const splits: Split[] = [];
  for (let k = 1; (k - 1) * 1000 < total; k++) {
    const d0 = (k - 1) * 1000, d1 = Math.min(k * 1000, total);
    if (d1 - d0 < 100) break; // un reste de moins de 100 m ne fait pas un split lisible
    splits.push({
      km: k,
      time_s: round1(at(distance, time, d1) - at(distance, time, d0)),
      elev_m: altitude && altitude.length === n ? round1(at(distance, altitude, d1) - at(distance, altitude, d0)) : 0,
      partial: d1 - d0 < 1000 - 1e-6,
    });
  }

  const best_efforts: Record<string, number> = {};
  for (const [name, d] of Object.entries(BEST)) {
    if (total < d) continue;
    let best = Infinity;
    for (let i = 0; i < n && distance[i] + d <= total; i++) best = Math.min(best, at(distance, time, distance[i] + d) - time[i]);
    if (isFinite(best)) best_efforts[name] = Math.round(best);
  }

  const alt = altitude && altitude.length === n ? altitude : null;
  return { splits, best_efforts, elev_profile: alt ? elevProfile(distance, alt) : [], elevation_gain_m: alt ? elevationGain(alt) : 0 };
}
