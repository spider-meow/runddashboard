import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGear } from "./strava";
import { shoeStats } from "./stats";

const run = (gear_id: string | null, km: number, started_at = "2026-11-01T08:00:00Z") => ({ gear_id, distance_m: km * 1000, started_at });
const gear = [{ id: "g1", name: "Nike Pegasus" }, { id: "g2", name: "Hoka Clifton" }];

describe("shoeStats", () => {
  const s = shoeStats([run("g1", 10), run("g1", 5, "2026-11-10T08:00:00Z"), run("g2", 21), run(null, 8)], gear);
  it("additionne les kilomètres et les sorties par paire, la plus utilisée d'abord", () => {
    expect(s.map((x) => x.name)).toEqual(["Hoka Clifton", "Nike Pegasus"]);
    expect(s[1]).toMatchObject({ id: "g1", km: 15, runs: 2, lastUsed: "2026-11-10" });
  });
  it("ignore les sorties sans matériel", () => {
    expect(s.reduce((a, x) => a + x.runs, 0)).toBe(3);
  });
  it("utilise l'identifiant quand la paire est inconnue", () => {
    expect(shoeStats([run("zz", 3)], [])[0].name).toBe("zz");
  });
  it("renvoie une liste vide sans matériel", () => {
    expect(shoeStats([run(null, 5)], gear)).toEqual([]);
  });
});

const reply = (status: number, body: unknown = {}) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
afterEach(() => vi.unstubAllGlobals());

describe("fetchGear", () => {
  it("lit l'équipement Strava", async () => {
    reply(200, { id: "g1", name: "Nike Pegasus", brand_name: "Nike", model_name: "Pegasus 41", distance: 123456, resource_state: 3 });
    expect(await fetchGear("tok", "g1")).toEqual({ id: "g1", name: "Nike Pegasus", brand_name: "Nike", model_name: "Pegasus 41", distance_m: 123456 });
  });
  it("renvoie null si l'équipement n'existe plus, lève une erreur sinon", async () => {
    reply(404);
    expect(await fetchGear("tok", "g1")).toBeNull();
    reply(500);
    await expect(fetchGear("tok", "g1")).rejects.toThrow(/500/);
  });
  it("garde un nom par défaut si Strava n'en donne pas", async () => {
    reply(200, { id: "g9", brand_name: "Asics", model_name: "Novablast" });
    expect((await fetchGear("tok", "g9"))!.name).toBe("Asics Novablast");
  });
});
