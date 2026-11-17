import { after } from "next/server";
import { db } from "@/lib/db";
import { activityExists } from "@/lib/strava";
import { getAccessToken, syncActivities } from "@/lib/sync";
import { classifyEvent } from "@/lib/webhook";

export const maxDuration = 60;

// Validation de l'abonnement : Strava appelle cette URL en GET avec un défi à renvoyer tel quel (en moins de 2 s).
export function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const token = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
  if (!token || p.get("hub.mode") !== "subscribe" || p.get("hub.verify_token") !== token) return new Response("Forbidden", { status: 403 });
  return Response.json({ "hub.challenge": p.get("hub.challenge") });
}

// Événements : on répond 200 tout de suite (Strava exige moins de 2 s, puis réessaie jusqu'à 3 fois), le travail se fait après.
export async function POST(req: Request) {
  const ev = await req.json().catch(() => null);
  const owner = process.env.OWNER_ATHLETE_ID;
  if (!owner) return new Response("ok");
  const todo = classifyEvent(ev, owner);
  if (todo.action === "ignore") return new Response("ok");

  after(async () => {
    try {
      const client = db(), athlete = Number(owner);
      if (todo.action === "sync") await syncActivities(client, athlete);
      else if (todo.action === "deauthorize") await client.from("strava_connections").delete().eq("athlete_id", athlete);
      else if (todo.action === "verify-delete") {
        // L'événement n'est pas signé : on ne supprime que si Strava confirme que l'activité n'existe plus.
        if (!(await activityExists(await getAccessToken(client, athlete), todo.activityId))) {
          await client.from("activities").delete().eq("source", "strava").eq("external_id", todo.activityId);
        }
      }
    } catch (e) {
      console.error("Webhook Strava", e);
    }
  });
  return new Response("ok");
}
