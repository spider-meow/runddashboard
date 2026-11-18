import { bestEfforts, projectRace, type RaceInput } from "./projection";
import type { GradeModel } from "./riegel";

type RunRow = { id: string; started_at: string; distance_m: number; moving_time_s: number; best_efforts: Record<string, number> | null; name: string };
type RaceRow = RaceInput & { race_date: string; target_pace_s: number | null };

const DAY = 86400000;

// La sortie qui correspond à une course passée : même jour (à un jour près, fuseaux), distance à 6 % près. Pas de saisie du résultat :
// la course est retrouvée parmi les sorties synchronisées. Si plusieurs conviennent, la plus proche en distance.
export function findRaceRun<T extends RunRow>(race: { race_date: string; distance_m: number }, runs: T[]): T | null {
  const day = Date.parse(race.race_date.slice(0, 10));
  const ok = runs.filter((r) => Math.abs(Date.parse(r.started_at.slice(0, 10)) - day) <= DAY && Math.abs(r.distance_m - race.distance_m) <= 0.06 * race.distance_m);
  ok.sort((a, b) => Math.abs(a.distance_m - race.distance_m) - Math.abs(b.distance_m - race.distance_m));
  return ok[0] ?? null;
}

export type Review = {
  run: RunRow;
  actual_s: number;            // temps réalisé, ramené à la distance officielle de la course
  projected_s: number | null;  // ce que le modèle prédisait avec la forme de la veille
  errorPct: number | null;     // (réalisé − projeté) / projeté, en % : négatif = meilleur que prévu
  vsTargetS: number | null;    // réalisé − objectif, en secondes : négatif = objectif battu
  inRange: boolean | null;     // le temps réalisé était-il dans la fourchette annoncée ?
};

// Bilan d'une course passée : temps réalisé contre objectif et contre la projection qu'on aurait faite la veille (efforts antérieurs seulement).
export function raceReview(race: RaceRow, runs: RunRow[], model?: GradeModel): Review | null {
  const run = findRaceRun(race, runs);
  if (!run) return null;
  const actual_s = run.moving_time_s * (race.distance_m / run.distance_m);
  const before = new Date(Date.parse(race.race_date.slice(0, 10)) - DAY);
  const rp = projectRace(bestEfforts(runs.filter((r) => r.id !== run.id), new Date(0), before), race, model);
  return {
    run, actual_s,
    projected_s: rp?.time_s ?? null,
    errorPct: rp ? ((actual_s - rp.time_s) / rp.time_s) * 100 : null,
    vsTargetS: race.target_pace_s ? actual_s - race.target_pace_s * (race.distance_m / 1000) : null,
    inRange: rp ? actual_s >= rp.low && actual_s <= rp.high : null,
  };
}
