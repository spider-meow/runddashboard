import { describe, expect, it } from "vitest";
import { findRaceRun, raceReview } from "./review";

const run = (id: string, day: string, km: number, t: number, be: Record<string, number> | null = null) => ({ id, name: id, started_at: `${day}T08:00:00Z`, distance_m: km * 1000, moving_time_s: t, best_efforts: be });
const race = { race_date: "2026-11-08", distance_m: 21097, elevation_gain_m: 0, course_profile: null, target_pace_s: 290 };

describe("retrouver la course parmi les sorties", () => {
  it("prend la sortie du jour dont la distance colle, pas un footing du même jour", () => {
    const m = findRaceRun(race, [run("footing", "2026-11-08", 5, 1500), run("course", "2026-11-08", 21.2, 6300), run("autre jour", "2026-10-01", 21.1, 6000)]);
    expect(m?.id).toBe("course");
  });
  it("rien si aucune sortie ne correspond", () => expect(findRaceRun(race, [run("a", "2026-11-08", 10, 3000)])).toBeNull());
});

describe("bilan", () => {
  const before = run("avant", "2026-10-20", 10, 2700, { "10K": 2700, "5K": 1300 });
  it("compare au temps visé et à la projection de la veille", () => {
    const r = raceReview(race, [before, run("course", "2026-11-08", 21.1, 6200)])!;
    expect(r.actual_s).toBeCloseTo(6200 * (21097 / 21100), 0);
    expect(r.vsTargetS).toBeCloseTo(r.actual_s - 290 * 21.097, 3);
    expect(r.projected_s).not.toBeNull();
    expect(Math.abs(r.errorPct!)).toBeLessThan(10);
  });
  it("n'utilise pas la course elle-même pour la projection de la veille", () => {
    const withSelf = run("course", "2026-11-08", 21.1, 6200, { Semi: 6200 });
    const r = raceReview(race, [before, withSelf])!;
    const without = raceReview(race, [before, run("course", "2026-11-08", 21.1, 6200)])!;
    expect(r.projected_s).toBe(without.projected_s);
  });
  it("sans effort antérieur : bilan sans projection", () => {
    const r = raceReview(race, [run("course", "2026-11-08", 21.1, 6200)])!;
    expect(r.projected_s).toBeNull(); expect(r.errorPct).toBeNull();
  });
  it("null si la course n'est pas dans les sorties", () => expect(raceReview(race, [before])).toBeNull());
});
