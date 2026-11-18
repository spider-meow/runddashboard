// Faux Supabase (PostgREST minimal, en mémoire) pour les tests de bout en bout : filtres eq / in / is / not.is, order, limit,
// select (colonnes), insert, upsert (ignore-duplicates), update, delete. Aucune clé, aucun réseau.
// Réglages : POST /__reset (données de départ), POST /__latency?ms=N (latence des lectures, pour voir les squelettes).
import http from "node:http";
import { randomUUID } from "node:crypto";

const enc = (n) => { n = n < 0 ? ~(n << 1) : n << 1; let s = ""; while (n >= 0x20) { s += String.fromCharCode((0x20 | (n & 0x1f)) + 63); n >>= 5; } return s + String.fromCharCode(n + 63); };
const poly = (pts) => { let la = 0, lo = 0, o = ""; for (const [a, b] of pts) { const A = Math.round(a * 1e5), B = Math.round(b * 1e5); o += enc(A - la) + enc(B - lo); la = A; lo = B; } return o; };
const loop = (k) => Array.from({ length: 60 }, (_, i) => { const t = (i / 59) * Math.PI * 2; return [48.842 + 0.012 * Math.sin(t) * (1 + 0.3 * Math.sin(3 * t + k)), 2.19 + 0.02 * Math.cos(t)]; });
const DAY = 864e5;

function seed() {
  const now = Date.now();
  const runs = Array.from({ length: 30 }, (_, i) => {
    const km = [5, 8, 10, 6, 12][i % 5];
    return {
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, source: "strava", external_id: "e" + i, name: `Sortie ${i + 1}`, sport: "Run",
      started_at: new Date(now - (i * 2.3 + 0.3) * DAY).toISOString(), distance_m: km * 1000 + 20 * i, moving_time_s: Math.round(km * 295 + i * 9),
      elevation_gain_m: 40 + (i * 13) % 160, avg_hr: 150, gear_id: "g1", best_efforts: { "1K": 235 + i, "5K": 1310 + i * 4, "10K": 2780 + i * 6 },
      analyzed_at: new Date().toISOString(), polyline: poly(loop(i)),
      splits: Array.from({ length: km }, (_, k) => ({ km: k + 1, time_s: 285 + Math.round(20 * Math.sin(k)), elev_m: Math.round(8 * Math.sin(k / 2)), partial: false })),
      elev_profile: Array.from({ length: 30 }, (_, k) => [+((k / 29) * km).toFixed(2), 120 + 30 * Math.sin(k / 5)]),
    };
  });
  return {
    activities: runs,
    races: [{ id: "22222222-2222-4222-8222-222222222222", name: "10 km du Parc", race_date: runs[13].started_at.slice(0, 10), distance_m: 6000, elevation_gain_m: 30, target_pace_s: 300, course_polyline: null, course_profile: null, checkpoints: [], notes: null }, { id: "11111111-1111-4111-8111-111111111111", name: "Semi de Garches", race_date: new Date(now + 23 * DAY).toISOString().slice(0, 10), distance_m: 21097, elevation_gain_m: 215, target_pace_s: 290, course_polyline: poly(loop(1.5)), course_profile: Array.from({ length: 40 }, (_, k) => [+((k / 39) * 21.1).toFixed(2), 120 + 35 * Math.sin(k / 6)]), checkpoints: [], notes: null }],
    gear: [{ id: "g1", name: "Pegasus 41" }],
    strava_connections: [],
  };
}

let db = seed(), latency = 0;
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function matches(row, params) {
  for (const [k, v] of params) {
    if (RESERVED.has(k)) continue;
    const x = row[k];
    if (v.startsWith("eq.")) { if (String(x) !== v.slice(3)) return false; }
    else if (v.startsWith("in.(")) { if (!v.slice(4, -1).split(",").includes(String(x))) return false; }
    else if (v === "is.null") { if (x != null) return false; }
    else if (v === "not.is.null") { if (x == null) return false; }
  }
  return true;
}
const project = (row, select) => (!select || select === "*" ? row : Object.fromEntries(select.split(",").map((c) => c.trim()).filter(Boolean).map((c) => [c, row[c] ?? null])));
const body = (req) => new Promise((ok) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => ok(d ? JSON.parse(d) : null)); });

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"), table = u.pathname.split("/").pop(), prefer = req.headers.prefer ?? "", asObject = (req.headers.accept ?? "").includes("object+json");
  const send = (status, data, headers = {}) => { res.writeHead(status, { "content-type": "application/json", ...headers }); res.end(data === undefined ? "" : JSON.stringify(data)); };
  if (u.pathname === "/__reset") { db = seed(); latency = 0; return send(200, { ok: true }); }
  if (u.pathname === "/__latency") { latency = +(u.searchParams.get("ms") ?? 0); return send(200, { latency }); }
  if (u.pathname === "/__dump") return send(200, db);
  const rows = db[table];
  if (!rows) return send(404, { code: "PGRST205", message: `table ${table} does not exist` });
  const params = [...u.searchParams.entries()], select = u.searchParams.get("select");
  const wantRows = prefer.includes("return=representation");
  const reply = (list) => asObject ? (list.length === 1 ? send(200, list[0]) : send(406, { code: "PGRST116", message: "expected one row" })) : send(200, list);

  if (req.method === "GET" || req.method === "HEAD") {
    let out = rows.filter((r) => matches(r, params));
    const order = u.searchParams.get("order");
    if (order) { const [c, dir] = order.split("."); out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (dir === "desc" ? -1 : 1)); }
    const lim = +(u.searchParams.get("limit") ?? 0); if (lim) out = out.slice(0, lim);
    if (latency) await new Promise((r) => setTimeout(r, latency));
    if (req.method === "HEAD") return send(200, undefined, { "content-range": `*/${out.length}` });
    return reply(out.map((r) => project(r, select)));
  }
  if (req.method === "POST") {
    const items = [].concat(await body(req)), added = [], conflict = u.searchParams.get("on_conflict");
    for (const it of items) {
      const row = { id: randomUUID(), ...(table === "races" ? { checkpoints: [], notes: null, course_polyline: null, course_profile: null } : {}), ...it }; // valeurs par défaut des colonnes
      if (conflict && rows.some((r) => conflict.split(",").every((c) => r[c] === row[c]))) { if (prefer.includes("ignore-duplicates")) continue; }
      rows.push(row); added.push(row);
    }
    return wantRows ? (res.statusCode = 201, asObject ? (added.length === 1 ? send(201, project(added[0], select)) : send(406, { code: "PGRST116", message: "expected one row" })) : send(201, added.map((r) => project(r, select)))) : send(201);
  }
  if (req.method === "PATCH") {
    const patch = await body(req), hit = rows.filter((r) => matches(r, params));
    if (process.env.FAKE_LOG) console.error("PATCH", table, req.url, JSON.stringify(patch), "->", hit.length);
    hit.forEach((r) => Object.assign(r, patch));
    return wantRows ? reply(hit.map((r) => project(r, select))) : send(204);
  }
  if (req.method === "DELETE") {
    db[table] = rows.filter((r) => !matches(r, params));
    return send(204);
  }
  send(405, { message: "méthode non gérée" });
}).listen(+(process.env.FAKE_PORT ?? 54399), "127.0.0.1", () => console.log("faux Supabase prêt"));
