import { Calculator } from "@/components/Calculator";
import { Cards, PageHeader, type Item } from "@/components/Cards";
import { MigrationNotice } from "@/components/bits";
import { parisDay } from "@/lib/dates";
import { requireOwner } from "@/lib/owner";
import { fmtPace, fmtTime } from "@/lib/pace";
import { getRaces, getRuns } from "@/lib/queries";
import { riegel, type Reference } from "@/lib/riegel";
import { personalRecords } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projections" };

const DISTANCES: [string, number][] = [["5 km", 5], ["10 km", 10], ["Semi", 21.0975], ["Marathon", 42.195]];
const REFS: [string, number][] = [["5K", 5], ["10K", 10], ["Semi", 21.0975]];

export default async function Projections() {
  await requireOwner();
  const [runs, { races, migrationMissing }] = await Promise.all([getRuns(), getRaces()]);
  const efforts = personalRecords(runs).efforts;
  const refs: Reference[] = REFS.filter(([n]) => efforts[n]).map(([name, distance_km]) => ({ name, distance_km, time_s: efforts[name].time_s })).reverse(); // la plus longue d'abord
  const race = races.find((r) => r.race_date >= parisDay(new Date()));
  const r0 = refs[0];

  const items: Item[] = [
    {
      id: "calc", size: "xl",
      node: (
        <>
          <h2>Calculateur <span className="hint">modifie un champ, tout se recalcule</span></h2>
          <Calculator
            refs={refs}
            race={{ name: race?.name ?? "Ta course", distance_km: race ? race.distance_m / 1000 : 10, dplus: race?.elevation_gain_m ?? 0, target_pace_s: race?.target_pace_s ?? null, profile: race?.course_profile ?? null }}
          />
        </>
      ),
    },
    {
      id: "table", size: "l",
      node: (
        <>
          <h2>Distances courantes <span className="hint">à plat{r0 ? `, depuis ton ${r0.name === "Semi" ? "semi" : r0.name.replace("K", " km")}` : ""}</span></h2>
          {r0 ? (
            <div className="tablewrap"><table>
              <thead><tr><th>Distance</th><th className="num">Temps</th><th className="num">Allure</th><th className="num">Fourchette</th></tr></thead>
              <tbody>
                {DISTANCES.map(([name, d]) => {
                  const t = riegel(r0.time_s, r0.distance_km, d), e1 = riegel(r0.time_s, r0.distance_km, d, 1.04), e2 = riegel(r0.time_s, r0.distance_km, d, 1.08);
                  return <tr key={name}><td>{name}</td><td className="num"><b>{fmtTime(t)}</b></td><td className="num">{fmtPace(t / d)} /km</td><td className="num muted">{fmtTime(Math.min(e1, e2))} – {fmtTime(Math.max(e1, e2))}</td></tr>;
                })}
              </tbody>
            </table></div>
          ) : <p className="empty">Pas encore de record de 5 km ou plus.</p>}
        </>
      ),
    },
    {
      id: "limits", size: "s",
      node: (
        <>
          <h2>Ce que le modèle ignore</h2>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: 14 }}>
            <li>Forme du jour, météo, chaleur.</li><li>Fatigue de la semaine et affûtage.</li>
            <li>Un marathon n'est pas un 5 km étiré : l'exposant monte avec la distance.</li>
            <li>Le coût du relief est un modèle à calibrer sur tes propres sorties.</li>
          </ul>
        </>
      ),
    },
    {
      id: "formula", size: "xl",
      node: (
        <>
          <h2>Formules</h2>
          <p className="muted" style={{ fontSize: 14, maxWidth: "80ch" }}>
            T2 = T1 × (D2 / D1)<sup>k</sup>, avec k = 1,06 par défaut (Riegel). Le temps est ensuite multiplié par un coefficient de relief calculé tronçon par tronçon sur le profil de la course
            (environ +3,3 % de temps par % de montée, −1,8 % par % de descente). Sans profil importé, on utilise 1 + 0,015 × la pente moyenne positive (%).
          </p>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Riegel + relief">Projections de <em>temps</em></PageHeader>
      {migrationMissing && <MigrationNotice />}
      <Cards items={items} />
    </>
  );
}
