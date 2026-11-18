import type { Checkpoint, PlannedCheckpoint } from "./checkpoints";
import { DEFAULT_GRADE_MODEL, segmentFactor, type GradeModel } from "./riegel";

// Stratégie de course calculée, sans réglage : répartition de l'allure kilomètre par kilomètre selon le relief et un schéma d'effort
// (départ retenu, effort constant, fin libérée), consignes par kilomètre, montées et descentes marquantes, ravitaillement.

export type KmRow = {
  km: number;          // numéro du kilomètre (le dernier peut être partiel)
  from: number; to: number;
  len_km: number;
  elev_m: number;      // dénivelé du kilomètre
  grade: number;       // pente moyenne en %
  time_s: number;      // temps visé pour ce kilomètre
  pace_s: number;      // allure visée (s/km)
  cum_s: number;       // temps de passage à la fin du kilomètre
  note: string;
};

function altAt(profile: [number, number][], km: number): number {
  if (!profile.length) return 0;
  if (km <= profile[0][0]) return profile[0][1];
  const last = profile[profile.length - 1];
  if (km >= last[0]) return last[1];
  let lo = 0, hi = profile.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (profile[m][0] <= km) lo = m; else hi = m; }
  const span = profile[hi][0] - profile[lo][0];
  return span === 0 ? profile[lo][1] : profile[lo][1] + ((profile[hi][1] - profile[lo][1]) * (km - profile[lo][0])) / span;
}

// Schéma d'effort : départ retenu (les deux premiers kilomètres un peu plus lents, 2,5 % puis 1 %), effort constant ensuite,
// dernier cinquième un peu plus vite (1,5 %) : c'est ce qui réussit le mieux sur semi et plus, et ça protège d'un départ trop rapide.
export const shape = (fraction: number): number => (fraction < 0.04 ? 1.025 : fraction < 0.1 ? 1.01 : fraction > 0.8 ? 0.985 : 1);

export function planKm(profile: [number, number][], distanceKm: number, targetS: number, model: GradeModel = DEFAULT_GRADE_MODEL): KmRow[] {
  const prof = profile.length >= 2 ? [...profile].sort((a, b) => a[0] - b[0]) : [];
  // Le profil importé peut être un peu plus court ou long que la distance déclarée : on l'étire sur la distance de la course.
  const scale = prof.length ? prof[prof.length - 1][0] / distanceKm : 1;
  const n = Math.ceil(distanceKm - 1e-9), rows: Omit<KmRow, "time_s" | "pace_s" | "cum_s" | "note">[] = [], w: number[] = [];
  for (let i = 0; i < n; i++) {
    const from = i, to = Math.min(distanceKm, i + 1), len = to - from;
    const a0 = prof.length ? altAt(prof, from * scale) : 0, a1 = prof.length ? altAt(prof, to * scale) : 0;
    const f = prof.length ? segmentFactor(from * scale, a0, to * scale, a1, model) : 1;
    rows.push({ km: i + 1, from, to, len_km: len, elev_m: Math.round(a1 - a0), grade: (a1 - a0) / (len * 1000) * 100 });
    w.push(len * f * shape((from + len / 2) / distanceKm));
  }
  const wsum = w.reduce((a, b) => a + b, 0);
  let cum = 0;
  return rows.map((r, i) => {
    const time_s = (targetS * w[i]) / wsum;
    cum += time_s;
    const note = noteFor(r, i, n, distanceKm);
    return { ...r, time_s, pace_s: time_s / r.len_km, cum_s: cum, note };
  });
}

function noteFor(r: { grade: number; from: number; to: number }, i: number, n: number, dist: number): string {
  if (i === n - 1) return "Dernier kilomètre : tout ce qui reste.";
  if (i === 0) return "Départ : retiens-toi, c'est plus lent exprès.";
  if (r.grade >= 3) return `Montée à ${Math.round(r.grade)} % : même effort, l'allure baisse d'elle-même.`;
  if (r.grade <= -3) return "Descente : relâche, laisse filer sans freiner.";
  if (r.from < dist * 0.8 && r.to >= dist * 0.8) return "Dernier cinquième : si les jambes répondent, accélère progressivement.";
  return "";
}

