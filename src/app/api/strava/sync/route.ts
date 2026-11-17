import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isOwner, validBearer } from "@/lib/owner";
import { syncActivities } from "@/lib/sync";

// POST : bouton « Synchroniser » (cookie du propriétaire). GET/POST avec « Authorization: Bearer CRON_SECRET » : tâche planifiée.
async function handle(req: Request) {
  if (!validBearer(req.headers.get("authorization"), process.env.CRON_SECRET) && !(await isOwner())) return new Response("Non autorisé", { status: 401 });
  const fetched = await syncActivities(db(), Number(process.env.OWNER_ATHLETE_ID));
  return req.method === "POST" ? NextResponse.redirect(new URL("/", req.url), 303) : Response.json({ fetched });
}

export const GET = handle;
export const POST = handle;
