import { describe, expect, it } from "vitest";
import { decodePolyline } from "./polyline";
import { activityFromPoints, hashBytes } from "./import";
import { parseGpx } from "./gpx";

// 2 km en ligne droite vers le nord, 1 point tous les 100 m, 30 s par point (5:00 /km), +1 m tous les 100 m.
const pts = Array.from({ length: 21 }, (_, i) => ({ lat: 48.8 + i * 0.000899, lon: 2.2, ele: 100 + i, t: Date.parse("2026-11-15T08:00:00Z") + i * 30000 }));

describe("activityFromPoints", () => {
  const r = activityFromPoints({ source: "gpx", externalId: "abc", name: "Sortie test", startedAt: new Date("2026-11-15T08:00:00Z"), points: pts });

  it("construit la ligne d'activité avec les statistiques calculées", () => {
    expect(r.row).toMatchObject({ source: "gpx", external_id: "abc", name: "Sortie test", sport: "Run", started_at: "2026-11-15T08:00:00.000Z" });
    expect(r.row.distance_m).toBeGreaterThan(1990);
    expect(r.row.distance_m).toBeLessThan(2010);
    expect(r.row.moving_time_s).toBe(600);
    expect(r.row.elevation_gain_m).toBeGreaterThan(15);
  });
  it("calcule les splits et un tracé exploitable", () => {
    expect(r.row.splits).toHaveLength(2);
    expect(r.row.splits![0].time_s).toBeCloseTo(300, -1);
    expect(decodePolyline(r.row.polyline!).length).toBeGreaterThan(2);
  });
  it("marque l'activité comme analysée", () => {
    expect(r.row.analyzed_at).toBeTruthy();
  });
  it("refuse un fichier sans horodatage", () => {
    expect(() => activityFromPoints({ source: "gpx", externalId: "x", name: "n", startedAt: null, points: pts.map((p) => ({ ...p, t: null })) })).toThrow(/horodatage/i);
  });
  it("accepte un GPX complet lu avec le parseur", () => {
    const g = parseGpx(`<gpx><trk><trkseg>${pts.map((p) => `<trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.ele}</ele><time>${new Date(p.t).toISOString()}</time></trkpt>`).join("")}</trkseg></trk></gpx>`);
    expect(activityFromPoints({ source: "gpx", externalId: "y", name: "n", startedAt: new Date(g.points[0].t!), points: g.points }).row.moving_time_s).toBe(600);
  });
});

describe("hashBytes", () => {
  it("donne la même empreinte pour le même contenu, une autre sinon", () => {
    const a = hashBytes(new TextEncoder().encode("hello")), b = hashBytes(new TextEncoder().encode("hello")), c = hashBytes(new TextEncoder().encode("hello!"));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
