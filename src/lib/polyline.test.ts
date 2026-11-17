import { describe, expect, it } from "vitest";
import { decodePolyline, encodePolyline, toSvgPath } from "./polyline";

// exemple officiel de l'algorithme Google
const ENC = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

describe("polyline", () => {
  it("décode une polyline", () => {
    const pts = decodePolyline(ENC);
    expect(pts).toHaveLength(3);
    expect(pts[0][0]).toBeCloseTo(38.5, 5);
    expect(pts[0][1]).toBeCloseTo(-120.2, 5);
    expect(pts[2][0]).toBeCloseTo(43.252, 5);
    expect(pts[2][1]).toBeCloseTo(-126.453, 5);
  });
  it("encode comme l'exemple officiel et fait l'aller-retour", () => {
    expect(encodePolyline([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]])).toBe(ENC);
    const pts: [number, number][] = [[48.80123, 2.19876], [48.80456, 2.2012]];
    const back = decodePolyline(encodePolyline(pts));
    expect(back[1][0]).toBeCloseTo(48.80456, 5);
    expect(back[1][1]).toBeCloseTo(2.2012, 5);
  });
  it("renvoie une liste vide pour une chaîne vide", () => {
    expect(decodePolyline("")).toEqual([]);
  });
  it("dessine un chemin SVG qui reste dans le cadre, nord en haut", () => {
    const path = toSvgPath(decodePolyline(ENC), 400, 300, 20);
    expect(path.startsWith("M")).toBe(true);
    const nums = path.match(/-?\d+(\.\d+)?/g)!.map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      expect(nums[i]).toBeGreaterThanOrEqual(20 - 0.01);
      expect(nums[i]).toBeLessThanOrEqual(380 + 0.01);
      expect(nums[i + 1]).toBeGreaterThanOrEqual(20 - 0.01);
      expect(nums[i + 1]).toBeLessThanOrEqual(280 + 0.01);
    }
    // le point le plus au nord (lat 43.25) est le plus haut à l'écran (y le plus petit)
    expect(nums[5]).toBeLessThan(nums[1]);
  });
  it("renvoie une chaîne vide s'il y a moins de 2 points", () => {
    expect(toSvgPath([[1, 1]], 400, 300, 20)).toBe("");
  });
});
