import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RouteMap } from "./RouteMap";

describe("RouteMap", () => {
  it("dessine le tracé avec l'animation de dessin", () => {
    const html = renderToStaticMarkup(<RouteMap polyline={"_p~iF~ps|U_ulLnnqC_mqNvxq`@"} />);
    expect(html).toContain('class="route draw go"');
    expect(html).toContain('pathLength="1"');
    expect(html).toContain("--len:1");
  });
  it("n'affiche rien sans tracé exploitable", () => {
    expect(renderToStaticMarkup(<RouteMap polyline="" />)).toBe("");
  });
});
