export type LatLng = [number, number];

// Algorithme « encoded polyline » de Google, utilisé par Strava (summary_polyline).
export function decodePolyline(encoded: string): LatLng[] {
  const pts: LatLng[] = [];
  let i = 0, lat = 0, lng = 0;
  const next = () => {
    let result = 0, shift = 0, b: number;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 31) << shift;
      shift += 5;
    } while (b >= 32);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < encoded.length) {
    lat += next();
    lng += next();
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}

export function encodePolyline(points: LatLng[]): string {
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1, s = "";
    while (n >= 0x20) { s += String.fromCharCode((0x20 | (n & 0x1f)) + 63); n >>= 5; }
    return s + String.fromCharCode(n + 63);
  };
  let out = "", pLat = 0, pLng = 0;
  for (const [lat, lng] of points) {
    const la = Math.round(lat * 1e5), ln = Math.round(lng * 1e5);
    out += enc(la - pLat) + enc(ln - pLng);
    pLat = la; pLng = ln;
  }
  return out;
}

// Projette les points dans un cadre w x h (marge pad), nord en haut, proportions respectées.
export function toSvgPath(points: LatLng[], w: number, h: number, pad: number): string {
  if (points.length < 2) return "";
  const k = Math.cos((points.reduce((s, p) => s + p[0], 0) / points.length) * Math.PI / 180);
  const xy = points.map(([lat, lng]) => [lng * k, -lat]);
  const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min((w - 2 * pad) / ((x1 - x0) || 1), (h - 2 * pad) / ((y1 - y0) || 1));
  const ox = (w - s * (x1 - x0)) / 2, oy = (h - s * (y1 - y0)) / 2;
  return "M" + xy.map(([x, y]) => `${(ox + (x - x0) * s).toFixed(1)} ${(oy + (y - y0) * s).toFixed(1)}`).join("L");
}
