import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isOwner, validBearer } from "@/lib/owner";
import { syncActivities } from "@/lib/sync";

export const maxDuration = 60;

// POST : bouton « Synchroniser » (cookie du propriétaire). Renvoie du JSON si le client le demande (le bouton affiche le résultat
// sans quitter la page), sinon redirige vers la page d'où l'on vient. GET : uniquement avec « Authorization: Bearer CRON_SECRET »
// (tâche planifiée), jamais avec le cookie, pour qu'un lien externe ne puisse pas déclencher une synchro.
async function handle(req: Request) {
  const bearer = validBearer(req.headers.get("authorization"), process.env.CRON_SECRET);
  if (!bearer && !(req.method === "POST" && (await isOwner()))) return new Response("Non autorisé", { status: 401 });
  const wantsJson = req.method === "POST" && (req.headers.get("accept") ?? "").includes("application/json");

  let result;
  try {
    result = await syncActivities(db(), Number(process.env.OWNER_ATHLETE_ID));
  } catch (e) {
    console.error("Synchronisation échouée", e);
    const message = e instanceof Error ? e.message : "erreur inconnue";
    return wantsJson ? Response.json({ error: message }, { status: 502 }) : req.method === "POST" ? back(req, "sync") : new Response("Synchronisation échouée", { status: 502 });
  }
  if (req.method !== "POST") return Response.json(result);

  // Combien d'activités attendent encore leur analyse (30 par passage) : le client dit quoi faire ensuite.
  const { count } = await db().from("activities").select("id", { count: "exact", head: true }).eq("source", "strava").is("analyzed_at", null);
  const report = { ...result, remaining: count ?? 0 };
  return wantsJson ? Response.json(report) : back(req);
}

// Retour à la page d'origine (chemin local uniquement, jamais une URL fournie par le client).
function back(req: Request, erreur?: string) {
  let path = "/";
  try { const r = new URL(req.headers.get("referer") ?? "/", req.url); if (r.origin === new URL(req.url).origin) path = r.pathname; } catch { /* référent illisible : accueil */ }
  return NextResponse.redirect(new URL(erreur ? `${path}?erreur=${erreur}` : path, req.url), 303);
}

export const GET = handle;
export const POST = handle;
