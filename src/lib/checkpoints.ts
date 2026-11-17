import { segmentFactor } from "./riegel";

export type Checkpoint = { km: number; name: string; note: string };
export type PlannedCheckpoint = Checkpoint & {
  time_s: number;               // temps de passage cible
  segment_pace_s: number | null; // allure cible depuis le repère précédent
  segment_elev_m: number;       // dénivelé depuis le repère précédent
  altitude_m: number | null;
};

function interp(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  let lo = 0, hi = xs.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
  return xs[hi] === xs[lo] ? ys[lo] : ys[lo] + ((ys[hi] - ys[lo]) * (x - xs[lo])) / (xs[hi] - xs[lo]);
}

// Répartit le temps cible sur le parcours : plus lent en montée, plus rapide en descente, arrivée pile à l'objectif.
export function planCheckpoints(checkpoints: Checkpoint[], profile: [number, number][], distanceKm: number, targetS: number): PlannedCheckpoint[] {
  const hasProfile = profile.length >= 2;
  const xs = hasProfile ? profile.map((p) => p[0]) : [0, distanceKm];
  const alt = hasProfile ? profile.map((p) => p[1]) : [0, 0];
  const w = [0];
  for (let i = 1; i < xs.length; i++) w.push(w[i - 1] + segmentFactor(xs[i - 1], alt[i - 1], xs[i], alt[i]) * Math.max(0, xs[i] - xs[i - 1]));
  const profEnd = xs[xs.length - 1], scale = profEnd / distanceKm;
  const timeAt = (km: number) => (targetS * interp(xs, w, km * scale)) / w[w.length - 1];

  const sorted = checkpoints.filter((c) => c.km > 0 && c.km <= distanceKm + 0.01).sort((a, b) => a.km - b.km);
  let prevKm = 0, prevT = 0, prevAlt = interp(xs, alt, 0);
  return sorted.map((c) => {
    const t = timeAt(c.km), a = interp(xs, alt, c.km * scale);
    const out: PlannedCheckpoint = {
      ...c,
      time_s: Math.round(t),
      segment_pace_s: c.km > prevKm ? (t - prevT) / (c.km - prevKm) : null,
      segment_elev_m: hasProfile ? Math.round(a - prevAlt) + 0 : 0,
      altitude_m: hasProfile ? Math.round(a) : null,
    };
    prevKm = c.km; prevT = t; prevAlt = a;
    return out;
  });
}
