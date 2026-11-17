import { describe, expect, it } from "vitest";
import { fmtPace, fmtTime, paceSecPerKm } from "./pace";

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
