import { describe, expect, it } from "vitest";
import { findDuplicates } from "./duplicates";

const run = (id: string, source: string, started_at: string, distance_m: number) => ({ id, source, started_at, distance_m });

describe("doublons Strava / fichier", () => {
  it("repère un fichier dont le départ et la distance collent à une sortie Strava", () => {
    const d = findDuplicates([run("s", "strava", "2026-11-14T08:00:00Z", 10000), run("f", "fit", "2026-11-14T08:01:30Z", 10120)]);
    expect(d.get("f")).toBe("s");
  });
  it("ignore une sortie du même jour mais à une autre heure, ou d'une autre distance", () => {
    const d = findDuplicates([run("s", "strava", "2026-11-14T08:00:00Z", 10000), run("a", "gpx", "2026-11-14T18:00:00Z", 10000), run("b", "gpx", "2026-11-14T08:00:00Z", 5000)]);
    expect(d.size).toBe(0);
  });
  it("ne marque jamais une sortie Strava comme doublon", () => {
    expect(findDuplicates([run("s1", "strava", "2026-11-14T08:00:00Z", 10000), run("s2", "strava", "2026-11-14T08:00:00Z", 10000)]).size).toBe(0);
  });
});
