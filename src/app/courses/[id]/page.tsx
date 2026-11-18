import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteRace, importRaceTrack, updateRace } from "@/app/actions";
import { Cards, PageHeader, type Item } from "@/components/Cards";
import { ElevationProfile, PaceBars } from "@/components/charts";
import { FileForm } from "@/components/FileForm";
import { PrintButton } from "@/components/PrintButton";
import { DeleteRace, RaceForm } from "@/components/RaceForm";
import { RouteMap } from "@/components/RouteMap";
import { Flash } from "@/components/formkit";
import { formatCheckpoints } from "@/lib/checkpoints";
import { daysUntil, fmtDate, parisDay } from "@/lib/dates";
import { requireOwner } from "@/lib/owner";
import { fmtKm, fmtPace, fmtTime } from "@/lib/pace";
import { currentForm, projectRace, verdict } from "@/lib/projection";
import { getCalibration, getRace, getRuns } from "@/lib/queries";
import { raceReview } from "@/lib/review";
import { climbs, fuelPlan, passagesFromPlan, planKm } from "@/lib/strategy";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const race = await getRace((await params).id);
  return { title: race?.name ?? "Course" };
}

const sgn = (s: number) => `${s > 0 ? "+" : "−"}${Math.abs(Math.round(s))} s`;

