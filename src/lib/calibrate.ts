import type { Split } from "./analyze";
import { DEFAULT_GRADE_MODEL, type GradeModel } from "./riegel";

export type Calibration = {
  model: GradeModel;       // coefficients à utiliser (ceux de tes sorties, ou ceux par défaut si les données manquent)
  calibrated: boolean;
  km: number;              // kilomètres retenus pour l'ajustement
  runs: number;
  errDefault: number;      // erreur relative moyenne (RMS) de prédiction du temps d'un kilomètre, modèle par défaut
  errFitted: number;       // … modèle ajusté
  errFlat: number;         // … sans correction de relief
  fitted: GradeModel;      // coefficients trouvés, même quand il y a trop peu de données pour les adopter
};

// Seuil en dessous duquel l'ajustement ne vaut pas mieux que le modèle générique : environ 8 semi-marathons.
export const MIN_KM = 150;

type Seg = { t: number; g: number };

// Kilomètres complets de chaque sortie : temps et pente (%). On écarte les kilomètres qui ne ressemblent pas au reste de la sortie
// (pause, fractionné, ravitaillement : plus de 30 % d'écart avec l'allure médiane), car ce n'est pas le relief qui les explique.
function usable(runs: { splits: Split[] | null }[]): Seg[][] {
  const out: Seg[][] = [];
  for (const r of runs) {
    const full = (r.splits ?? []).filter((s) => !s.partial && s.time_s > 120 && s.time_s < 900);
    if (full.length < 4) continue;
    const med = [...full].map((s) => s.time_s).sort((a, b) => a - b)[Math.floor(full.length / 2)];
    const segs = full.filter((s) => Math.abs(s.time_s / med - 1) < 0.3).map((s) => ({ t: s.time_s, g: s.elev_m / 10 }));
    if (segs.length >= 4) out.push(segs);
  }
  return out;
}

const factor = (g: number, m: GradeModel) => Math.max(0.6, 1 + (g > 0 ? m.up : m.down) * g);

// Erreur relative RMS. Chaque sortie a sa propre allure à plat, calculée au mieux (moindres carrés), comme le modèle ne la connaît pas.
function error(runs: Seg[][], m: GradeModel): number {
  let sum = 0, n = 0;
  for (const segs of runs) {
    let sx = 0, sxx = 0;
    for (const s of segs) { const x = factor(s.g, m) / s.t; sx += x; sxx += x * x; }
    const p0 = sx / sxx;
    for (const s of segs) { const e = 1 - (p0 * factor(s.g, m)) / s.t; sum += e * e; n++; }
  }
  return n ? Math.sqrt(sum / n) : 0;
}

// Ajuste « +x % de temps par % de montée, −y % par % de descente » sur tes propres kilomètres, par recherche sur une grille.
export function calibrateGrade(raw: { splits: Split[] | null }[]): Calibration {
  const runs = usable(raw), km = runs.reduce((a, r) => a + r.length, 0);
  const errDefault = error(runs, DEFAULT_GRADE_MODEL), errFlat = error(runs, { up: 0, down: 0 });
  if (km === 0) return { model: DEFAULT_GRADE_MODEL, calibrated: false, km, runs: 0, errDefault, errFitted: errDefault, errFlat, fitted: DEFAULT_GRADE_MODEL };

  let best = DEFAULT_GRADE_MODEL, bestErr = errDefault;
  for (let up = 0.01; up <= 0.0601; up += 0.001) {
    for (let down = 0; down <= 0.0401; down += 0.001) {
      const m = { up: Math.round(up * 1000) / 1000, down: Math.round(down * 1000) / 1000 }, e = error(runs, m);
      if (e < bestErr - 1e-9) { best = m; bestErr = e; }
    }
  }
  const calibrated = km >= MIN_KM;
  return { model: calibrated ? best : DEFAULT_GRADE_MODEL, calibrated, km, runs: runs.length, errDefault, errFitted: bestErr, errFlat, fitted: best };
}
