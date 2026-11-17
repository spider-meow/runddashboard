import type { LatLng } from "./polyline";

// Projection Web Mercator normalisée : x et y entre 0 et 1, y vers le bas (comme les tuiles XYZ).
export function mercator(lat: number, lng: number): [number, number] {
  const s = Math.sin((Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180);
  return [(lng + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)];
}

export type Tile = { tx: number; ty: number; x: number; y: number; size: number };

// Cale le tracé dans un cadre w x h (marge pad) avec la même projection que les tuiles, et liste les tuiles qui couvrent le cadre.
// Le zoom est le plus élevé pour lequel une tuile fait au moins `tileSize` unités du cadre : entre tileSize et 2 × tileSize,
// soit au plus une vingtaine de tuiles de 256 px, sans jamais les agrandir de façon floue.
export function mercatorFit(points: LatLng[], w: number, h: number, pad: number, tileSize = 128): { d: string; z: number; tiles: Tile[] } | null {
  if (points.length < 2) return null;
  const xy = points.map(([lat, lng]) => mercator(lat, lng));
  const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const dx = x1 - x0, dy = y1 - y0;
  if (dx === 0 && dy === 0) return null;
  const k = Math.min(dx ? (w - 2 * pad) / dx : Infinity, dy ? (h - 2 * pad) / dy : Infinity);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const toX = (v: number) => (v - cx) * k + w / 2, toY = (v: number) => (v - cy) * k + h / 2;

  const z = Math.max(0, Math.min(17, Math.floor(Math.log2(k / tileSize)))), n = 2 ** z, size = k / n;
  const tiles: Tile[] = [];
  const [a, b] = [Math.floor((cx - w / (2 * k)) * n), Math.floor((cx + w / (2 * k)) * n)];
  const [c, e] = [Math.floor((cy - h / (2 * k)) * n), Math.floor((cy + h / (2 * k)) * n)];
  for (let ty = Math.max(0, c); ty <= Math.min(n - 1, e); ty++)
    for (let tx = Math.max(0, a); tx <= Math.min(n - 1, b); tx++) tiles.push({ tx, ty, x: toX(tx / n), y: toY(ty / n), size });

  const d = "M" + xy.map(([x, y]) => `${toX(x).toFixed(1)} ${toY(y).toFixed(1)}`).join("L");
  return { d, z, tiles };
}

// Modèle d'URL avec {z}, {x}, {y}.
export const tileUrl = (template: string, z: number, x: number, y: number) =>
  template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
