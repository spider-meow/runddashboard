import { describe, expect, it } from "vitest";
import { isHexColor, mergeWidgets, onAccent, THEMES } from "./prefs";

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
