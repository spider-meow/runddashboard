import { describe, expect, it } from "vitest";
import { authorizeUrl, mapActivity, needsRefresh, type StravaSummary } from "./strava";

const SAMPLE: StravaSummary = {
  id: 987654321012,
  name: "Sortie du dimanche",
  sport_type: "Run",
  start_date: "2026-11-15T08:30:00Z",
  distance: 12400.4,
  moving_time: 3710,
  elapsed_time: 3790,
  total_elevation_gain: 74.2,
  gear_id: "g123",
  map: { summary_polyline: "abc" },
};

describe("mapActivity", () => {
  it("transforme une activité Strava en ligne de table", () => {
    expect(mapActivity(SAMPLE)).toEqual({
      source: "strava",
      external_id: "987654321012",
      name: "Sortie du dimanche",
      sport: "Run",
      started_at: "2026-11-15T08:30:00Z",
      distance_m: 12400.4,
      moving_time_s: 3710,
      elapsed_time_s: 3790,
      elevation_gain_m: 74.2,
      avg_hr: null,
      max_hr: null,
      gear_id: "g123",
      polyline: "abc",
    });
  });
  it("garde la fréquence cardiaque quand elle est présente, sinon null", () => {
    expect(mapActivity({ ...SAMPLE, average_heartrate: 151.5, max_heartrate: 178 })).toMatchObject({ avg_hr: 151.5, max_hr: 178 });
  });
  it("accepte une activité sans tracé ni matériel", () => {
    const r = mapActivity({ ...SAMPLE, gear_id: null, map: undefined });
    expect(r.gear_id).toBeNull();
    expect(r.polyline).toBeNull();
  });
  it("donne la même clé de déduplication pour la même activité", () => {
    expect(mapActivity(SAMPLE).external_id).toBe(mapActivity({ ...SAMPLE, name: "Renommée" }).external_id);
  });
});

describe("needsRefresh", () => {
  it("refuse de rafraîchir un jeton encore valable", () => {
    expect(needsRefresh(10_000, 1_000, 60)).toBe(false);
  });
  it("rafraîchit un jeton expiré ou sur le point de l'être", () => {
    expect(needsRefresh(1_000, 1_000, 60)).toBe(true);
    expect(needsRefresh(1_050, 1_000, 60)).toBe(true);
  });
});

describe("authorizeUrl", () => {
  const u = new URL(authorizeUrl({ clientId: "42", redirectUri: "https://x.test/api/strava/callback", state: "abc123" }));
  it("pointe vers l'autorisation Strava avec les bons paramètres", () => {
    expect(u.origin + u.pathname).toBe("https://www.strava.com/oauth/authorize");
    expect(u.searchParams.get("client_id")).toBe("42");
    expect(u.searchParams.get("redirect_uri")).toBe("https://x.test/api/strava/callback");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("scope")).toBe("activity:read_all");
    expect(u.searchParams.get("state")).toBe("abc123");
  });
  it("ne contient jamais de secret", () => {
    expect(u.search).not.toMatch(/secret/i);
  });
});
