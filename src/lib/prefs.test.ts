import { describe, expect, it } from "vitest";
import { applyPrefsUpdate, cleanWidgets, isHexColor, mergeWidgets, onAccent, THEMES } from "./prefs";

const DEFAULTS = [
  { id: "a", visible: true, size: "m" as const },
  { id: "b", visible: true, size: "l" as const },
  { id: "c", visible: true, size: "s" as const },
];

describe("mergeWidgets", () => {
  it("renvoie les valeurs par défaut sans préférence enregistrée", () => {
    expect(mergeWidgets(undefined, DEFAULTS)).toEqual(DEFAULTS);
  });
  it("respecte l'ordre, la visibilité et la taille enregistrés", () => {
    const m = mergeWidgets([{ id: "c", visible: false, size: "xl" }, { id: "a", visible: true, size: "s" }], DEFAULTS);
    expect(m.map((w) => w.id)).toEqual(["c", "a", "b"]);
    expect(m[0]).toEqual({ id: "c", visible: false, size: "xl" });
  });
  it("ignore les widgets disparus et ajoute les nouveaux à la fin", () => {
    const m = mergeWidgets([{ id: "zzz", visible: true, size: "m" }, { id: "b", visible: true, size: "m" }], DEFAULTS);
    expect(m.map((w) => w.id)).toEqual(["b", "a", "c"]);
  });
  it("corrige une taille ou une visibilité invalide et un doublon", () => {
    const m = mergeWidgets([{ id: "a", visible: "oui", size: "énorme" }, { id: "a", visible: false, size: "s" }] as never, DEFAULTS);
    expect(m.filter((w) => w.id === "a")).toEqual([{ id: "a", visible: true, size: "m" }]);
  });
});

describe("couleurs", () => {
  it("valide un code hexadécimal à 6 chiffres", () => {
    expect(isHexColor("#c8f031")).toBe(true);
    expect(isHexColor("c8f031")).toBe(false);
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("red; background:url(x)")).toBe(false);
  });
  it("choisit un texte sombre sur un accent clair, clair sur un accent foncé", () => {
    expect(onAccent("#c8f031")).toBe("#14110f");
    expect(onAccent("#1a2a6c")).toBe("#ffffff");
  });
  it("connaît les trois thèmes", () => {
    expect(THEMES).toEqual(["poster", "sunrise", "midnight"]);
  });
});

describe("cleanWidgets", () => {
  it("ne garde que des widgets bien formés", () => {
    const r = cleanWidgets([{ id: "a", visible: true, size: "m" }, { id: 5, visible: true, size: "m" }, { id: "b", visible: "x", size: "m" }, { id: "c", visible: false, size: "geant" }, null, { id: "a", visible: false, size: "s" }]);
    expect(r).toEqual([{ id: "a", visible: true, size: "m" }]);
  });
  it("renvoie un tableau vide pour une entrée invalide et plafonne la taille de la liste", () => {
    expect(cleanWidgets("n'importe quoi")).toEqual([]);
    expect(cleanWidgets(Array.from({ length: 100 }, (_, i) => ({ id: "w" + i, visible: true, size: "s" }))).length).toBe(30);
  });
});
describe("applyPrefsUpdate", () => {
  const cur = { theme: "poster", accent: "#c8f031", widgets: { home: [{ id: "a", visible: false, size: "m" }] } };
  it("un changement de thème garde la disposition des widgets", () => {
    const n = applyPrefsUpdate(cur, { page: "home", theme: "sunrise" });
    expect(n.theme).toBe("sunrise");
    expect(n.widgets.home).toEqual([{ id: "a", visible: false, size: "m" }]);
  });
  it("un changement d'accent garde le thème et les widgets", () => {
    const n = applyPrefsUpdate(cur, { page: "home", accent: "#112233" });
    expect(n).toMatchObject({ theme: "poster", accent: "#112233" });
    expect(n.widgets.home).toHaveLength(1);
  });
  it("remplace les widgets d'une seule page", () => {
    const n = applyPrefsUpdate(cur, { page: "historique", widgets: [{ id: "x", visible: true, size: "s" }] });
    expect(n.widgets.historique).toEqual([{ id: "x", visible: true, size: "s" }]);
    expect(n.widgets.home).toEqual(cur.widgets.home);
  });
  it("accent null le réinitialise ; valeurs invalides ignorées", () => {
    expect(applyPrefsUpdate(cur, { accent: null }).accent).toBeNull();
    expect(applyPrefsUpdate(cur, { accent: "rouge" }).accent).toBe("#c8f031");
    expect(applyPrefsUpdate(cur, { theme: "neon" }).theme).toBe("poster");
    expect(applyPrefsUpdate(cur, { page: "inconnue", widgets: [] }).widgets).toEqual(cur.widgets);
  });
  it("ne modifie pas l'objet d'origine", () => {
    applyPrefsUpdate(cur, { page: "home", widgets: [] });
    expect(cur.widgets.home).toHaveLength(1);
  });
});