import type { CSSProperties } from "react";
import type { Theme } from "@/lib/prefs";
import { decodePolyline, toSvgPath } from "@/lib/polyline";
import { mercatorFit, tileUrl } from "@/lib/tiles";

const W = 400, H = 300, PAD = 24;
const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// Fond de carte : tuiles OpenStreetMap, assombries en CSS pour les thèmes sombres (Poster, Midnight).
// Le navigateur les télécharge directement chez le fournisseur, qui voit donc la zone affichée (et ton IP) : voir README.
// MAP_TILES=off le désactive (carte schématique, aucun tiers). MAP_TILE_URL remplace le fournisseur ({z}, {x}, {y}).
const tilesEnabled = () => process.env.MAP_TILES !== "off";
const template = () => process.env.MAP_TILE_URL || OSM;

// Tracé dessiné progressivement en CSS pur (pathLength=1 + stroke-dashoffset), sans JavaScript côté navigateur.
export function RouteMap({ polyline, label = "Tracé de la dernière course", theme = "poster" }: { polyline: string; label?: string; theme?: Theme }) {
  const points = decodePolyline(polyline);
  const fit = tilesEnabled() ? mercatorFit(points, W, H, PAD) : null;
  const d = fit?.d ?? toSvgPath(points, W, H, PAD);
  if (!d) return null;
  const tpl = template();
  return (
    <div className="map" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={fit ? "on-tiles" : undefined}>
        {fit && (
          <g aria-hidden="true" className={theme === "sunrise" ? "tiles tiles-light" : "tiles tiles-dark"}>
            {fit.tiles.map((t) => <image key={`${t.tx}/${t.ty}`} href={tileUrl(tpl, fit.z, t.tx, t.ty)} x={t.x} y={t.y} width={t.size + 0.6} height={t.size + 0.6} preserveAspectRatio="none" />)}
          </g>
        )}
        <path d={d} className="route-bg" />
        <path d={d} className="route draw go" pathLength={1} style={{ "--len": 1 } as CSSProperties} />
      </svg>
      {fit && <p className="map-attr"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">© OpenStreetMap contributors</a></p>}
    </div>
  );
}
