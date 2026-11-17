import { Decoder, Stream } from "@garmin/fitsdk";
import type { GpxPoint } from "./gpx";

const DEG = 180 / 2147483648; // les coordonnées FIT sont en semicircles

// Lit un fichier FIT et renvoie les mêmes points que le lecteur GPX : le reste du code ne voit pas la différence.
export function parseFit(bytes: Uint8Array): { name: string | null; startedAt: Date | null; points: GpxPoint[] } {
  const decoder = new Decoder(Stream.fromByteArray(Array.from(bytes)));
  if (!decoder.isFIT()) throw new Error("Ce fichier n'est pas un FIT valide");
  const { messages } = decoder.read();

  const points: GpxPoint[] = [];
  for (const r of messages.recordMesgs ?? []) {
    if (typeof r.positionLat !== "number" || typeof r.positionLong !== "number") continue;
    const ele = r.enhancedAltitude ?? r.altitude;
    points.push({ lat: r.positionLat * DEG, lon: r.positionLong * DEG, ele: typeof ele === "number" ? ele : null, t: r.timestamp instanceof Date ? r.timestamp.getTime() : null });
  }
  if (points.length < 2) throw new Error("Aucune trace GPS exploitable dans ce fichier FIT");

  const session = messages.sessionMesgs?.[0];
  const start = session?.startTime instanceof Date ? session.startTime : points[0].t ? new Date(points[0].t) : null;
  return { name: null, startedAt: start, points };
}
