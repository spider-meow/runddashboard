import { createHash } from "node:crypto";
import { analyzeStream, type Split } from "./analyze";
import { pointsToStream, type GpxPoint } from "./gpx";
import { encodePolyline } from "./polyline";

export type ActivityInsert = {
  source: "gpx" | "fit";
  external_id: string;
  name: string;
  sport: string;
  started_at: string;
  distance_m: number;
  moving_time_s: number;
  elapsed_time_s: number;
  elevation_gain_m: number;
  polyline: string;
  splits: Split[];
  best_efforts: Record<string, number>;
  elev_profile: [number, number][];
  analyzed_at: string;
};

// Empreinte du contenu : le même fichier importé deux fois a le même external_id, donc n'ajoute rien (clé unique en base).
export const hashBytes = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const downsample = <T,>(a: T[], max: number): T[] => {
  const step = Math.max(1, Math.ceil(a.length / max));
  const out = a.filter((_, i) => i % step === 0);
  return out[out.length - 1] === a[a.length - 1] ? out : [...out, a[a.length - 1]];
};

export function activityFromPoints(o: { source: "gpx" | "fit"; externalId: string; name: string; startedAt: Date | null; points: GpxPoint[] }): { row: ActivityInsert } {
  const s = pointsToStream(o.points);
  if (!s.time) throw new Error("Ce fichier n'a pas d'horodatage : impossible de calculer les allures");
  const a = analyzeStream({ distance: s.distance, time: s.time, altitude: s.altitude });
  const total = s.distance[s.distance.length - 1], time = s.time[s.time.length - 1];
  return {
    row: {
      source: o.source, external_id: o.externalId, name: o.name, sport: "Run",
      started_at: (o.startedAt ?? new Date(o.points[0].t!)).toISOString(),
      distance_m: Math.round(total), moving_time_s: Math.round(time), elapsed_time_s: Math.round(time),
      elevation_gain_m: a.elevation_gain_m,
      polyline: encodePolyline(downsample(s.latlng, 500)),
      splits: a.splits, best_efforts: a.best_efforts, elev_profile: a.elev_profile,
      analyzed_at: new Date().toISOString(),
    },
  };
}
