import Link from "next/link";
import { Cards, PageHeader, type Item } from "@/components/Cards";
import { CalibrationNote, MigrationNotice } from "@/components/bits";
import { TrendLine } from "@/components/charts";
import { UseAsGoal } from "@/components/UseAsGoal";
import { daysUntil, fmtDate, parisDay } from "@/lib/dates";
import { requireOwner } from "@/lib/owner";
import { fmtKm, fmtPace, fmtTime } from "@/lib/pace";
import { currentForm, formTrend, project, projectRace, SEMI, type RaceProjection } from "@/lib/projection";
import { getCalibration, getRaces, getRuns } from "@/lib/queries";

export const metadata = { title: "Projections" };

const DISTANCES: [string, number][] = [["5 km", 5], ["10 km", 10], ["Semi", SEMI], ["Marathon", 42.195]];
const EFFORT_LABEL: Record<string, string> = { "5K": "5 km", "10K": "10 km", "15K": "15 km", Semi: "Semi" };
const pct = (v: number) => `${v >= 1 ? "+" : "−"}${Math.abs((v - 1) * 100).toFixed(1).replace(".", ",")} %`;
const sec = (s: number) => `${s > 0 ? "+" : "−"}${Math.abs(Math.round(s))} s`;

// Phrase de verdict, calculée : où se situe l'objectif par rapport à la forme actuelle.
function verdict(rp: RaceProjection, km: number): { tone: "good" | "warn" | "bad"; text: string } | null {
  if (rp.gapS === null) return null;
  const perKm = rp.gapS / km, target = rp.time_s - rp.gapS;
  if (target < rp.low) return { tone: "bad", text: `Objectif très ambitieux : il demande ${sec(-rp.gapS)} de mieux que ta projection, même dans le meilleur cas.` };
  if (rp.gapS > 0) return { tone: "warn", text: `Objectif ambitieux mais dans la fourchette : il demande ${Math.round(rp.gapS)} s de mieux que la projection, soit ${Math.abs(Math.round(perKm))} s par km.` };
  if (target > rp.high) return { tone: "good", text: `Objectif confortable : tu as ${Math.round(-rp.gapS)} s de marge sur la projection, tu peux viser plus haut.` };
  return { tone: "good", text: `Objectif tenable : il est dans la fourchette, avec ${Math.round(-rp.gapS)} s de marge sur la projection.` };
}

