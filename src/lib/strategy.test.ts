import { describe, expect, it } from "vitest";
import { climbs, fuelPlan, passagesFromPlan, planKm, timeAtKm } from "./strategy";

const flat = (km: number) => Array.from({ length: 11 }, (_, i) => [(i / 10) * km, 100] as [number, number]);
// 21 km : plat, une montée de 3 % entre les km 8 et 11, descente ensuite.
const hilly: [number, number][] = [[0, 100], [8, 100], [11, 100 + 3 * 30], [14, 100], [21, 100]];

describe("plan kilomètre par kilomètre", () => {
  it("arrive pile au temps visé", () => {
    const rows = planKm(hilly, 21, 6000);
    expect(rows[rows.length - 1].cum_s).toBeCloseTo(6000, 3);
    expect(rows).toHaveLength(21);
  });
  it("part un peu plus lentement et finit un peu plus vite sur du plat", () => {
    const r = planKm(flat(10), 10, 3000);
    expect(r[0].pace_s).toBeGreaterThan(r[4].pace_s);
    expect(r[9].pace_s).toBeLessThan(r[4].pace_s);
  });
  it("ralentit en montée et accélère en descente", () => {
    const r = planKm(hilly, 21, 6000);
    const mid = r[5].pace_s, up = r[9].pace_s, down = r[12].pace_s;
    expect(up).toBeGreaterThan(mid);
    expect(down).toBeLessThan(mid);
  });
  it("gère un dernier kilomètre partiel", () => {
    const r = planKm(flat(10.5), 10.5, 3150);
    expect(r).toHaveLength(11);
    expect(r[10].len_km).toBeCloseTo(0.5, 5);
    expect(r[10].cum_s).toBeCloseTo(3150, 3);
  });
  it("fonctionne sans profil (à plat)", () => {
    const r = planKm([], 5, 1500);
    expect(r).toHaveLength(5);
    expect(r[2].grade).toBe(0);
  });
  it("met des consignes : départ, montée, dernier kilomètre", () => {
    const r = planKm(hilly, 21, 6000);
    expect(r[0].note).toMatch(/Départ/);
    expect(r[9].note).toMatch(/Montée/);
    expect(r[20].note).toMatch(/Dernier/);
  });
});

describe("montées marquantes", () => {
  it("repère la montée du plan et ignore les faux plats", () => {
    const c = climbs(planKm(hilly, 21, 6000));
    expect(c).toHaveLength(1);
    expect(c[0].from_km).toBe(8); expect(c[0].to_km).toBe(11); expect(c[0].gain_m).toBe(90);
    expect(climbs(planKm(flat(10), 10, 3000))).toHaveLength(0);
  });
});

describe("ravitaillement", () => {
  it("aucun en dessous de 50 min", () => expect(fuelPlan(2400, planKm(flat(8), 8, 2400)).items).toHaveLength(0));
  it("un gel autour de 40 min pour un 10 km lent", () => {
    const f = fuelPlan(3300 + 600, planKm(flat(12), 12, 3900));
    expect(f.items).toHaveLength(1);
    expect(f.items[0].t_s).toBe(2400);
  });
  it("un gel toutes les 30 min sur un semi en 1 h 45, jamais dans les 12 dernières minutes", () => {
    const rows = planKm(hilly, 21, 6300), f = fuelPlan(6300, rows);
    expect(f.items.map((i) => i.t_s / 60)).toEqual([30, 60, 90]);
    expect(f.items.every((i) => i.km > 0 && i.km < 21)).toBe(true);
  });
});

describe("repères de passage", () => {
  it("lit les temps sur le plan : le repère à l'arrivée donne le temps visé", () => {
    const rows = planKm(hilly, 21, 6000);
    expect(timeAtKm(rows, 21)).toBeCloseTo(6000, 3);
    expect(timeAtKm(rows, 10.5)).toBeCloseTo(rows[10].cum_s - rows[10].time_s / 2, 3);
    const p = passagesFromPlan([{ km: 21, name: "Arrivée", note: "" }, { km: 5, name: "Ravito", note: "" }], rows, hilly, 21);
    expect(p.map((c) => c.km)).toEqual([5, 21]);
    expect(p[1].time_s).toBe(6000);
    expect(p[0].segment_pace_s).toBeGreaterThan(0);
  });
});
