import { describe, expect, it } from "vitest";
import type { LatLng } from "./polyline";
import { mercator, mercatorFit, tileUrl } from "./tiles";

// Petit parcours fictif en région parisienne (environ 3 km).
const loop: LatLng[] = [[48.84, 2.19], [48.845, 2.205], [48.855, 2.21], [48.86, 2.2], [48.85, 2.19], [48.84, 2.19]];
const W = 400, H = 300, PAD = 24;

describe("mercator", () => {
  it("place l'équateur au milieu et Greenwich à gauche du centre", () => {
    const [x, y] = mercator(0, 0);
    expect(x).toBeCloseTo(0.5, 10);
    expect(y).toBeCloseTo(0.5, 10);
  });
  it("le nord est en haut (y plus petit)", () => {
    expect(mercator(48.9, 2)[1]).toBeLessThan(mercator(48.8, 2)[1]);
  });
});

describe("mercatorFit", () => {
  it("garde le tracé dans le cadre, marges comprises", () => {
    const f = mercatorFit(loop, W, H, PAD)!;
    const nums = f.d.slice(1).split("L").map((p) => p.split(" ").map(Number));
    for (const [x, y] of nums) {
      expect(x).toBeGreaterThanOrEqual(PAD - 0.1); expect(x).toBeLessThanOrEqual(W - PAD + 0.1);
      expect(y).toBeGreaterThanOrEqual(PAD - 0.1); expect(y).toBeLessThanOrEqual(H - PAD + 0.1);
    }
    expect(f.d.startsWith("M")).toBe(true);
  });
  it("les tuiles couvrent tout le cadre", () => {
    const f = mercatorFit(loop, W, H, PAD)!;
    const x0 = Math.min(...f.tiles.map((t) => t.x)), y0 = Math.min(...f.tiles.map((t) => t.y));
    const x1 = Math.max(...f.tiles.map((t) => t.x + t.size)), y1 = Math.max(...f.tiles.map((t) => t.y + t.size));
    expect(x0).toBeLessThanOrEqual(0); expect(y0).toBeLessThanOrEqual(0);
    expect(x1).toBeGreaterThanOrEqual(W); expect(y1).toBeGreaterThanOrEqual(H);
  });
  it("reste raisonnable en nombre de tuiles et en zoom", () => {
    const f = mercatorFit(loop, W, H, PAD)!;
    expect(f.tiles.length).toBeGreaterThan(0);
    expect(f.tiles.length).toBeLessThanOrEqual(25);
    expect(f.tiles[0].size).toBeGreaterThanOrEqual(128); expect(f.tiles[0].size).toBeLessThan(256);
    expect(f.z).toBeGreaterThanOrEqual(0); expect(f.z).toBeLessThanOrEqual(17);
  });
  it("les tuiles sont alignées avec le tracé : le premier point tombe dans sa tuile", () => {
    const f = mercatorFit(loop, W, H, PAD)!;
    const [px, py] = f.d.slice(1).split("L")[0].split(" ").map(Number);
    const [wx, wy] = mercator(loop[0][0], loop[0][1]), n = 2 ** f.z;
    const t = f.tiles.find((u) => u.tx === Math.floor(wx * n) && u.ty === Math.floor(wy * n))!;
    expect(t).toBeDefined();
    expect(px).toBeGreaterThanOrEqual(t.x - 0.2); expect(px).toBeLessThanOrEqual(t.x + t.size + 0.2);
    expect(py).toBeGreaterThanOrEqual(t.y - 0.2); expect(py).toBeLessThanOrEqual(t.y + t.size + 0.2);
  });
  it("un parcours plus long donne un zoom plus faible", () => {
    const far: LatLng[] = [[48.0, 2.0], [49.0, 3.0]];
    expect(mercatorFit(far, W, H, PAD)!.z).toBeLessThan(mercatorFit(loop, W, H, PAD)!.z);
  });
  it("refuse un tracé sans étendue", () => {
    expect(mercatorFit([], W, H, PAD)).toBeNull();
    expect(mercatorFit([[48.8, 2.2]], W, H, PAD)).toBeNull();
    expect(mercatorFit([[48.8, 2.2], [48.8, 2.2]], W, H, PAD)).toBeNull();
  });
});

describe("tileUrl", () => {
  it("remplit le modèle", () => {
    expect(tileUrl("https://t.example/{z}/{x}/{y}.png", 12, 2074, 1409)).toBe("https://t.example/12/2074/1409.png");
  });
});
