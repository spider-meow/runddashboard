import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/strava";

export function GET(req: Request) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) return new Response("STRAVA_CLIENT_ID manquant", { status: 500 });

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl({ clientId, redirectUri: new URL("/api/strava/callback", req.url).toString(), state }));
  res.cookies.set("rd_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/strava", maxAge: 600 });
  return res;
}
