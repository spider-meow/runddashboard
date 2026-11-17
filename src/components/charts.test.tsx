import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ElevationProfile, PaceBars, VolumeBars } from "./charts";

// Les graphiques sont des images pour un lecteur d'écran ou un agent : leur libellé doit porter les chiffres clés.
describe("libellés des graphiques", () => {
  it("volume : total, maximum, semaine en cours", () => {
    const weeks = [10, 30, 20].map((km, i) => ({ weekStart: `2026-11-0${i + 1}`, km, dplus: 0, pace: 300 }));
    const html = renderToStaticMarkup(<VolumeBars weeks={weeks} />);
    expect(html).toContain("total 60 km");
    expect(html).toContain("maximum 30 km");
    expect(html).toContain("semaine en cours 20 km");
  });
  it("profil : départ, arrivée, extrêmes", () => {
    const html = renderToStaticMarkup(<ElevationProfile profile={[[0, 128], [1, 150], [2, 103], [3, 130]]} />);
    expect(html).toContain("sur 3 km");
    expect(html).toContain("départ 128 m, arrivée 130 m");
    expect(html).toContain("de 103 m (point bas) à 150 m (point haut)");
  });
  it("allure : moyenne, plus rapide, plus lent", () => {
    const splits = [{ km: 1, time_s: 300, elev_m: 0, partial: false }, { km: 2, time_s: 280, elev_m: 0, partial: false }, { km: 3, time_s: 320, elev_m: 0, partial: false }];
    const html = renderToStaticMarkup(<PaceBars splits={splits} totalM={3000} />);
    expect(html).toContain("moyenne 5:00 /km");
    expect(html).toContain("plus rapide au km 2 (4:40)");
    expect(html).toContain("plus lent au km 3 (5:20)");
  });
});
