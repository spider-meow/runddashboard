import { describe, expect, it } from "vitest";
import { daysUntil, fmtDate, parisDay } from "./dates";

describe("dates", () => {
  it("donne le jour calendaire à Paris, pas en UTC", () => {
    expect(parisDay(new Date("2026-11-17T23:30:00Z"))).toBe("2026-11-18"); // 00:30 à Paris
    expect(parisDay(new Date("2026-11-17T12:00:00Z"))).toBe("2026-11-17");
  });
  it("compte les jours restants avant une date", () => {
    expect(daysUntil("2026-11-22", new Date("2026-11-17T12:00:00Z"))).toBe(5);
    expect(daysUntil("2026-11-22", new Date("2026-11-22T06:00:00Z"))).toBe(0);
    expect(daysUntil("2026-11-22", new Date("2026-11-25T06:00:00Z"))).toBe(-3);
  });
  it("formate une date en français", () => {
    expect(fmtDate("2026-11-22T08:30:00Z", { day: "numeric", month: "long" })).toBe("22 novembre");
    expect(fmtDate("2026-11-14T08:00:00Z", { weekday: "long", day: "numeric", month: "long" })).toBe("samedi 14 novembre");
  });
});
