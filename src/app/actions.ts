"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { elevProfile, elevationGain } from "@/lib/analyze";
import { parseCheckpoints } from "@/lib/checkpoints";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { checkpointIssue, parseRaceFields, type FormState } from "@/lib/forms";
import { parseFit } from "@/lib/fit";
import { parseGpx, pointsToStream } from "@/lib/gpx";
import { activityFromPoints, hashBytes } from "@/lib/import";
import { isOwner, SESSION_COOKIE } from "@/lib/owner";
import { fmtKm } from "@/lib/pace";
import { encodePolyline } from "@/lib/polyline";

// Vercel refuse tout corps de requête de plus de 4,5 Mo (limite fixe) : 4 Mo de fichier laissent la place du formulaire.
const MAX_FILE = 4 * 1024 * 1024;

// Session absente ou expirée : retour à l'accueil (qui propose la connexion), jamais une page d'erreur.
async function guard() {
  if (!(await isOwner())) redirect("/");
}

const raw = (f: FormData): Record<string, string> => Object.fromEntries([...f.entries()].filter((e): e is [string, string] => typeof e[1] === "string"));
const fail = (message: string, extra: Partial<FormState> = {}): FormState => ({ status: "error", message, ...extra });
const why = (e: unknown) => (e instanceof Error ? e.message : "erreur inconnue");

// ---------- déconnexion ----------
export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

// ---------- courses ----------
export async function createRace(_prev: FormState, formData: FormData): Promise<FormState> {
  await guard();
  const values = raw(formData), { data, errors } = parseRaceFields(values);
  if (!data) return fail("Corrige les champs signalés.", { errors, values });
  const { data: row, error } = await db().from("races").insert(data).select("id").single();
  if (error) return fail(`Enregistrement impossible : ${error.message}`, { values });
  revalidatePath("/courses");
  redirect(`/courses/${row.id}?cree=1`);
}

export async function updateRace(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await guard();
  const values = raw(formData), { data, errors } = parseRaceFields(values);
  const checkpoints = values.checkpoints ?? "";
  if (data) {
    const issue = checkpointIssue(checkpoints, data.distance_m / 1000);
    if (issue) errors.checkpoints = issue;
  }
  if (!data || Object.keys(errors).length) return fail("Corrige les champs signalés.", { errors, values });
  const { error } = await db().from("races").update({ ...data, checkpoints: parseCheckpoints(checkpoints), notes: (values.notes ?? "").trim() || null }).eq("id", id);
  if (error) return fail(`Enregistrement impossible : ${error.message}`, { values });
  revalidatePath("/courses", "layout");
  return { status: "ok", message: "Modifications enregistrées.", values };
}

export async function deleteRace(id: string, _prev: FormState): Promise<FormState> {
  await guard();
  const { error } = await db().from("races").delete().eq("id", id);
  if (error) return fail(`Suppression impossible : ${error.message}`);
  revalidatePath("/", "layout");
  redirect("/courses?supprimee=1");
}

async function readFile(formData: FormData): Promise<{ name: string; ext: "gpx" | "fit"; bytes: Uint8Array } | string> {
  const f = formData.get("file");
  if (!(f instanceof File) || f.size === 0) return "Choisis d'abord un fichier .gpx ou .fit.";
  if (f.size > MAX_FILE) return "Fichier trop gros (4 Mo maximum).";
  const ext = f.name.toLowerCase().endsWith(".fit") ? "fit" : f.name.toLowerCase().endsWith(".gpx") ? "gpx" : null;
  if (!ext) return "Seuls les fichiers .gpx et .fit sont acceptés.";
  return { name: f.name.replace(/\.(gpx|fit)$/i, ""), ext, bytes: new Uint8Array(await f.arrayBuffer()) };
}

// Tracé du parcours d'une course (GPX ou FIT) : polyline pour la carte, profil pour l'altitude.
export async function importRaceTrack(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await guard();
  const file = await readFile(formData);
  if (typeof file === "string") return fail(file);
  let s;
  try { s = pointsToStream((file.ext === "fit" ? parseFit(file.bytes) : parseGpx(new TextDecoder().decode(file.bytes))).points); }
  catch (e) { return fail(`Fichier illisible : ${why(e)}`); }
  const { data: race } = await db().from("races").select("distance_m").eq("id", id).maybeSingle();
  if (!race) return fail("Cette course n'existe plus.");

  const step = Math.max(1, Math.ceil(s.latlng.length / 500));
  const { error } = await db().from("races").update({
    course_polyline: encodePolyline(s.latlng.filter((_, i) => i % step === 0)),
    course_profile: s.altitude ? elevProfile(s.distance, s.altitude) : null,
  }).eq("id", id);
  if (error) return fail(`Import impossible : ${error.message}`);
  revalidatePath(`/courses/${id}`);

  // On dit ce qu'on a lu, et on signale un tracé qui ne correspond visiblement pas à la course.
  const trackM = s.distance[s.distance.length - 1], gain = s.altitude ? Math.round(elevationGain(s.altitude)) : null;
  let message = `Tracé importé : ${fmtKm(trackM)} km${gain !== null ? `, ${gain} m de D+` : ", sans altitude (pas de profil)"}.`;
  let status: FormState["status"] = "ok";
  if (Math.abs(trackM - race.distance_m) / race.distance_m > 0.05) {
    status = "warn";
    message += ` Attention : la course est déclarée à ${fmtKm(race.distance_m)} km, ce tracé n'y correspond pas.`;
  }
  return { status, message };
}

// ---------- import d'une activité (plan B sans Strava) ----------
export async function importActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  await guard();
  const file = await readFile(formData);
  if (typeof file === "string") return fail(file);
  let row;
  try {
    const parsed = file.ext === "fit" ? parseFit(file.bytes) : { ...parseGpx(new TextDecoder().decode(file.bytes)), startedAt: null as Date | null };
    row = activityFromPoints({ source: file.ext, externalId: hashBytes(file.bytes), name: parsed.name ?? file.name, startedAt: parsed.startedAt, points: parsed.points }).row;
  } catch (e) {
    return fail(`Fichier illisible : ${why(e)}`);
  }
  // ignoreDuplicates : même fichier = même empreinte = ligne déjà présente, rien n'est ajouté.
  const { data, error } = await db().from("activities").upsert(row, { onConflict: "source,external_id", ignoreDuplicates: true }).select("id");
  if (error) return fail(`Import impossible : ${error.message}`);
  if (!data?.length) return { status: "warn", message: "Ce fichier est déjà importé : rien n'a été ajouté.", href: "/historique" };
  revalidatePath("/", "layout");
  return { status: "ok", message: `Activité importée : « ${row.name} », ${fmtKm(row.distance_m)} km le ${fmtDate(row.started_at, { day: "numeric", month: "long" })}.`, href: "/historique" };
}
