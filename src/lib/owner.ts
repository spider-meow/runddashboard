import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { verifySession } from "./session";

export const SESSION_COOKIE = "rd_session";
export const nowS = () => Math.floor(Date.now() / 1000);

// Seul l'athlète Strava OWNER_ATHLETE_ID peut voir le dashboard. L'accord API de Strava restreint l'affichage des données d'un athlète
// à cet athlète (d'après la presse, à confirmer dans le texte de l'accord) : on reste privé par prudence, et pour le tracé GPS.
export async function isOwner(): Promise<boolean> {
  const secret = process.env.SESSION_SECRET, owner = process.env.OWNER_ATHLETE_ID;
  if (!secret || !owner) return false;
  const id = verifySession((await cookies()).get(SESSION_COOKIE)?.value, secret, nowS());
  return id !== null && String(id) === owner;
}

// Pages protégées : sans session du propriétaire, retour à l'accueil (qui propose la connexion Strava).
export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) redirect("/");
}

export function validBearer(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const a = Buffer.from(header), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
