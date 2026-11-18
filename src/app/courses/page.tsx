import Link from "next/link";
import { createRace } from "@/app/actions";
import { MigrationNotice } from "@/components/bits";
import { Cards, PageHeader, type Item } from "@/components/Cards";
import { RaceForm } from "@/components/RaceForm";
import { Flash } from "@/components/formkit";
import { daysUntil, fmtDate, parisDay } from "@/lib/dates";
import { splitRaces } from "@/lib/forms";
import { requireOwner } from "@/lib/owner";
import { fmtKm, fmtPace, fmtTime } from "@/lib/pace";
import { currentForm, projectRace, verdict } from "@/lib/projection";
import { getCalibration, getRaces, getRuns, type Race } from "@/lib/queries";
import { raceReview } from "@/lib/review";

export const metadata = { title: "Courses" };

const meta = (r: Race) => `${fmtDate(r.race_date, { day: "numeric", month: "long", year: "numeric" })} · ${fmtKm(r.distance_m)} km${r.elevation_gain_m ? ` · ${Math.round(r.elevation_gain_m)} m D+` : ""}`;
const sgn = (s: number) => `${s > 0 ? "+" : "−"}${Math.abs(Math.round(s))} s`;

export default async function Courses() {
  await requireOwner();
  const [{ races, migrationMissing }, runs, { model }] = await Promise.all([getRaces(), getRuns(), getCalibration()]);
  const now = new Date(), { upcoming, past } = splitRaces(races, parisDay(now)), form = currentForm(runs, now);

  const proj = new Map(upcoming.map((r) => [r.id, projectRace(form.efforts, r, model)]));
  const reviews = new Map(past.map((r) => [r.id, raceReview(r, runs, model)]));
  const next = upcoming[0] ?? null, nextRp = next ? proj.get(next.id) ?? null : null;
  const nextV = next && nextRp ? verdict(nextRp, next.distance_m / 1000) : null;

  const done = [...reviews.values()].filter((x) => x && x.errorPct !== null) as NonNullable<ReturnType<typeof raceReview>>[];
  const meanErr = done.length ? done.reduce((a, x) => a + Math.abs(x.errorPct!), 0) / done.length : null;
  const inRange = done.filter((x) => x.inRange).length;

  const items: Item[] = [];
  if (upcoming.length > 1) {
    items.push({
      id: "upcoming", size: "l",
      node: (
        <>
          <h2>Ensuite</h2>
          {upcoming.slice(1).map((r) => {
            const q = proj.get(r.id), d = daysUntil(r.race_date, now);
            return (
              <Link key={r.id} className="list-link" href={`/courses/${r.id}`} prefetch>
                <span><strong>{r.name}</strong><span className="muted" style={{ fontSize: 14 }}>{meta(r)}{r.target_pace_s ? ` · objectif ${fmtTime(r.target_pace_s * r.distance_m / 1000)}` : ""}</span></span>
                <span className="chips">{q && <span className="chip">{fmtTime(q.time_s)}</span>}<span className="chip">J-{d}</span></span>
              </Link>
            );
          })}
        </>
      ),
    });
  }
  if (past.length) {
    items.push({
      id: "past", size: "l",
      node: (
        <>
          <h2>Passées</h2>
          {past.map((r) => {
            const rv = reviews.get(r.id);
            return (
              <Link key={r.id} className="list-link" href={`/courses/${r.id}`} prefetch>
                <span><strong>{r.name}</strong><span className="muted" style={{ fontSize: 14 }}>{meta(r)}{rv?.vsTargetS != null ? ` · ${rv.vsTargetS <= 0 ? "objectif battu" : "objectif manqué"} de ${Math.abs(Math.round(rv.vsTargetS))} s` : ""}</span></span>
                <span className="chip">{rv ? fmtTime(rv.actual_s) : "sans sortie liée"}</span>
              </Link>
            );
          })}
        </>
      ),
    });
  }
  if (meanErr !== null) {
    items.push({
      id: "accuracy", size: "s",
      node: (
        <>
          <h2>Précision du modèle</h2>
          <p className="lede"><b>{meanErr.toFixed(1).replace(".", ",")} %</b> d'écart en moyenne</p>
          <p className="muted">Sur {done.length} course{done.length > 1 ? "s" : ""} passée{done.length > 1 ? "s" : ""}, avec ta forme de la veille. Le temps réel était dans la fourchette annoncée {inRange} fois sur {done.length}.</p>
        </>
      ),
    });
  }
  items.push({ id: "new", size: "s", node: (<><h2>Nouvelle course</h2><RaceForm action={createRace} mode="create" initial={{}} /></>) });

  return (
    <>
      <PageHeader eyebrow="Objectifs">Tes <em>courses</em></PageHeader>
      {migrationMissing && <MigrationNotice />}
      <Flash param="supprimee">Course supprimée.</Flash>
      {next ? (
        <Link className="next-race" href={`/courses/${next.id}`} prefetch data-widget="next">
          <span className="proj-lbl">Prochaine course · J-{Math.max(0, daysUntil(next.race_date, now))}</span>
          <span className="next-name">{next.name}</span>
          <span className="muted">{meta(next)}</span>
          {nextRp ? (
            <span className="next-proj">
              <b>{fmtTime(nextRp.time_s)}</b><span className="muted"> projeté · {fmtPace(nextRp.paceS)} /km</span>
              {nextRp.gapS !== null && <span className={"chip " + (nextRp.gapS > 0 ? "warn" : "good")}>{sgn(nextRp.gapS)} sur l'objectif</span>}
            </span>
          ) : <span className="muted">Pas encore de projection : il faut un effort de 5 km ou plus.</span>}
          {nextV && <span className={"proj-verdict " + nextV.tone}>{nextV.text}</span>}
          <span className="ticket-go">Ouvrir la stratégie de course →</span>
        </Link>
      ) : (
        <p className="empty" style={{ marginBottom: "var(--s6)" }}>Aucune course à venir. Ajoute la prochaine avec le formulaire : sa projection, sa stratégie et son plan de ravitaillement se calculent tout seuls.</p>
      )}
      <Cards items={items} />
    </>
  );
}
