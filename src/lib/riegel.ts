// Projection de Riegel : T2 = T1 × (D2 / D1)^k (k = 1,06 par défaut).
export const riegel = (t1: number, d1: number, d2: number, k = 1.06): number => t1 * Math.pow(d2 / d1, k);

// Coût du relief : +3,3 % de temps par % de montée, −1,8 % par % de descente (modèle type « allure ajustée à la pente »,
// à calibrer sur tes propres sorties). Renvoie un coefficient à appliquer au temps à plat.
export type GradeModel = { up: number; down: number };
export const DEFAULT_GRADE_MODEL: GradeModel = { up: 0.033, down: 0.018 };

export function segmentFactor(km0: number, alt0: number, km1: number, alt1: number, model: GradeModel = DEFAULT_GRADE_MODEL): number {
  const dKm = km1 - km0;
  if (dKm <= 0) return 1;
  const g = ((alt1 - alt0) / (dKm * 1000)) * 100;
  return Math.max(0.6, 1 + (g > 0 ? model.up : model.down) * g);
}

export function profileGradeFactor(profile: [number, number][], model: GradeModel = DEFAULT_GRADE_MODEL): number {
  let num = 0, den = 0;
  for (let i = 1; i < profile.length; i++) {
    const dKm = profile[i][0] - profile[i - 1][0];
    if (dKm <= 0) continue;
    num += segmentFactor(profile[i - 1][0], profile[i - 1][1], profile[i][0], profile[i][1], model) * dKm;
    den += dKm;
  }
  return den ? num / den : 1;
}

// Sans profil : 1 + 0,015 × pente moyenne positive en %.
// Le coefficient 0,015 suit le coût de la montée du modèle (0,033 par défaut).
export const genericGradeFactor = (distanceM: number, dplusM: number, model: GradeModel = DEFAULT_GRADE_MODEL): number =>
  dplusM > 0 && distanceM > 0 ? 1 + 0.015 * (model.up / DEFAULT_GRADE_MODEL.up) * (dplusM / (distanceM / 100)) : 1;

export type Reference = { name: string; distance_km: number; time_s: number };

// Base de la projection : l'effort le plus long parmi 5 km, 10 km et semi (les distances plus longues extrapolent mieux).
export function pickReference(efforts: Record<string, number>): Reference | null {
  for (const [name, distance_km] of [["Semi", 21.0975], ["10K", 10], ["5K", 5]] as const) {
    if (efforts[name]) return { name, distance_km, time_s: efforts[name] };
  }
  return null;
}
