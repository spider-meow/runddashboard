import { describe, expect, it } from "vitest";
import { genericGradeFactor, pickReference, profileGradeFactor, riegel } from "./riegel";

describe("riegel", () => {
  it("applique T2 = T1 × (D2/D1)^k", () => {
    expect(riegel(2758, 10, 16.2)).toBeCloseTo(4599, 0); // 1:16:39
    expect(riegel(1302, 5, 5)).toBe(1302);
  });
  it("accepte un exposant différent", () => {
    expect(riegel(2000, 10, 20, 1.0)).toBeCloseTo(4000, 5);
  });
});

describe("profileGradeFactor", () => {
  const flat = Array.from({ length: 101 }, (_, i) => [i / 10, 100]) as [number, number][];
  it("vaut 1 sur du plat", () => {
    expect(profileGradeFactor(flat)).toBeCloseTo(1, 5);
  });
  it("ralentit en montée, accélère un peu en descente", () => {
    const up = flat.map(([km], i) => [km, 100 + i * 0.5]) as [number, number][]; // +0,5 m / 100 m... 0,5 %
    const down = flat.map(([km], i) => [km, 100 - i * 0.5]) as [number, number][];
    expect(profileGradeFactor(up)).toBeGreaterThan(1);
    expect(profileGradeFactor(down)).toBeLessThan(1);
  });
  it("coûte plus cher de monter que descendre ne rapporte", () => {
    const up = profileGradeFactor(flat.map(([km], i) => [km, 100 + i]) as [number, number][]);
    const down = profileGradeFactor(flat.map(([km], i) => [km, 100 - i]) as [number, number][]);
    expect(up - 1).toBeGreaterThan(1 - down);
  });
  it("renvoie 1 sans profil exploitable", () => {
    expect(profileGradeFactor([])).toBe(1);
  });
});

describe("genericGradeFactor", () => {
  it("donne environ +2,5 % pour 275 m sur 16,2 km (valeur de la maquette)", () => {
    expect(genericGradeFactor(16200, 275)).toBeCloseTo(1.0255, 3);
  });
  it("vaut 1 sans dénivelé", () => {
    expect(genericGradeFactor(10000, 0)).toBe(1);
  });
});

describe("pickReference", () => {
  it("prend l'effort le plus long parmi 5 km, 10 km et semi", () => {
    expect(pickReference({ "1K": 250, "5K": 1360, "10K": 2900 })).toEqual({ name: "10K", distance_km: 10, time_s: 2900 });
    expect(pickReference({ "5K": 1360, Semi: 6100 })).toMatchObject({ name: "Semi", distance_km: 21.0975 });
  });
  it("retombe sur le 5 km, ou null sans effort exploitable", () => {
    expect(pickReference({ "5K": 1360 })).toEqual({ name: "5K", distance_km: 5, time_s: 1360 });
    expect(pickReference({ "1K": 250 })).toBeNull();
    expect(pickReference({})).toBeNull();
  });
});