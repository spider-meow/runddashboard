import { describe, expect, it } from "vitest";
import { personalRecords, weeklyVolume } from "./stats";

const run = (iso: string, km: number, timeS: number, dplus = 0, best: Record<string, number> | null = null, id = iso) =>
  ({ id, started_at: iso, distance_m: km * 1000, moving_time_s: timeS, elevation_gain_m: dplus, best_efforts: best });

describe("weeklyVolume", () => {
  // mercredi 18 novembre 2026 : la semaine courante commence le lundi 16
  const now = new Date("2026-11-18T12:00:00Z");
  const runs = [
    run("2026-11-17T07:00:00Z", 10, 3000, 100), // semaine du 16
    run("2026-11-16T07:00:00Z", 5, 1500, 20),   // semaine du 16
    run("2026-11-10T07:00:00Z", 12, 3600, 50),  // semaine du 9
  ];
  const w = weeklyVolume(runs, now, 4);

  it("renvoie le bon nombre de semaines, de la plus ancienne à la courante", () => {
    expect(w).toHaveLength(4);
    expect(w.map((x) => x.weekStart)).toEqual(["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"]);
  });
  it("additionne distance et dénivelé par semaine (lundi à dimanche)", () => {
    expect(w[3]).toMatchObject({ km: 15, dplus: 120 });
    expect(w[2]).toMatchObject({ km: 12, dplus: 50 });
  });
  it("calcule l'allure moyenne pondérée, ou null sans course", () => {
    expect(w[3].pace).toBeCloseTo(300, 5); // 4500 s / 15 km
    expect(w[0].km).toBe(0);
    expect(w[0].pace).toBeNull();
  });
  it("ignore les courses hors de la fenêtre", () => {
    expect(weeklyVolume([run("2025-01-01T00:00:00Z", 99, 1)], now, 4).every((x) => x.km === 0)).toBe(true);
  });
});

describe("personalRecords", () => {
  const runs = [
    run("2026-09-13T08:00:00Z", 5, 1400, 0, { "1K": 270, "5K": 1360 }, "a"),
    run("2026-10-04T08:00:00Z", 10, 2900, 0, { "1K": 280, "5K": 1390, "10K": 2900 }, "b"),
    run("2026-11-01T08:00:00Z", 21, 7000, 300, null, "c"),
  ];
  const r = personalRecords(runs);
  it("garde le meilleur temps par distance, avec sa date et son activité", () => {
    expect(r.efforts["5K"]).toEqual({ time_s: 1360, date: "2026-09-13", activity_id: "a" });
    expect(r.efforts["1K"].time_s).toBe(270);
    expect(r.efforts["10K"].activity_id).toBe("b");
  });
  it("trouve la plus longue sortie et le plus gros dénivelé", () => {
    expect(r.longest).toMatchObject({ distance_m: 21000, activity_id: "c" });
    expect(r.biggestClimb).toMatchObject({ elevation_gain_m: 300, activity_id: "c" });
  });
  it("renvoie des valeurs vides sans course", () => {
    expect(personalRecords([])).toEqual({ efforts: {}, longest: null, biggestClimb: null });
  });
});
