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

// Comparaison en temps constant ; faux si l'un des deux est vide (un secret absent ne doit jamais « correspondre »).
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const validBearer = (header: string | null, secret: string | undefined): boolean => !!secret && safeEqual(header, `Bearer ${secret}`);
