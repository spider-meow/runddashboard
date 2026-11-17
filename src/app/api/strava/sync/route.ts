import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isOwner, validBearer } from "@/lib/owner";
import { syncActivities } from "@/lib/sync";

export const maxDuration = 60;

// POST : bouton « Synchroniser » (cookie du propriétaire). GET : uniquement avec « Authorization: Bearer CRON_SECRET » (tâche planifiée),
// jamais avec le cookie, pour qu'un lien externe ne puisse pas déclencher une synchro.
async function handle(req: Request) {
  const bearer = validBearer(req.headers.get("authorization"), process.env.CRON_SECRET);
  if (!bearer && !(req.method === "POST" && (await isOwner()))) return new Response("Non autorisé", { status: 401 });
  const result = await syncActivities(db(), Number(process.env.OWNER_ATHLETE_ID));
  return req.method === "POST" ? NextResponse.redirect(new URL("/", req.url), 303) : Response.json(result);
}

export const GET = handle;
export const POST = handle;
