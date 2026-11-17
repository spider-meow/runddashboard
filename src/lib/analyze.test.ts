import { describe, expect, it } from "vitest";
import { analyzeStream } from "./analyze";

// Course synthétique : 5,5 km à 5:00 /km constant (1 point / 10 m), altitude qui monte de 10 m tous les km (0,1 m par point).
const N = 551;
const stream = {
  distance: Array.from({ length: N }, (_, i) => i * 10),
  time: Array.from({ length: N }, (_, i) => i * 3), // 3 s par 10 m = 300 s/km
  altitude: Array.from({ length: N }, (_, i) => 100 + i * 0.1), // +10 m par km
};

describe("analyzeStream", () => {
  const a = analyzeStream(stream);

  it("découpe en kilomètres avec un dernier demi-kilomètre partiel", () => {
    expect(a.splits).toHaveLength(6);
    expect(a.splits[0]).toMatchObject({ km: 1, time_s: 300, partial: false });
    expect(a.splits[0].elev_m).toBeCloseTo(10, 0);
    expect(a.splits[5]).toMatchObject({ km: 6, partial: true });
    expect(a.splits[5].time_s).toBeCloseTo(150, 0);
  });

  it("calcule les meilleurs efforts sur les distances standard disponibles", () => {
    expect(a.best_efforts["1K"]).toBe(300);
    expect(a.best_efforts["5K"]).toBe(1500);
    expect(a.best_efforts["10K"]).toBeUndefined(); // trop court
  });

  it("trouve le meilleur segment quand l'allure varie", () => {
    const fast = { ...stream, time: stream.time.map((t, i) => (i < 200 ? t : t - Math.min(i - 200, 100) * 1)) };
    // entre 2 km et 3 km on gagne 100 s : le meilleur km passe sous 300 s
    expect(analyzeStream(fast).best_efforts["1K"]).toBeLessThan(300);
  });

  it("sous-échantillonne le profil d'altitude en [km, altitude]", () => {
    expect(a.elev_profile.length).toBeLessThanOrEqual(200);
    expect(a.elev_profile[0]).toEqual([0, 100]);
    expect(a.elev_profile.at(-1)![0]).toBeCloseTo(5.5, 1);
  });

  it("calcule le dénivelé positif en ignorant le bruit de l'altimètre", () => {
    expect(a.elevation_gain_m).toBeCloseTo(55, -1);
    const noisy = { ...stream, altitude: stream.altitude.map((v, i) => v + (i % 2 ? 0.4 : -0.4)) };
    expect(analyzeStream(noisy).elevation_gain_m).toBeLessThan(a.elevation_gain_m * 1.15);
  });

  it("gère un flux sans altitude", () => {
    const b = analyzeStream({ distance: stream.distance, time: stream.time });
    expect(b.elev_profile).toEqual([]);
    expect(b.elevation_gain_m).toBe(0);
    expect(b.splits).toHaveLength(6);
  });

  it("gère un flux trop court", () => {
    expect(analyzeStream({ distance: [0], time: [0] }).splits).toEqual([]);
  });
});
