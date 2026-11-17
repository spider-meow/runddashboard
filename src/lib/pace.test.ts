import { describe, expect, it } from "vitest";
import { fmtKm, fmtPace, fmtTime, paceSecPerKm, parsePace } from "./pace";

describe("pace", () => {
  it("formate une allure en min:s", () => {
    expect(fmtPace(290)).toBe("4:50");
    expect(fmtPace(299.6)).toBe("5:00");
    expect(fmtPace(305)).toBe("5:05");
  });
  it("formate un temps, avec ou sans heures", () => {
    expect(fmtTime(4698)).toBe("1:18:18");
    expect(fmtTime(3710)).toBe("1:01:50");
    expect(fmtTime(1302)).toBe("21:42");
  });
  it("calcule l'allure en s/km", () => {
    expect(paceSecPerKm(3710, 12400)).toBeCloseTo(299.19, 1);
    expect(paceSecPerKm(100, 0)).toBeNull();
  });
});

describe("parsePace et fmtKm", () => {
  it("lit une allure saisie en min:s", () => {
    expect(parsePace("4:50")).toBe(290);
    expect(parsePace(" 5:05 ")).toBe(305);
    expect(parsePace("4:5")).toBeNull();
    expect(parsePace("abc")).toBeNull();
    expect(parsePace("4:75")).toBeNull();
  });
  it("formate une distance en kilomètres avec une virgule", () => {
    expect(fmtKm(12400)).toBe("12,4");
    expect(fmtKm(5039.5)).toBe("5,0");
    expect(fmtKm(16200)).toBe("16,2");
  });
});