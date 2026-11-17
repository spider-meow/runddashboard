import { describe, expect, it } from "vitest";
import { parseGpx, pointsToStream } from "./gpx";

const GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="test"><metadata><name>Sortie test</name></metadata>
<trk><name>Sortie test</name><trkseg>
<trkpt lat="48.8000" lon="2.2000"><ele>100.0</ele><time>2026-11-15T08:00:00Z</time></trkpt>
<trkpt lat="48.8009" lon="2.2000"><ele>102.0</ele><time>2026-11-15T08:00:30Z</time></trkpt>
<trkpt lat="48.8018" lon="2.2000"><ele>101.0</ele><time>2026-11-15T08:01:00Z</time></trkpt>
</trkseg></trk></gpx>`;

describe("parseGpx", () => {
  it("lit le nom et les points", () => {
    const g = parseGpx(GPX);
    expect(g.name).toBe("Sortie test");
    expect(g.points).toHaveLength(3);
    expect(g.points[0]).toMatchObject({ lat: 48.8, lon: 2.2, ele: 100 });
    expect(g.points[1].t).toBe(Date.parse("2026-11-15T08:00:30Z"));
  });
  it("accepte des points sans altitude ni heure (tracé de course)", () => {
    const g = parseGpx('<gpx><trk><trkseg><trkpt lat="1" lon="2"></trkpt><trkpt lat="1.1" lon="2"/></trkseg></trk></gpx>');
    expect(g.points).toHaveLength(2);
    expect(g.points[0].ele).toBeNull();
    expect(g.points[0].t).toBeNull();
  });
  it("refuse un fichier sans trace", () => {
    expect(() => parseGpx("<gpx></gpx>")).toThrow(/trace/i);
  });
});

describe("pointsToStream", () => {
  it("calcule la distance cumulée en mètres (haversine)", () => {
    const s = pointsToStream(parseGpx(GPX).points);
    expect(s.distance[0]).toBe(0);
    expect(s.distance[2]).toBeGreaterThan(195); // 0,0018° de latitude ≈ 200 m
    expect(s.distance[2]).toBeLessThan(205);
    expect(s.time).toEqual([0, 30, 60]);
    expect(s.altitude).toEqual([100, 102, 101]);
  });
  it("laisse le temps vide quand le fichier n'a pas d'horodatage", () => {
    const s = pointsToStream([{ lat: 1, lon: 2, ele: 5, t: null }, { lat: 1.01, lon: 2, ele: 6, t: null }]);
    expect(s.time).toBeNull();
  });
});
