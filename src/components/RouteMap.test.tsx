import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RouteMap } from "./RouteMap";

describe("RouteMap", () => {
  it("dessine le tracé avec l'animation de dessin", () => {
    const html = renderToStaticMarkup(<RouteMap polyline={"_p~iF~ps|U_ulLnnqC_mqNvxq`@"} />);
    expect(html).toContain('class="route draw go"');
    expect(html).toContain('pathLength="1"');
    expect(html).toContain("--len:1");
  });
  it("pose un fond de carte OpenStreetMap avec l'attribution, assombri sauf pour Sunrise", () => {
    const poly = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
    const dark = renderToStaticMarkup(<RouteMap polyline={poly} />);
    expect(dark).toContain("<image");
    expect(dark).toContain("https://tile.openstreetmap.org/");
    expect(dark).toContain("© OpenStreetMap contributors");
    expect(dark).toContain("tiles-dark");
    expect(renderToStaticMarkup(<RouteMap polyline={poly} theme="sunrise" />)).toContain("tiles-light");
  });
  it("MAP_TILES=off garde la carte schématique, sans aucune tuile", () => {
    vi.stubEnv("MAP_TILES", "off");
    const html = renderToStaticMarkup(<RouteMap polyline={"_p~iF~ps|U_ulLnnqC_mqNvxq`@"} />);
    vi.unstubAllEnvs();
    expect(html).not.toContain("<image");
    expect(html).not.toContain("map-attr");
    expect(html).toContain('class="route draw go"');
  });
  it("MAP_TILE_URL remplace le fournisseur", () => {
    vi.stubEnv("MAP_TILE_URL", "https://tuiles.exemple/{z}/{x}/{y}.png");
    const html = renderToStaticMarkup(<RouteMap polyline={"_p~iF~ps|U_ulLnnqC_mqNvxq`@"} />);
    vi.unstubAllEnvs();
    expect(html).toContain("https://tuiles.exemple/");
    expect(html).not.toContain("tile.openstreetmap.org");
  });
  it("n'affiche rien sans tracé exploitable", () => {
    expect(renderToStaticMarkup(<RouteMap polyline="" />)).toBe("");
  });
});
