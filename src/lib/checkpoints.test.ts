import { describe, expect, it } from "vitest";
import { planCheckpoints } from "./checkpoints";

const cps = [{ km: 5, name: "5 km", note: "" }, { km: 10, name: "10 km", note: "" }, { km: 15, name: "15 km", note: "" }, { km: 16.2, name: "Arrivée", note: "" }];
const flat: [number, number][] = Array.from({ length: 163 }, (_, i) => [i / 10, 100]);

describe("planCheckpoints", () => {
  it("répartit le temps cible proportionnellement à la distance sur du plat", () => {
    const p = planCheckpoints(cps, flat, 16.2, 4698);
    expect(p[0].time_s).toBeCloseTo(5 * 290, 0);
    expect(p[3].time_s).toBe(4698);
  });
  it("sans profil, même résultat qu'à plat", () => {
    expect(planCheckpoints(cps, [], 16.2, 4698)[1].time_s).toBeCloseTo(10 * 290, 0);
  });
  it("passe plus tard quand le début est en montée, et arrive pile à l'objectif", () => {
    const hilly = flat.map(([km, a]) => [km, km < 5 ? a + km * 20 : a + 100] as [number, number]);
    const p = planCheckpoints(cps, hilly, 16.2, 4698);
    expect(p[0].time_s).toBeGreaterThan(5 * 290);
    expect(p[3].time_s).toBe(4698);
  });
  it("calcule l'allure du tronçon et le dénivelé entre deux repères", () => {
    const p = planCheckpoints(cps, flat, 16.2, 4698);
    expect(p[1].segment_pace_s).toBeCloseTo(290, 0);
    expect(p[1].segment_elev_m).toBe(0);
  });
  it("trie les repères par distance et ignore ceux au-delà de la course", () => {
    const p = planCheckpoints([{ km: 99, name: "hors course", note: "" }, ...cps.slice().reverse()], flat, 16.2, 4698);
    expect(p.map((x) => x.km)).toEqual([5, 10, 15, 16.2]);
  });
});
