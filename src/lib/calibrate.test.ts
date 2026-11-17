import { describe, expect, it } from "vitest";
import type { Split } from "./analyze";
import { calibrateGrade, MIN_KM } from "./calibrate";

// Sorties synthétiques : l'allure à plat de la sortie, multipliée par le coût du relief de coefficients connus, sans bruit.
function synth(up: number, down: number, runs: number): { splits: Split[] }[] {
  return Array.from({ length: runs }, (_, r) => {
    const flat = 270 + (r % 5) * 12;
    return { splits: Array.from({ length: 10 }, (_, i) => {
      const g = [-6, -3, 0, 2, 5, 8, -1, 4, -4, 1][(i + r) % 10], f = 1 + (g > 0 ? up : down) * g;
      return { km: i + 1, time_s: flat * f, elev_m: g * 10, partial: false };
    }) };
  });
}

describe("calibrage du relief", () => {
  it("retrouve les coefficients d'un coureur dont on connaît le modèle", () => {
    const c = calibrateGrade(synth(0.045, 0.012, 20));
    expect(c.calibrated).toBe(true);
    expect(c.model.up).toBeCloseTo(0.045, 2);
    expect(c.model.down).toBeCloseTo(0.012, 2);
    expect(c.errFitted).toBeLessThan(c.errDefault);
    expect(c.errFitted).toBeLessThan(c.errFlat);
  });
  it("garde le modèle par défaut quand il y a trop peu de kilomètres", () => {
    const c = calibrateGrade(synth(0.045, 0.012, 3));
    expect(c.km).toBeLessThan(MIN_KM);
    expect(c.calibrated).toBe(false);
    expect(c.model).toEqual({ up: 0.033, down: 0.018 });
    expect(c.fitted.up).toBeCloseTo(0.045, 2);
  });
  it("ignore les kilomètres qui ne sont pas dus au relief (pause)", () => {
    const runs = synth(0.045, 0.012, 20);
    runs[0].splits[3] = { km: 4, time_s: 800, elev_m: 0, partial: false };
    expect(calibrateGrade(runs).model.up).toBeCloseTo(0.045, 2);
  });
  it("sans aucune donnée : modèle par défaut, pas d'erreur", () => {
    const c = calibrateGrade([{ splits: null }, { splits: [] }]);
    expect(c.calibrated).toBe(false);
    expect(c.km).toBe(0);
  });
});
