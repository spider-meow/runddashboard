import { genericGradeFactor, profileGradeFactor, riegel, DEFAULT_GRADE_MODEL, type GradeModel } from "./riegel";

// Moteur de projection, sans aucun réglage à la main : il choisit lui-même les efforts de référence, l'exposant de Riegel,
// le coût du relief (calibré ailleurs) et la fourchette d'incertitude.

export type Effort = { name: string; distance_km: number; time_s: number; date: string };
type RunLike = { started_at: string; best_efforts: Record<string, number> | null };

const REF: [string, number][] = [["5K", 5], ["10K", 10], ["15K", 15], ["Semi", 21.0975]]; // 1 km est trop court pour extrapoler
export const SEMI = 21.0975;
export const RECENT_DAYS = 120;
const DAY = 86400000;

// Meilleur temps de chaque distance de référence sur une fenêtre de dates [from, to].
export function bestEfforts(runs: RunLike[], from: Date, to: Date): Effort[] {
  const out = new Map<string, Effort>();
  for (const r of runs) {
    const t = Date.parse(r.started_at);
    if (t < from.getTime() || t > to.getTime()) continue;
    for (const [name, distance_km] of REF) {
      const time_s = r.best_efforts?.[name];
      if (time_s && (!out.has(name) || time_s < out.get(name)!.time_s)) out.set(name, { name, distance_km, time_s, date: r.started_at.slice(0, 10) });
    }
  }
  return [...out.values()];
}

// Forme actuelle : les meilleurs efforts des 4 derniers mois. S'il n'y en a pas, on retombe sur tout l'historique (stale = true).
export function currentForm(runs: RunLike[], now: Date): { efforts: Effort[]; stale: boolean } {
  const recent = bestEfforts(runs, new Date(now.getTime() - RECENT_DAYS * DAY), now);
  if (recent.length) return { efforts: recent, stale: false };
  return { efforts: bestEfforts(runs, new Date(0), now), stale: true };
}

// Exposant de Riegel propre au coureur : pente de ln(temps) sur ln(distance) entre ses meilleurs efforts récents, ramenée à moitié vers
// 1,06 (deux ou trois points sont bruités) et bornée à [1,03 ; 1,10]. Moins de deux distances : 1,06.
export function personalExponent(efforts: Effort[]): number {
  const pts = efforts.filter((e) => e.distance_km >= 5);
  if (pts.length < 2) return 1.06;
  const xs = pts.map((e) => Math.log(e.distance_km)), ys = pts.map((e) => Math.log(e.time_s));
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0), sxy = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  if (sxx === 0) return 1.06;
  return Math.min(1.10, Math.max(1.03, 1.06 + (sxy / sxx - 1.06) * 0.5));
}

export type Part = { effort: Effort; time_s: number; weight: number };
export type Projection = { time_s: number; low: number; high: number; k: number; parts: Part[]; nearest: Effort | null };

// Temps projeté sur targetKm, à plat. Chaque effort donne sa propre projection ; les plus proches de la distance visée pèsent le plus.
// La fourchette combine le désaccord entre efforts et une incertitude qui grandit quand on extrapole loin (au moins ± 1,2 %).
export function project(efforts: Effort[], targetKm: number, k = personalExponent(efforts)): Projection | null {
  if (!efforts.length) return null;
  // Au-delà d'un semi, la fatigue pèse plus : l'exposant monte un peu (le marathon n'est pas un 5 km étiré).
  const kk = targetKm > 25 ? k + 0.015 : k;
  const parts: Part[] = efforts.map((e) => ({ effort: e, time_s: riegel(e.time_s, e.distance_km, targetKm, kk), weight: 1 / (1 + Math.abs(Math.log(targetKm / e.distance_km))) ** 2 }));
  const wsum = parts.reduce((a, p) => a + p.weight, 0), mean = parts.reduce((a, p) => a + p.time_s * p.weight, 0) / wsum;
  const sd = Math.sqrt(parts.reduce((a, p) => a + p.weight * (p.time_s - mean) ** 2, 0) / wsum);
  const nearest = efforts.reduce((b, e) => (Math.abs(Math.log(targetKm / e.distance_km)) < Math.abs(Math.log(targetKm / b.distance_km)) ? e : b));
  const reach = 0.012 + 0.012 * Math.abs(Math.log2(targetKm / nearest.distance_km)), half = Math.max(sd, reach * mean);
  return { time_s: mean, low: mean - Math.min(half, 0.06 * mean), high: mean + Math.min(half, 0.06 * mean), k: kk, parts, nearest };
}

export type RaceInput = { distance_m: number; elevation_gain_m: number | null; course_profile: [number, number][] | null; target_pace_s: number | null };
export type RaceProjection = { flat: number; time_s: number; low: number; high: number; paceS: number; gradeFactor: number; gapS: number | null; proj: Projection };

// Projection d'une course : temps à plat, puis coût du relief (profil du parcours si on l'a, sinon dénivelé total).
export function projectRace(efforts: Effort[], race: RaceInput, model: GradeModel = DEFAULT_GRADE_MODEL): RaceProjection | null {
  const km = race.distance_m / 1000, proj = project(efforts, km);
  if (!proj) return null;
  const gradeFactor = race.course_profile && race.course_profile.length > 1 ? profileGradeFactor(race.course_profile, model) : genericGradeFactor(race.distance_m, race.elevation_gain_m ?? 0, model);
  const time_s = proj.time_s * gradeFactor;
  return { flat: proj.time_s, time_s, low: proj.low * gradeFactor, high: proj.high * gradeFactor, paceS: time_s / km, gradeFactor, gapS: race.target_pace_s ? time_s - race.target_pace_s * km : null, proj };
}

export type TrendPoint = { end: string; time_s: number };

// Évolution de la forme : temps projeté sur semi à la fin de chacune des dernières fenêtres de 4 semaines (celles sans effort sont sautées).
export function formTrend(runs: RunLike[], now: Date, windows = 6): TrendPoint[] {
  const out: TrendPoint[] = [];
  for (let i = windows - 1; i >= 0; i--) {
    const to = new Date(now.getTime() - i * 28 * DAY), from = new Date(to.getTime() - 56 * DAY); // 8 semaines glissantes, pas de 4
    const p = project(bestEfforts(runs, from, to), SEMI);
    if (p) out.push({ end: to.toISOString().slice(0, 10), time_s: p.time_s });
  }
  return out;
}
