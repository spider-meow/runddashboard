import { createHmac, timingSafeEqual } from "node:crypto";

// Cookie de session : "<athleteId>.<expiration en s>.<signature HMAC>". Aucune donnée secrète dedans.
const mac = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("hex");

export function signSession(athleteId: number, secret: string, nowS: number, ttlS: number): string {
  const payload = `${athleteId}.${nowS + ttlS}`;
  return `${payload}.${mac(payload, secret)}`;
}

export function verifySession(cookie: string | undefined, secret: string, nowS: number): number | null {
  const parts = cookie?.split(".");
  if (!parts || parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  const good = Buffer.from(mac(`${id}.${exp}`, secret));
  const got = Buffer.from(sig);
  if (good.length !== got.length || !timingSafeEqual(good, got)) return null;
  return Number(exp) > nowS ? Number(id) : null;
}