export default async function Fiche({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const [race, { model }, runs] = await Promise.all([getRace(id), getCalibration(), getRuns()]);
  if (!race) notFound();

  const now = new Date(), km = race.distance_m / 1000, profile = race.course_profile ?? [];
  const isPast = race.race_date.slice(0, 10) < parisDay(now), days = daysUntil(race.race_date, now);
  const rp = isPast ? null : projectRace(currentForm(runs, now).efforts, race, model);
  const review = isPast ? raceReview(race, runs, model) : null;
  const v = rp ? verdict(rp, km) : null;

  // Le plan suit l'objectif s'il y en a un, sinon la projection : aucun réglage n'est nécessaire pour l'obtenir.
  const goalS = race.target_pace_s ? race.target_pace_s * km : null, planS = goalS ?? rp?.time_s ?? null;
  const rows = planS ? planKm(profile, km, planS, model) : [], hills = climbs(rows), fuel = planS ? fuelPlan(planS, rows) : null;
  const passages = rows.length ? passagesFromPlan(race.checkpoints, rows, profile, km) : null;
  const update = updateRace.bind(null, race.id), importTrack = importRaceTrack.bind(null, race.id), remove = deleteRace.bind(null, race.id);

  const items: Item[] = [];
  if (!isPast && planS) {
    items.push({
      id: "strategy", size: "xl",
      node: (
        <>
          <h2>Stratégie de course <span className="hint">{goalS ? "d'après ton objectif" : "d'après ta projection : fixe un objectif pour l'ajuster"}</span></h2>
          <p className="lede"><b>{fmtTime(planS)}</b> à <b>{fmtPace(planS / km)} /km</b> de moyenne : départ retenu, effort constant, fin libérée.</p>
          <ul className="how-list">
            <li><b>Au départ :</b> {fmtPace(rows[0].pace_s)} /km, un peu plus lent que la moyenne. Un départ trop rapide se paie dans le dernier tiers.</li>
            <li><b>Milieu de course :</b> même effort partout. En montée l'allure baisse, en descente elle remonte, sans que l'effort change.</li>
            <li><b>Dernier cinquième (dès le km {Math.floor(km * 0.8)}) :</b> {fmtPace(rows[rows.length - 1].pace_s)} /km si les jambes répondent.</li>
          </ul>
          <div className="plan-chart"><PaceBars splits={rows.map((r) => ({ km: r.km, time_s: r.time_s, elev_m: r.elev_m, partial: r.len_km < 0.999 }))} totalM={race.distance_m} height={170} /></div>
          <div className="tablewrap"><table className="plan">
            <thead><tr><th>Km</th><th className="num">Allure</th><th className="num">Relief</th><th className="num">Passage</th><th>Consigne</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.km} className={r.note ? "key" : undefined}>
                <td>{r.len_km < 0.999 ? `${r.km} (partiel)` : r.km}</td><td className="num"><b>{fmtPace(r.pace_s)}</b></td>
                <td className="num">{profile.length > 1 ? <span className={r.elev_m > 0 ? "up" : r.elev_m < 0 ? "dn" : ""}>{r.elev_m > 0 ? "+" : ""}{r.elev_m} m</span> : "–"}</td>
                <td className="num">{fmtTime(r.cum_s)}</td><td className="note">{r.note}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <p className="noprint" style={{ marginTop: "var(--s4)" }}><PrintButton /></p>
        </>
      ),
    });
    if (fuel) items.push({
      id: "fuel", size: "m",
      node: (
        <>
          <h2>Ravitaillement</h2>
          <p className="muted" style={{ marginBottom: "var(--s3)" }}>{fuel.summary}</p>
          {fuel.items.map((f) => (<div className="pr" key={f.t_s}><span>{f.text}<small>à {Math.round(f.t_s / 60)} min · vers le km {String(f.km).replace(".", ",")}</small></span><b>{fmtTime(f.t_s)}</b></div>))}
          <p className="muted note" style={{ marginTop: "var(--s3)" }}>Repères généraux : teste ton ravitaillement à l'entraînement, jamais le jour J pour la première fois.</p>
        </>
      ),
    });
    items.push({
      id: "climbs", size: "m",
      node: (
        <>
          <h2>Montées à gérer</h2>
          {profile.length < 2 ? <p className="empty">Importe le tracé GPX avec altitude pour voir les montées.</p> : hills.length === 0 ? <p className="empty">Aucune montée marquante : parcours plutôt roulant.</p> : hills.map((c) => (
            <div className="pr" key={c.from_km}><span>Km {String(c.from_km).replace(".", ",")} à {String(c.to_km).replace(".", ",")}<small>{Math.round(c.grade * 10) / 10 > 0 ? `${String(Math.round(c.grade * 10) / 10).replace(".", ",")} % en moyenne` : ""} · même effort, ne pas forcer</small></span><b>+{c.gain_m} m</b></div>
          ))}
        </>
      ),
    });
  }
  items.push({
    id: "map", size: "l",
    node: (<><h2>Tracé</h2>{race.course_polyline ? <RouteMap polyline={race.course_polyline} label={`Tracé de ${race.name}`} /> : <p className="empty">Pas encore de tracé. Importe le fichier GPX du parcours avec le formulaire « Tracé du parcours » plus bas.</p>}</>),
  });
  items.push({
    id: "notes", size: "s",
    node: (<><h2>Notes</h2><p className="muted" style={{ whiteSpace: "pre-wrap" }}>{race.notes || "Aucune note."}</p></>),
  });
  items.push({
    id: "elev", size: "xl",
    node: (<><h2>Profil de dénivelé <span className="hint">pointillés : repères de passage</span></h2><ElevationProfile profile={profile} marks={race.checkpoints.map((c) => c.km)} height={200} /></>),
  });
  items.push({
    id: "passages", size: "xl",
    node: (
      <>
        <h2>Repères de passage {planS && <span className="hint">temps cumulés pour {fmtTime(planS)}{profile.length < 2 ? " · répartis à plat, sans le relief" : ""}</span>}</h2>
        {!passages ? <p className="empty">Renseigne un objectif ou importe tes courses pour calculer les temps de passage.</p> : passages.length === 0 ? <p className="empty">Aucun repère. Ajoutes-en dans le formulaire ci-dessous.</p> : (
          <div className="tablewrap"><table>
            <thead><tr><th>Repère</th><th className="num">Km</th><th className="num">Altitude</th><th className="num">Allure du tronçon</th><th className="num">Passage</th><th>Consigne</th></tr></thead>
            <tbody>{passages.map((c) => (
              <tr key={c.km}>
                <td>{c.name}</td><td className="num">{String(c.km).replace(".", ",")}</td><td className="num">{c.altitude_m != null ? `${c.altitude_m} m` : "–"}</td>
                <td className="num">{c.segment_pace_s ? `${fmtPace(c.segment_pace_s)} /km` : "–"}{profile.length > 1 && <> <span className={c.segment_elev_m > 0 ? "up" : "dn"}>({c.segment_elev_m > 0 ? "+" : ""}{c.segment_elev_m} m)</span></>}</td>
                <td className="num"><b>{fmtTime(c.time_s)}</b></td><td className="note">{c.note}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </>
    ),
  });
  items.push({
    id: "edit", size: "m",
    node: (
      <>
        <h2>Modifier la course</h2>
        <RaceForm
          mode="edit" action={update}
          initial={{ name: race.name, date: race.race_date.slice(0, 10), distance_km: String(km).replace(".", ","), dplus: race.elevation_gain_m != null ? String(Math.round(race.elevation_gain_m)) : "", pace: race.target_pace_s ? fmtPace(race.target_pace_s) : "", checkpoints: formatCheckpoints(race.checkpoints), notes: race.notes ?? "" }}
        />
      </>
    ),
  });
  items.push({
    id: "track", size: "s",
    node: (<><h2>Tracé du parcours</h2><FileForm action={importTrack} label="Fichier GPX ou FIT du parcours" hint="4 Mo maximum. Remplace le tracé actuel." submit="Importer le tracé" pending="Lecture du tracé…" /></>),
  });
  items.push({ id: "danger", size: "s", node: (<><h2>Supprimer</h2><DeleteRace name={race.name} action={remove} /></>) });

  return (
    <>
      <p className="back noprint"><Link href="/courses" className="inline-link">← Courses</Link></p>
      <PageHeader eyebrow={`Fiche de course · ${fmtDate(race.race_date + "T12:00:00Z", { weekday: "long", day: "numeric", month: "long" })} · ${fmtKm(race.distance_m)} km${race.elevation_gain_m ? ` · ${Math.round(race.elevation_gain_m)} m D+` : ""}`}>{race.name}</PageHeader>
      <Flash param="cree">Course créée. Ajoute maintenant son tracé GPX et tes repères de passage.</Flash>

      {isPast ? (
        <section className="proj compact" data-widget="review" aria-label="Bilan de la course">
          {review ? (
            <>
              <p className="proj-lbl">Bilan · {fmtDate(review.run.started_at, { day: "numeric", month: "long", year: "numeric" })}</p>
              <div className="proj-time">{fmtTime(review.actual_s)}</div>
              <p className="proj-sub"><b className="num">{fmtPace(review.actual_s / km)} /km</b>{review.vsTargetS !== null && <> · {review.vsTargetS <= 0 ? "objectif battu de " : "objectif manqué de "}<b className="num">{Math.abs(Math.round(review.vsTargetS))} s</b></>}</p>
              {review.projected_s !== null && review.errorPct !== null && (
                <p className={"proj-verdict " + (Math.abs(review.errorPct) <= 2 ? "good" : "warn")}>
                  Avec ta forme de la veille, le modèle prédisait {fmtTime(review.projected_s)} : tu as couru {Math.abs(review.errorPct).toFixed(1).replace(".", ",")} % {review.errorPct <= 0 ? "plus vite" : "plus lentement"}.
                  {review.inRange ? " Ton temps était dans la fourchette annoncée." : " Ton temps sortait de la fourchette annoncée."}
                </p>
              )}
              <p><Link className="btn" href={`/historique/${review.run.id}`}>Voir la sortie</Link></p>
            </>
          ) : (
            <p className="muted">Aucune sortie synchronisée ne correspond à cette course (même jour, distance à 6 % près). Une fois la sortie synchronisée, le bilan apparaît ici tout seul.</p>
          )}
        </section>
      ) : rp ? (
        <section className="proj compact" data-widget="verdict" aria-label="Projection de la course">
          <p className="proj-lbl">Projection · {days > 0 ? `J-${days}` : "Jour J"}{race.target_pace_s ? ` · objectif ${fmtTime(race.target_pace_s * km)} (${fmtPace(race.target_pace_s)} /km)` : ""}</p>
          <div className="proj-time">{fmtTime(rp.time_s)}</div>
          <p className="proj-sub"><b className="num">{fmtPace(rp.paceS)} /km</b> · entre <b className="num">{fmtTime(rp.low)}</b> et <b className="num">{fmtTime(rp.high)}</b>{rp.gapS !== null && <> · <span className={"chip " + (rp.gapS > 0 ? "warn" : "good")}>{sgn(rp.gapS)} sur l'objectif</span></>}</p>
          {v && <p className={"proj-verdict " + v.tone}>{v.text}</p>}
          <p className="noprint"><Link className="inline-link" href="/projections">Détail de la projection</Link></p>
        </section>
      ) : null}

      <Cards items={items} />
    </>
  );
}