export default async function Projections() {
  await requireOwner();
  const [runs, { races, migrationMissing }, calib] = await Promise.all([getRuns(), getRaces(), getCalibration()]);
  const now = new Date(), today = parisDay(now);
  const form = currentForm(runs, now), upcoming = races.filter((r) => r.race_date >= today);
  const race = upcoming[0] ?? null;
  const rp = race ? projectRace(form.efforts, race, calib.model) : null;
  const semi = project(form.efforts, SEMI), trend = formTrend(runs, now);
  const km = race ? race.distance_m / 1000 : 0;
  const v = rp && race ? verdict(rp, km) : null;
  const k = semi?.k ?? 1.06;

  const items: Item[] = [];
  items.push({
    id: "trend", size: "l",
    node: (
      <>
        <h2>Ta forme <span className="hint">temps projeté sur semi, tous les mois</span></h2>
        {trend.length >= 2 && (() => { const g = trend[0].time_s - trend[trend.length - 1].time_s; return <p className="lede"><b>{g >= 0 ? "−" : "+"}{fmtTime(Math.abs(g))}</b> sur {trend.length > 4 ? "six mois" : "la période"} : {g >= 30 ? "tu progresses." : g <= -30 ? "la forme a reculé." : "la forme est stable."}</p>; })()}
        <TrendLine points={trend} />
      </>
    ),
  });
  items.push({
    id: "table", size: "m",
    node: (
      <>
        <h2>Distances <span className="hint">à plat, forme actuelle</span></h2>
        {form.efforts.length ? (
          <div className="tablewrap"><table>
            <thead><tr><th>Distance</th><th className="num">Temps</th><th className="num">Allure</th></tr></thead>
            <tbody>{DISTANCES.map(([name, d]) => { const p = project(form.efforts, d)!; return (
              <tr key={name}><td>{name}</td><td className="num"><b>{fmtTime(p.time_s)}</b><span className="rng"> {fmtTime(p.low)} – {fmtTime(p.high)}</span></td><td className="num">{fmtPace(p.time_s / d)} /km</td></tr>
            ); })}</tbody>
          </table></div>
        ) : <p className="empty">Pas encore d'effort de 5 km ou plus.</p>}
      </>
    ),
  });
  if (rp && race) {
    items.push({
      id: "sources", size: "m",
      node: (
        <>
          <h2>D'où vient le chiffre <span className="hint">pour {race.name}</span></h2>
          <div>{[...rp.proj.parts].sort((a, b) => b.weight - a.weight).map((p) => (
            <div className="pr" key={p.effort.name}>
              <span>{EFFORT_LABEL[p.effort.name] ?? p.effort.name} en {fmtTime(p.effort.time_s)}<small>{fmtDate(p.effort.date + "T12:00:00Z", { day: "numeric", month: "short" })} · poids {Math.round((p.weight / rp.proj.parts.reduce((a, q) => a + q.weight, 0)) * 100)} %</small></span>
              <b>{fmtTime(p.time_s)}</b>
            </div>
          ))}</div>
          <p className="muted note" style={{ marginTop: "var(--s3)" }}>
            Chaque effort est projeté sur {fmtKm(race.distance_m)} km avec ton exposant ({k.toFixed(2).replace(".", ",")}, calculé sur tes efforts ; Riegel standard : 1,06), puis les plus proches de la distance pèsent le plus.
            {form.stale && " Attention : tes meilleurs efforts datent de plus de 4 mois."}
          </p>
        </>
      ),
    });
  }
  items.push({
    id: "calib", size: "m",
    node: (<><h2>Relief{rp && <span className="hint">{pct(rp.gradeFactor)} sur cette course</span>}</h2><CalibrationNote c={calib} /></>),
  });
  items.push({
    id: "limits", size: "m",
    node: (
      <>
        <h2>Ce que le modèle ignore</h2>
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: 14 }}>
          <li>Forme du jour, météo, chaleur, vent.</li><li>Fatigue de la semaine et affûtage.</li>
          <li>Un marathon n'est pas un 5 km étiré : l'exposant monte un peu au-delà de 25 km.</li>
          <li>Les efforts de référence viennent de tes sorties : un record sur un parcours descendant est trop optimiste.</li>
        </ul>
      </>
    ),
  });

  return (
    <>
      <PageHeader eyebrow={race ? `Projection · ${race.name} · ${fmtDate(race.race_date + "T12:00:00Z", { day: "numeric", month: "long" })}` : "Projection de ta forme"}>Projections de <em>temps</em></PageHeader>
      {migrationMissing && <MigrationNotice />}

      {rp && race ? (
        <section className="proj" data-widget="verdict" aria-label="Projection de la prochaine course">
          <p className="proj-lbl">Temps projeté · {fmtKm(race.distance_m)} km{race.elevation_gain_m ? `, ${Math.round(race.elevation_gain_m)} m D+` : ""} · J-{Math.max(0, daysUntil(race.race_date, now))}</p>
          <div className="proj-time">{fmtTime(rp.time_s)}</div>
          <p className="proj-sub"><b className="num">{fmtPace(rp.paceS)} /km</b> · entre <b className="num">{fmtTime(rp.low)}</b> et <b className="num">{fmtTime(rp.high)}</b></p>
          <Band rp={rp} km={km} />
          {v && <p className={"proj-verdict " + v.tone}>{v.text}</p>}
          <div className="scen">
            {([["Prudent", rp.high], ["Probable", rp.time_s], ["Ambitieux", rp.low]] as const).map(([name, t]) => (
              <div key={name} className={name === "Probable" ? "on" : ""}><span>{name}</span><b>{fmtTime(t)}</b><small>{fmtPace(t / km)} /km</small></div>
            ))}
          </div>
          {!race.target_pace_s || Math.abs(race.target_pace_s - rp.paceS) > 1 ? <UseAsGoal raceId={race.id} paceS={rp.paceS} name={race.name} /> : null}
          {upcoming.length > 1 && (
            <div className="next-races">
              <h2>Tes autres courses</h2>
              {upcoming.slice(1, 4).map((r) => { const q = projectRace(form.efforts, r, calib.model); return (
                <Link key={r.id} className="list-link" href={`/courses/${r.id}`}>
                  <span><strong>{r.name}</strong><span className="muted" style={{ fontSize: 14 }}>{fmtDate(r.race_date + "T12:00:00Z", { day: "numeric", month: "long" })} · {fmtKm(r.distance_m)} km</span></span>
                  <span className="chip">{q ? fmtTime(q.time_s) : "–"}</span>
                </Link>
              ); })}
            </div>
          )}
        </section>
      ) : (
        <section className="proj" data-widget="verdict">
          <p className="proj-lbl">Ton semi aujourd'hui</p>
          {semi ? <><div className="proj-time">{fmtTime(semi.time_s)}</div><p className="proj-sub"><b className="num">{fmtPace(semi.time_s / SEMI)} /km</b> · entre <b className="num">{fmtTime(semi.low)}</b> et <b className="num">{fmtTime(semi.high)}</b></p></> : <p className="empty">Pas encore d'effort de 5 km ou plus pour projeter un temps.</p>}
          <p className="muted"><Link className="inline-link" href="/courses">Ajoute ta prochaine course</Link> pour voir sa projection avec son relief et la comparer à ton objectif.</p>
        </section>
      )}

      <Cards items={items} />
      <details className="how">
        <summary>Comment c'est calculé</summary>
        <p>T2 = T1 × (D2 / D1)<sup>k</sup> (Riegel) depuis chacun de tes meilleurs efforts des 4 derniers mois, pondérés par la proximité de la distance. k est ajusté sur tes propres efforts (borné entre 1,03 et 1,10) et un peu relevé au-delà de 25 km. Le temps est ensuite multiplié par le coût du relief du parcours, calibré sur tes sorties. La fourchette vient du désaccord entre efforts et grandit quand la distance visée est loin de tes références.</p>
      </details>
    </>
  );
}

// Fourchette du temps projeté et position de l'objectif.
function Band({ rp, km }: { rp: RaceProjection; km: number }) {
  const goal = rp.gapS !== null ? rp.time_s - rp.gapS : null;
  const left = Math.min(rp.low, goal ?? rp.low) * 0.985, right = Math.max(rp.high, goal ?? rp.high) * 1.015, pos = (t: number) => `${((t - left) / (right - left)) * 100}%`;
  return (
    <div className="band proj-band" role="img" aria-label={`Fourchette de ${fmtTime(rp.low)} à ${fmtTime(rp.high)}${goal !== null ? `, objectif ${fmtTime(goal)}` : ""}`}>
      <i style={{ left: pos(rp.low), width: `calc(${pos(rp.high)} - ${pos(rp.low)})` }} /><b style={{ left: pos(rp.time_s) }} />
      {goal !== null && <u style={{ left: pos(goal) }}><em>objectif {fmtTime(goal)} · {fmtPace(goal / km)} /km</em></u>}
    </div>
  );
}
