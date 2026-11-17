import { after } from "next/server";
import { db } from "@/lib/db";
import { safeEqual } from "@/lib/owner";
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
// Les événements ne sont pas signés et l'identifiant d'athlète est public : l'URL de rappel porte donc un secret (?token=),
// ajouté par scripts/strava-subscribe.mjs. Sans lui, n'importe qui pourrait déclencher des synchros et épuiser le quota Strava.
export async function POST(req: Request) {
  if (!safeEqual(new URL(req.url).searchParams.get("token"), process.env.STRAVA_WEBHOOK_VERIFY_TOKEN)) return new Response("Unauthorized", { status: 401 });
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
