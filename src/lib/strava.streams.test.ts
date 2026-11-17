import { afterEach, describe, expect, it, vi } from "vitest";
import { activityExists, fetchStreams } from "./strava";

const reply = (status: number, body: unknown = {}) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
afterEach(() => vi.unstubAllGlobals());

describe("fetchStreams", () => {
  it("extrait temps, distance et altitude de la réponse key_by_type", async () => {
    reply(200, { time: { data: [0, 1] }, distance: { data: [0, 3] }, altitude: { data: [10, 11] } });
    expect(await fetchStreams("tok", 1)).toEqual({ time: [0, 1], distance: [0, 3], altitude: [10, 11] });
  });
  it("renvoie null pour une activité sans flux (saisie manuelle)", async () => {
    reply(200, {});
    expect(await fetchStreams("tok", 1)).toBeNull();
    reply(404);
    expect(await fetchStreams("tok", 1)).toBeNull();
  });
  it("lève une erreur sur un autre échec (quota, serveur)", async () => {
    reply(429);
    await expect(fetchStreams("tok", 1)).rejects.toThrow(/429/);
  });
});

describe("activityExists", () => {
  it("vrai sur 200, faux sur 404, erreur sinon", async () => {
    reply(200, {});
    expect(await activityExists("tok", 1)).toBe(true);
    reply(404);
    expect(await activityExists("tok", 1)).toBe(false);
    reply(500);
    await expect(activityExists("tok", 1)).rejects.toThrow();
  });
});
