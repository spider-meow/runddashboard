"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { elevProfile } from "@/lib/analyze";
import { parseCheckpoints } from "@/lib/checkpoints";
import { db } from "@/lib/db";
import { parseFit } from "@/lib/fit";
import { parseGpx, pointsToStream } from "@/lib/gpx";
import { activityFromPoints, hashBytes } from "@/lib/import";
import { isOwner } from "@/lib/owner";
import { parsePace } from "@/lib/pace";
import { cleanWidgets, isHexColor, THEMES } from "@/lib/prefs";
import { encodePolyline } from "@/lib/polyline";

const MAX_FILE = 10 * 1024 * 1024;
const PAGES = ["home", "historique", "projections", "courses"];

async function owner() {
  if (!(await isOwner())) throw new Error("Non autorisé");
}

// Préférences : thème, accent et disposition des widgets d'une page (une seule ligne, id = 1).
export async function savePrefs(input: { page?: string; widgets?: unknown; theme?: string; accent?: string | null }) {
  await owner();
  const client = db();
  const { data: cur } = await client.from("user_prefs").select("*").eq("id", 1).maybeSingle();
  const next = { id: 1, theme: cur?.theme ?? "poster", accent: cur?.accent ?? null, widgets: (cur?.widgets ?? {}) as Record<string, unknown> };
  if (input.theme && (THEMES as readonly string[]).includes(input.theme)) next.theme = input.theme;
  if (input.accent === null) next.accent = null;
  else if (isHexColor(input.accent)) next.accent = input.accent;
  if (input.page && PAGES.includes(input.page)) next.widgets[input.page] = cleanWidgets(input.widgets);
  const { error } = await client.from("user_prefs").upsert(next);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

// ---------- courses ----------
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createRace(formData: FormData) {
  await owner();
  const name = text(formData, "name"), date = text(formData, "date");
  const km = parseFloat(text(formData, "distance_km").replace(",", ".")), dplus = parseFloat(text(formData, "dplus") || "0");
  const pace = text(formData, "pace") ? parsePace(text(formData, "pace")) : null;
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !(km > 0)) redirect("/courses?erreur=champs");
  if (text(formData, "pace") && pace === null) redirect("/courses?erreur=allure");
  const { data, error } = await db().from("races").insert({ name, race_date: date, distance_m: Math.round(km * 1000), elevation_gain_m: isFinite(dplus) ? dplus : null, target_pace_s: pace }).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/courses");
  redirect(`/courses/${data.id}`);
}

export async function updateRace(id: string, formData: FormData) {
  await owner();
  const pace = parsePace(text(formData, "pace"));
  if (text(formData, "pace") && pace === null) redirect(`/courses/${id}?erreur=allure`);
  const { error } = await db().from("races").update({
    target_pace_s: text(formData, "pace") ? pace : null,
    checkpoints: parseCheckpoints(text(formData, "checkpoints")),
    notes: text(formData, "notes") || null,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/courses/${id}`);
  redirect(`/courses/${id}?ok=1`);
}

async function readFile(formData: FormData): Promise<{ name: string; ext: "gpx" | "fit"; bytes: Uint8Array } | string> {
  const f = formData.get("file");
  if (!(f instanceof File) || f.size === 0) return "Aucun fichier choisi.";
  if (f.size > MAX_FILE) return "Fichier trop gros (10 Mo maximum).";
  const ext = f.name.toLowerCase().endsWith(".fit") ? "fit" : f.name.toLowerCase().endsWith(".gpx") ? "gpx" : null;
  if (!ext) return "Seuls les fichiers .gpx et .fit sont acceptés.";
  return { name: f.name.replace(/\.(gpx|fit)$/i, ""), ext, bytes: new Uint8Array(await f.arrayBuffer()) };
}

// Tracé du parcours d'une course (GPX) : polyline pour la carte, profil pour l'altitude.
export async function importRaceTrack(id: string, formData: FormData) {
  await owner();
  const file = await readFile(formData);
  if (typeof file === "string") redirect(`/courses/${id}?erreur=${encodeURIComponent(file)}`);
  let points;
  try { points = file.ext === "fit" ? parseFit(file.bytes).points : parseGpx(new TextDecoder().decode(file.bytes)).points; }
  catch (e) { redirect(`/courses/${id}?erreur=${encodeURIComponent(e instanceof Error ? e.message : "Fichier illisible")}`); }
  const s = pointsToStream(points);
  const step = Math.max(1, Math.ceil(s.latlng.length / 500));
  const reduced = s.latlng.filter((_, i) => i % step === 0);
  const { error } = await db().from("races").update({
    course_polyline: encodePolyline(reduced),
    course_profile: s.altitude ? elevProfile(s.distance, s.altitude) : null,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/courses/${id}`);
  redirect(`/courses/${id}?ok=1`);
}

// ---------- import d'une activité (plan B sans Strava) ----------
export async function importActivity(formData: FormData) {
  await owner();
  const file = await readFile(formData);
  if (typeof file === "string") redirect(`/donnees?r=erreur&m=${encodeURIComponent(file)}`);
  const hash = hashBytes(file.bytes);
  let row;
  try {
    const parsed = file.ext === "fit" ? parseFit(file.bytes) : { ...parseGpx(new TextDecoder().decode(file.bytes)), startedAt: null as Date | null };
    row = activityFromPoints({ source: file.ext, externalId: hash, name: parsed.name ?? file.name, startedAt: parsed.startedAt, points: parsed.points }).row;
  } catch (e) {
    redirect(`/donnees?r=erreur&m=${encodeURIComponent(e instanceof Error ? e.message : "Fichier illisible")}`);
  }
  // ignoreDuplicates : même fichier = même empreinte = ligne déjà présente, rien n'est ajouté.
  const { data, error } = await db().from("activities").upsert(row, { onConflict: "source,external_id", ignoreDuplicates: true }).select("id");
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect(`/donnees?r=${data && data.length ? "ok" : "doublon"}`);
}
