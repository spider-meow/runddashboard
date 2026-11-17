import { Cards, PageHeader, type Item } from "@/components/Cards";
import { MigrationNotice, PrList } from "@/components/bits";
import { PaceLine, VolumeBars } from "@/components/charts";
import { fmtDate } from "@/lib/dates";
import { requireOwner } from "@/lib/owner";
import { fmtKm, fmtPace, fmtTime, paceSecPerKm } from "@/lib/pace";
import { getRuns, racesTableMissing } from "@/lib/queries";
import { personalRecords, weeklyVolume } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Historique" };

export default async function Historique() {
  await requireOwner();
  const [runs, migrationMissing] = await Promise.all([getRuns(), racesTableMissing()]);
  const now = new Date(), weeks = weeklyVolume(runs, now, 24);
  const last4 = weeks.slice(-4), prev4 = weeks.slice(-8, -4);
  const sum = (w: typeof weeks, k: "km" | "dplus") => w.reduce((a, x) => a + x[k], 0);
  const avgPace = (w: typeof weeks) => { const km = sum(w, "km"); const t = w.reduce((a, x) => a + (x.pace ?? 0) * x.km, 0); return km ? t / km : null; };
  const km4 = sum(last4, "km"), kmP = sum(prev4, "km"), p4 = avgPace(last4), pP = avgPace(prev4);
  const records = personalRecords(runs);

  const items: Item[] = [
    {
      id: "s1", size: "s", tone: "hot",
      node: (
        <div className="stat"><div className="l">4 dernières semaines</div><div className="v">{Math.round(km4)}<small>km</small></div>
          <div className="d">{kmP > 0 ? <span className="chip">{km4 >= kmP ? "+" : "−"}{Math.abs(Math.round((km4 / kmP - 1) * 100))} %</span> : null} vs les 4 semaines d'avant</div></div>
      ),
    },
    {
      id: "s2", size: "s",
      node: (
        <div className="stat"><div className="l">Allure moyenne</div><div className="v">{p4 ? fmtPace(p4) : "–"}<small>/km</small></div>
          <div className="d">{p4 && pP ? <span className={"chip " + (pP - p4 > 0 ? "good" : "warn")}>{pP - p4 > 0 ? "−" : "+"}{Math.abs(Math.round(pP - p4))} s</span> : null} vs les 4 semaines d'avant</div></div>
      ),
    },
    { id: "s3", size: "s", node: (<div className="stat"><div className="l">Dénivelé cumulé</div><div className="v">{Math.round(sum(last4, "dplus"))}<small>m</small></div><div className="d">sur les 4 dernières semaines</div></div>) },
    { id: "volume", size: "l", node: (<><h2>Volume hebdomadaire <span className="hint">24 semaines · km · la dernière barre est la semaine en cours</span></h2><VolumeBars weeks={weeks} height={220} /></>) },
    { id: "prs", size: "s", node: (<><h2>Records personnels</h2><PrList records={records} /></>) },
    { id: "pace", size: "l", node: (<><h2>Allure moyenne par semaine <span className="hint">plus haut = plus vite</span></h2><PaceLine weeks={weeks} height={220} /></>) },
    {
      id: "recent", size: "xl",
      node: (
        <>
          <h2>Dernières sorties</h2>
          <div className="tablewrap"><table>
            <thead><tr><th>Date</th><th>Sortie</th><th className="num">Distance</th><th className="num">Temps</th><th className="num">Allure</th><th className="num">D+</th></tr></thead>
            <tbody>
              {runs.slice(0, 15).map((r) => {
                const p = paceSecPerKm(r.moving_time_s, r.distance_m);
                return (
                  <tr key={r.id}>
                    <td>{fmtDate(r.started_at, { day: "2-digit", month: "short" })}</td><td>{r.name}{r.source !== "strava" && <span className="chip" style={{ marginLeft: 8 }}>{r.source.toUpperCase()}</span>}</td>
                    <td className="num">{fmtKm(r.distance_m)} km</td><td className="num">{fmtTime(r.moving_time_s)}</td><td className="num">{p ? fmtPace(p) : "–"} /km</td><td className="num">{Math.round(r.elevation_gain_m ?? 0)} m</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader eyebrow={`24 dernières semaines · ${runs.length} sortie${runs.length > 1 ? "s" : ""}`}>Historique et <em>records</em></PageHeader>
      {migrationMissing && <MigrationNotice />}
      <Cards items={items} />
    </>
  );
}
