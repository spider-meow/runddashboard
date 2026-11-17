import { Encoder, Profile } from "@garmin/fitsdk";
import { describe, expect, it } from "vitest";
import { parseFit } from "./fit";
import { pointsToStream } from "./gpx";

const SEMI = 2147483648 / 180;

// Fichier FIT minimal fabriqué avec l'encodeur officiel de Garmin : 3 points à 30 s d'intervalle.
function makeFit(withPosition = true): Uint8Array {
  const e = new Encoder();
  e.onMesg(Profile.MesgNum.FILE_ID, { type: "activity", manufacturer: "development", product: 1, timeCreated: new Date("2026-11-15T08:00:00Z"), serialNumber: 1 } as never); // les types du SDK sont lâches : les champs sont validés à l'encodage
  [0, 1, 2].forEach((i) =>
    e.onMesg(Profile.MesgNum.RECORD, {
      timestamp: new Date(Date.parse("2026-11-15T08:00:00Z") + i * 30000),
      ...(withPosition ? { positionLat: Math.round((48.8 + i * 0.0009) * SEMI), positionLong: Math.round(2.2 * SEMI) } : {}),
      altitude: 100 + i,
    } as never),
  );
  e.onMesg(Profile.MesgNum.SESSION, { timestamp: new Date("2026-11-15T08:01:00Z"), startTime: new Date("2026-11-15T08:00:00Z"), sport: "running", totalElapsedTime: 60, totalTimerTime: 60 } as never);
  return e.close();
}

describe("parseFit", () => {
  it("lit les points GPS, l'altitude et l'heure d'un fichier FIT", () => {
    const f = parseFit(makeFit());
    expect(f.points).toHaveLength(3);
    expect(f.points[0].lat).toBeCloseTo(48.8, 4);
    expect(f.points[2].lat).toBeCloseTo(48.8018, 4);
    expect(f.points[1].t! - f.points[0].t!).toBe(30000);
    expect(f.points[2].ele).toBeCloseTo(102, 0);
    expect(f.startedAt?.toISOString()).toBe("2026-11-15T08:00:00.000Z");
  });
  it("se branche sur le même calcul de distance que le GPX", () => {
    const s = pointsToStream(parseFit(makeFit()).points);
    expect(s.distance[2]).toBeGreaterThan(195);
    expect(s.distance[2]).toBeLessThan(205);
  });
  it("refuse un fichier sans GPS (activité en salle)", () => {
    expect(() => parseFit(makeFit(false))).toThrow(/GPS|trace/i);
  });
  it("refuse un fichier qui n'est pas un FIT", () => {
    expect(() => parseFit(new TextEncoder().encode("pas un fichier fit du tout"))).toThrow(/FIT/);
  });
});
