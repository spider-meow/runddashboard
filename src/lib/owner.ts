import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { verifySession } from "./session";

export const SESSION_COOKIE = "rd_session";
export const nowS = () => Math.floor(Date.now() / 1000);

// Seul l'athlète Strava OWNER_ATHLETE_ID peut voir le dashboard (l'accord API de Strava interdit d'afficher ses données à d'autres).
export async function isOwner(): Promise<boolean> {
  const secret = process.env.SESSION_SECRET, owner = process.env.OWNER_ATHLETE_ID;
  if (!secret || !owner) return false;
  const id = verifySession((await cookies()).get(SESSION_COOKIE)?.value, secret, nowS());
  return id !== null && String(id) === owner;
}

export function validBearer(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const a = Buffer.from(header), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
