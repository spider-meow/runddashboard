import { describe, expect, it } from "vitest";
import { checkpointIssue, describeSync, isRealDate, parseRaceFields, splitRaces } from "./forms";

const ok = { name: "Les collines de Garches", date: "2026-11-22", distance_km: "16,2", dplus: "275", pace: "4:50" };

describe("parseRaceFields", () => {
  it("accepte une saisie complète (virgule décimale comprise)", () => {
    const r = parseRaceFields(ok);
    expect(r.errors).toEqual({});
    expect(r.data).toEqual({ name: "Les collines de Garches", race_date: "2026-11-22", distance_m: 16200, elevation_gain_m: 275, target_pace_s: 290 });
  });
  it("D+ et allure sont facultatifs", () => {
    const r = parseRaceFields({ ...ok, dplus: "", pace: "" });
    expect(r.data).toMatchObject({ elevation_gain_m: null, target_pace_s: null });
  });
  it("signale chaque champ fautif, avec un message qui dit quoi faire", () => {
    const r = parseRaceFields({ name: " ", date: "2026-02-30", distance_km: "abc", dplus: "-5", pace: "4.50" });
    expect(Object.keys(r.errors).sort()).toEqual(["date", "distance_km", "dplus", "name", "pace"]);
    expect(r.data).toBeUndefined();
    expect(r.errors.pace).toContain("4:50");
  });
  it("borne les valeurs absurdes", () => {
    expect(parseRaceFields({ ...ok, distance_km: "0" }).errors.distance_km).toBeDefined();
    expect(parseRaceFields({ ...ok, distance_km: "1000" }).errors.distance_km).toBeDefined();
    expect(parseRaceFields({ ...ok, dplus: "99999" }).errors.dplus).toBeDefined();
    expect(parseRaceFields({ ...ok, pace: "0:30" }).errors.pace).toBeDefined();
    expect(parseRaceFields({ ...ok, name: "x".repeat(101) }).errors.name).toBeDefined();
  });
});

describe("isRealDate", () => {
  it("refuse les dates qui n'existent pas", () => {
    expect(isRealDate("2026-11-22")).toBe(true);
    expect(isRealDate("2028-02-29")).toBe(true);
    expect(isRealDate("2026-02-29")).toBe(false);
    expect(isRealDate("2026-13-01")).toBe(false);
    expect(isRealDate("22/11/2026")).toBe(false);
  });
});

describe("splitRaces", () => {
  const r = (id: string, race_date: string) => ({ id, race_date });
  it("sépare à venir (la plus proche d'abord) et passées (la plus récente d'abord), le jour J compte comme à venir", () => {
    const { upcoming, past } = splitRaces([r("a", "2026-01-10"), r("b", "2026-12-01"), r("c", "2026-11-17"), r("d", "2026-06-01")], "2026-11-17");
    expect(upcoming.map((x) => x.id)).toEqual(["c", "b"]);
    expect(past.map((x) => x.id)).toEqual(["d", "a"]);
  });
});

describe("describeSync", () => {
  it("à jour", () => {
    expect(describeSync({ fetched: 3, analyzed: 2, remaining: 0 })).toEqual({ tone: "ok", text: "À jour : 3 activités vérifiées, 2 analysées." });
  });
  it("singulier", () => {
    expect(describeSync({ fetched: 1, analyzed: 1, remaining: 0 }).text).toBe("À jour : 1 activité vérifiée, 1 analysée.");
  });
  it("reste à analyser : invite à relancer", () => {
    const d = describeSync({ fetched: 40, analyzed: 30, remaining: 12 });
    expect(d.tone).toBe("warn");
    expect(d.text).toContain("12");
    expect(d.text).toContain("Relance");
  });
  it("analyse en échec : le dit sans faire échouer la synchro", () => {
    const d = describeSync({ fetched: 5, analyzed: 0, remaining: 5, analysisError: "quota" });
    expect(d.tone).toBe("warn");
    expect(d.text).toContain("5 activités reçues");
    expect(d.text).toContain("quota");
  });
});

describe("checkpointIssue", () => {
  it("accepte des lignes valides et le texte vide", () => {
    expect(checkpointIssue("5 | Ravito | cool\n10,5 | Sommet |", 16.2)).toBeNull();
    expect(checkpointIssue("", 16.2)).toBeNull();
    expect(checkpointIssue("\n  \n", 16.2)).toBeNull();
  });
  it("nomme les lignes mal formées", () => {
    expect(checkpointIssue("5 | ok\nravito sans km\nabc | x", 10)).toContain("lignes 2, 3");
  });
  it("refuse un repère au-delà de l'arrivée", () => {
    expect(checkpointIssue("5 | ok\n17 | trop loin", 16.2)).toContain("ligne 2");
  });
});
