import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { nowS, SESSION_COOKIE } from "@/lib/owner";
import { signSession } from "@/lib/session";
import { exchangeCode } from "@/lib/strava";
import { syncActivities } from "@/lib/sync";

export const maxDuration = 60; // la synchro initiale enchaîne jusqu'à 10 appels Strava

const home = (req: Request, erreur?: string) => NextResponse.redirect(new URL(erreur ? `/?erreur=${erreur}` : "/", req.url));

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const state = req.cookies.get("rd_state")?.value;
  if (!state || p.get("state") !== state) return new Response("État OAuth invalide", { status: 400 });
  if (p.get("error")) return home(req, "refus");

  const code = p.get("code");
  if (!code || !(p.get("scope") ?? "").includes("activity:read_all")) return home(req, "autorisation");

  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, OWNER_ATHLETE_ID, SESSION_SECRET } = process.env;
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !OWNER_ATHLETE_ID || !SESSION_SECRET) return new Response("Configuration serveur incomplète", { status: 500 });

  const t = await exchangeCode(STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, code);
  // Dashboard privé : on ne garde les jetons que de l'athlète propriétaire.
  if (String(t.athlete.id) !== OWNER_ATHLETE_ID) return new Response("Cet athlète n'est pas autorisé", { status: 403 });

  const client = db();
  const { error } = await client.from("strava_connections").upsert({
    athlete_id: t.athlete.id, access_token: t.access_token, refresh_token: t.refresh_token,
    expires_at: t.expires_at, scope: p.get("scope"), updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  // Une synchro qui échoue ne doit pas empêcher la connexion : le bouton « Synchroniser » sert de nouvel essai.
  let syncFailed = false;
  try { await syncActivities(client, t.athlete.id); } catch (e) { syncFailed = true; console.error("Synchro initiale échouée", e); }

  const res = home(req, syncFailed ? "sync" : undefined);
  res.cookies.delete({ name: "rd_state", path: "/api/strava" });
  res.cookies.set(SESSION_COOKIE, signSession(t.athlete.id, SESSION_SECRET, nowS(), 30 * 86400), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400,
  });
  return res;
}