export type Climb = { from_km: number; to_km: number; gain_m: number; grade: number };

// Montées marquantes : kilomètres consécutifs à plus de 2,5 % de pente moyenne, d'au moins 600 m cumulés et 15 m de gain.
export function climbs(rows: KmRow[]): Climb[] {
  const out: Climb[] = [];
  let cur: KmRow[] = [];
  const flush = () => {
    const len = cur.reduce((a, r) => a + r.len_km, 0), gain = cur.reduce((a, r) => a + r.elev_m, 0);
    if (cur.length && len >= 0.6 && gain >= 15) out.push({ from_km: cur[0].from, to_km: cur[cur.length - 1].to, gain_m: Math.round(gain), grade: (gain / (len * 1000)) * 100 });
    cur = [];
  };
  for (const r of rows) { if (r.grade >= 2.5) cur.push(r); else flush(); }
  flush();
  return out;
}

export type FuelItem = { t_s: number; km: number; text: string };
export type Fuel = { summary: string; items: FuelItem[] };

// Ravitaillement selon la durée visée : rien en dessous de 50 min, un gel vers 40 min jusqu'à 1 h 30, puis un gel toutes les 30 min
// (toutes les 25 min au-delà de 2 h 30), soit environ 50 à 60 g de glucides par heure. Repères généraux, pas un avis médical.
export function fuelPlan(targetS: number, rows: KmRow[]): Fuel {
  const kmAt = (t: number) => {
    const r = rows.find((x) => x.cum_s >= t) ?? rows[rows.length - 1];
    if (!r) return 0;
    const start = r.cum_s - r.time_s;
    return Math.round((r.from + (r.len_km * (t - start)) / r.time_s) * 10) / 10;
  };
  const min = targetS / 60, items: FuelItem[] = [];
  if (min < 50) return { summary: "Pas de ravitaillement nécessaire : bois si tu as soif, sans t'arrêter.", items };
  const every = min >= 150 ? 25 : 30, first = min < 90 ? 40 : 30;
  for (let t = first; t < min - 12; t += min < 90 ? 999 : every) items.push({ t_s: t * 60, km: kmAt(t * 60), text: "Gel (environ 25 g de glucides) avec quelques gorgées d'eau" });
  return { summary: min < 90 ? "Un gel vers 40 minutes suffit, avec de l'eau aux ravitos." : `Un gel toutes les ${every} minutes (50 à 60 g de glucides par heure), avec de l'eau à chaque ravito.`, items };
}

// Temps de passage à un point kilométrique, lu sur le plan (interpolé dans le kilomètre).
export function timeAtKm(rows: KmRow[], km: number): number {
  if (!rows.length || km <= 0) return 0;
  const r = rows.find((x) => x.to >= km - 1e-9) ?? rows[rows.length - 1];
  return r.cum_s - r.time_s + (r.time_s * (Math.min(km, r.to) - r.from)) / r.len_km;
}

// Repères de passage de la fiche, cohérents avec le plan kilomètre par kilomètre (même schéma d'effort, même relief).
export function passagesFromPlan(checkpoints: Checkpoint[], rows: KmRow[], profile: [number, number][], distanceKm: number): PlannedCheckpoint[] {
  const prof = profile.length >= 2 ? [...profile].sort((a, b) => a[0] - b[0]) : [], scale = prof.length ? prof[prof.length - 1][0] / distanceKm : 1;
  let prevKm = 0, prevT = 0, prevAlt = prof.length ? altAt(prof, 0) : 0;
  return checkpoints.filter((c) => c.km > 0 && c.km <= distanceKm + 0.01).sort((a, b) => a.km - b.km).map((c) => {
    const t = timeAtKm(rows, c.km), a = prof.length ? altAt(prof, c.km * scale) : 0;
    const out: PlannedCheckpoint = { ...c, time_s: Math.round(t), segment_pace_s: c.km > prevKm ? (t - prevT) / (c.km - prevKm) : null, segment_elev_m: prof.length ? Math.round(a - prevAlt) + 0 : 0, altitude_m: prof.length ? Math.round(a) : null };
    prevKm = c.km; prevT = t; prevAlt = a;
    return out;
  });
}
