import { parseCheckpoints } from "./checkpoints";
import { parsePace } from "./pace";

// État renvoyé par les actions de formulaire (useActionState) : le message, les erreurs par champ, et les valeurs saisies
// pour que le formulaire ne se vide jamais après une erreur.
export type FieldErrors = Record<string, string>;
export type FormState = { status: "idle" | "ok" | "warn" | "error"; message?: string; errors?: FieldErrors; values?: Record<string, string>; href?: string };
export const IDLE: FormState = { status: "idle" };

export type RaceInput = { name: string; race_date: string; distance_m: number; elevation_gain_m: number | null; target_pace_s: number | null };

export const isRealDate = (s: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};

const num = (s: string) => (/^\d+([.,]\d+)?$/.test(s) ? parseFloat(s.replace(",", ".")) : NaN);

// Champs du formulaire de course (création et modification). Renvoie soit les données propres, soit une erreur par champ.
export function parseRaceFields(v: Record<string, string>): { data?: RaceInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const name = (v.name ?? "").trim(), date = (v.date ?? "").trim(), km = num((v.distance_km ?? "").trim());
  const dplusRaw = (v.dplus ?? "").trim(), paceRaw = (v.pace ?? "").trim();

  if (!name) errors.name = "Donne un nom à la course.";
  else if (name.length > 100) errors.name = "100 caractères au maximum.";
  if (!isRealDate(date)) errors.date = "Choisis une date valide.";
  if (!(km >= 0.1 && km <= 400)) errors.distance_km = "Distance en km, entre 0,1 et 400 (par exemple 16,2).";
  const dplus = dplusRaw ? num(dplusRaw) : null;
  if (dplus !== null && !(dplus >= 0 && dplus <= 20000)) errors.dplus = "Dénivelé en mètres, entier positif (par exemple 275).";
  const pace = paceRaw ? parsePace(paceRaw) : null;
  if (paceRaw && (pace === null || pace < 120 || pace > 900)) errors.pace = "Allure au format m:ss, entre 2:00 et 15:00 (par exemple 4:50).";

  if (Object.keys(errors).length) return { errors };
  return { errors, data: { name, race_date: date, distance_m: Math.round(km * 1000), elevation_gain_m: dplus === null ? null : Math.round(dplus), target_pace_s: pace } };
}

// Courses à venir (la plus proche d'abord, le jour J compte) et passées (la plus récente d'abord). `today` : AAAA-MM-JJ.
export function splitRaces<T extends { race_date: string }>(races: T[], today: string): { upcoming: T[]; past: T[] } {
  const by = (a: T, b: T) => a.race_date.localeCompare(b.race_date);
  return {
    upcoming: races.filter((r) => r.race_date >= today).sort(by),
    past: races.filter((r) => r.race_date < today).sort((a, b) => by(b, a)),
  };
}

export type SyncReport = { fetched: number; analyzed: number; remaining: number; analysisError?: string };

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

// Phrase affichée après une synchronisation : ce qui s'est passé, et quoi faire ensuite s'il reste du travail.
export function describeSync(r: SyncReport): { tone: "ok" | "warn"; text: string } {
  if (r.analysisError) return { tone: "warn", text: `${plural(r.fetched, "activité reçue", "activités reçues")}, mais l'analyse a échoué (${r.analysisError}). Relance dans quelques minutes.` };
  if (r.remaining > 0) return { tone: "warn", text: `${plural(r.fetched, "activité vérifiée", "activités vérifiées")}, ${r.analyzed} analysée${r.analyzed > 1 ? "s" : ""}. Il en reste ${r.remaining} à analyser. Relance la synchronisation.` };
  return { tone: "ok", text: `À jour : ${plural(r.fetched, "activité vérifiée", "activités vérifiées")}, ${r.analyzed} analysée${r.analyzed > 1 ? "s" : ""}.` };
}

// Repères de passage saisis en texte (« km | nom | consigne », une ligne par repère) : repère les lignes inutilisables
// (sans km valide) ou au-delà de la distance de la course, au lieu de les ignorer en silence.
export function checkpointIssue(text: string, distanceKm: number): string | null {
  const bad: number[] = [], beyond: number[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const [km] = parseCheckpoints(line);
    if (!km) bad.push(i + 1);
    else if (km.km > distanceKm + 0.01) beyond.push(i + 1);
  });
  const list = (n: number[]) => (n.length > 1 ? "lignes " : "ligne ") + n.join(", ");
  if (bad.length) return `Format incorrect, ${list(bad)} : écris « km | nom | consigne », par exemple « 5 | Premier ravito | rester cool ».`;
  if (beyond.length) return `${list(beyond)} : le repère dépasse la distance de la course (${String(distanceKm).replace(".", ",")} km).`;
  return null;
}
