import type { CSSProperties } from "react";
import { decodePolyline, toSvgPath } from "@/lib/polyline";

// Tracé dessiné progressivement en CSS pur (pathLength=1 + stroke-dashoffset), sans JavaScript côté navigateur.
export function RouteMap({ polyline }: { polyline: string }) {
  const d = toSvgPath(decodePolyline(polyline), 400, 300, 24);
  if (!d) return null;
  return (
    <div className="map" style={{ aspectRatio: "4 / 3" }}>
      <svg viewBox="0 0 400 300" role="img" aria-label="Tracé de la dernière course">
        <path d={d} className="route-bg" />
        <path d={d} className="route draw go" pathLength={1} style={{ "--len": 1 } as CSSProperties} />
      </svg>
    </div>
  );
}
