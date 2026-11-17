export type GpxPoint = { lat: number; lon: number; ele: number | null; t: number | null };
export type PointStream = { distance: number[]; time: number[] | null; altitude: number[] | null; latlng: [number, number][] };

const unescapeXml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

// Lecteur GPX volontairement simple : <trkpt lat lon> avec <ele> et <time> optionnels.
export function parseGpx(xml: string): { name: string | null; points: GpxPoint[] } {
  const points: GpxPoint[] = [];
  for (const m of xml.matchAll(/<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/g)) {
    const lat = /lat="([^"]+)"/.exec(m[1]), lon = /lon="([^"]+)"/.exec(m[1]);
    if (!lat || !lon) continue;
    const ele = /<ele>([^<]+)<\/ele>/.exec(m[2] ?? ""), time = /<time>([^<]+)<\/time>/.exec(m[2] ?? "");
    const t = time ? Date.parse(time[1]) : NaN;
    points.push({ lat: +lat[1], lon: +lon[1], ele: ele ? +ele[1] : null, t: isNaN(t) ? null : t });
  }
  if (points.length < 2) throw new Error("Aucune trace exploitable dans ce fichier");
  const name = /<name>([^<]*)<\/name>/.exec(xml);
  return { name: name ? unescapeXml(name[1].trim()) || null : null, points };
}

const R = 6371000;
export function haversine(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180, dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function pointsToStream(points: GpxPoint[]): PointStream {
  const latlng = points.map((p) => [p.lat, p.lon] as [number, number]);
  const distance = [0];
  for (let i = 1; i < points.length; i++) distance.push(distance[i - 1] + haversine(latlng[i - 1], latlng[i]));
  const hasTime = points.every((p) => p.t !== null);
  const hasEle = points.every((p) => p.ele !== null);
  return {
    distance,
    time: hasTime ? points.map((p) => (p.t! - points[0].t!) / 1000) : null,
    altitude: hasEle ? points.map((p) => p.ele!) : null,
    latlng,
  };
}
