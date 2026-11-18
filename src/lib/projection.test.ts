import { describe, expect, it } from "vitest";
import { bestEfforts, currentForm, formTrend, personalExponent, project, projectRace, SEMI } from "./projection";

const NOW = new Date("2026-11-17T12:00:00Z");
const run = (daysAgo: number, be: Record<string, number>) => ({ started_at: new Date(NOW.getTime() - daysAgo * 864e5).toISOString(), best_efforts: be });

describe("efforts de référence", () => {
  it("garde le meilleur temps par distance dans la fenêtre, jamais le 1 km", () => {
    const e = bestEfforts([run(10, { "1K": 200, "5K": 1300 }), run(20, { "5K": 1280 }), run(400, { "5K": 1000 })], new Date(NOW.getTime() - 120 * 864e5), NOW);
    expect(e).toHaveLength(1);
    expect(e[0].time_s).toBe(1280);
  });
  it("retombe sur tout l'historique, signalé périmé, quand rien de récent", () => {
    const f = currentForm([run(400, { "10K": 2700 })], NOW);
    expect(f.stale).toBe(true);
    expect(f.efforts[0].time_s).toBe(2700);
  });
});

describe("exposant personnel", () => {
  const e = (name: string, d: number, t: number) => ({ name, distance_km: d, time_s: t, date: "2026-11-01" });
  it("vaut 1,06 avec une seule distance", () => expect(personalExponent([e("10K", 10, 2700)])).toBe(1.06));
  it("reste dans [1,03 ; 1,10] même avec des efforts incohérents", () => {
    expect(personalExponent([e("5K", 5, 1000), e("10K", 10, 4000)])).toBe(1.10);
    expect(personalExponent([e("5K", 5, 1500), e("10K", 10, 1600)])).toBe(1.03);
  });
  it("se rapproche de l'exposant réel d'un coureur cohérent", () => {
    const k = 1.09, t = (d: number) => 1300 * (d / 5) ** k;
    const fit = personalExponent([e("5K", 5, t(5)), e("10K", 10, t(10)), e("Semi", SEMI, t(SEMI))]);
    expect(fit).toBeGreaterThan(1.06); expect(fit).toBeLessThan(1.09);
  });
});

describe("projection", () => {
  const efforts = [{ name: "10K", distance_km: 10, time_s: 2700, date: "2026-11-01" }];
  it("colle à Riegel avec un seul effort et encadre le temps", () => {
    const p = project(efforts, SEMI)!;
    expect(p.time_s).toBeCloseTo(2700 * (SEMI / 10) ** 1.06, 0);
    expect(p.low).toBeLessThan(p.time_s); expect(p.high).toBeGreaterThan(p.time_s);
    expect((p.high - p.low) / p.time_s).toBeGreaterThan(0.024); // au moins ± 1,2 %
  });
  it("élargit la fourchette quand on extrapole loin", () => {
    const near = project(efforts, 10)!, far = project(efforts, 42.195)!;
    expect((far.high - far.low) / far.time_s).toBeGreaterThan((near.high - near.low) / near.time_s);
  });
  it("pèse davantage l'effort le plus proche de la distance visée", () => {
    const p = project([{ name: "5K", distance_km: 5, time_s: 1200, date: "x" }, { name: "Semi", distance_km: SEMI, time_s: 5400, date: "x" }], 20, 1.06)!;
    expect(p.parts[1].weight).toBeGreaterThan(p.parts[0].weight);
  });
  it("renvoie null sans effort", () => expect(project([], 10)).toBeNull());
  it("ajoute le relief et mesure l'écart à l'objectif", () => {
    const flat = projectRace(efforts, { distance_m: 21097, elevation_gain_m: 0, course_profile: null, target_pace_s: 290 })!;
    const hilly = projectRace(efforts, { distance_m: 21097, elevation_gain_m: 300, course_profile: null, target_pace_s: 290 })!;
    expect(hilly.time_s).toBeGreaterThan(flat.time_s);
    expect(flat.gapS).toBeCloseTo(flat.time_s - 290 * 21.097, 3);
  });
});

describe("tendance de forme", () => {
  it("ne garde que les fenêtres qui ont un effort, dans l'ordre du temps", () => {
    const t = formTrend([run(5, { "10K": 2700 }), run(100, { "10K": 2800 })], NOW);
    expect(t.length).toBeGreaterThanOrEqual(2);
    expect(t[0].end < t[t.length - 1].end).toBe(true);
    expect(t[t.length - 1].time_s).toBeLessThan(t[0].time_s);
  });
});
