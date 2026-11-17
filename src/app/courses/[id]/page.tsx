import { notFound } from "next/navigation";
import { importRaceTrack, updateRace } from "@/app/actions";
import { Dashboard, type Item } from "@/components/Dashboard";
import { ElevationProfile } from "@/components/charts";
import { RouteMap } from "@/components/RouteMap";
import { formatCheckpoints, planCheckpoints } from "@/lib/checkpoints";
import { daysUntil, fmtDate } from "@/lib/dates";
import { requireOwner } from "@/lib/owner";
import { fmtKm, fmtPace, fmtTime } from "@/lib/pace";
import { getPrefs, getRace } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Fiche({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erreur?: string; ok?: string }> }) {
  await requireOwner();
  const { id } = await params, { erreur, ok } = await searchParams;
  const [race, prefs] = await Promise.all([getRace(id), getPrefs()]);
  if (!race) notFound();

  const km = race.distance_m / 1000;
  const profile = race.course_profile ?? [];
  const targetS = race.target_pace_s ? race.target_pace_s * km : null;
  const planned = targetS ? planCheckpoints(race.checkpoints, profile, km, targetS) : null;
  const days = daysUntil(race.race_date, new Date());
  const update = updateRace.bind(null, race.id), importTrack = importRaceTrack.bind(null, race.id);

  const items: Item[] = [
    {
      id: "hero", label: "Chiffres clés", size: "xl",
      node: (
        <div className="trio" style={{ marginBottom: 0 }}>
          <div><div className="l">Distance</div><div className="v">{fmtKm(race.distance_m)}<small>km</small></div></div>
          {race.elevation_gain_m != null && <div><div className="l">Dénivelé +</div><div className="v">{Math.round(race.elevation_gain_m)}<small>m</small></div></div>}
          {race.target_pace_s != null && <div><div className="l">Allure visée</div><div className="v" style={{ color: "var(--accent)" }}>{fmtPace(race.target_pace_s)}<small>/km</small></div></div>}
          {targetS != null && <div><div className="l">Temps visé</div><div className="v">{fmtTime(targetS)}</div></div>}
          <div><div className="l">Départ dans</div><div className="v">{days > 0 ? `J-${days}` : days === 0 ? "Jour J" : "Passée"}</div></div>
        </div>
      ),
    },
    {
      id: "map", label: "Tracé", size: "l",
      node: (<><h2>Tracé</h2>{race.course_polyline ? <RouteMap polyline={race.course_polyline} label={`Tracé de ${race.name}`} /> : <p className="empty">Pas encore de tracé. Importe le fichier GPX du parcours (formulaire plus bas).</p>}</>),
    },
    {
      id: "notes", label: "Notes", size: "s",
      node: (<><h2>Notes</h2><p className="muted" style={{ whiteSpace: "pre-wrap" }}>{race.notes || "Aucune note."}</p></>),
    },
    {
      id: "elev", label: "Profil de dénivelé", size: "xl",
      node: (<><h2>Profil de dénivelé <span className="hint">pointillés : repères de passage</span></h2><ElevationProfile profile={profile} marks={race.checkpoints.map((c) => c.km)} height={200} /></>),
    },
    {
      id: "passages", label: "Repères de passage", size: "xl",
      node: (
        <>
          <h2>Repères de passage {targetS && <span className="hint">temps cumulés pour tenir {fmtTime(targetS)}{profile.length < 2 ? " · répartis à plat, sans le relief" : ""}</span>}</h2>
          {!planned ? <p className="empty">Renseigne une allure objectif pour calculer les temps de passage.</p> : planned.length === 0 ? <p className="empty">Aucun repère. Ajoutes-en dans le formulaire ci-dessous.</p> : (
            <div className="tablewrap"><table>
              <thead><tr><th>Repère</th><th className="num">Km</th><th className="num">Altitude</th><th className="num">Allure du tronçon</th><th className="num">Passage</th><th>Consigne</th></tr></thead>
              <tbody>{planned.map((c) => (
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
    },
    {
      id: "edit", label: "Modifier la course", size: "m",
      node: (
        <>
          <h2>Modifier la course</h2>
          <form action={update} style={{ display: "grid", gap: 12 }}>
            <div className="field"><label htmlFor="pace">Allure objectif (m:ss /km)</label><input id="pace" name="pace" defaultValue={race.target_pace_s ? fmtPace(race.target_pace_s) : ""} placeholder="4:50" /></div>
            <div className="field"><label htmlFor="checkpoints">Repères de passage</label><textarea id="checkpoints" name="checkpoints" defaultValue={formatCheckpoints(race.checkpoints)} /><p className="hint">Une ligne par repère : km | nom | consigne</p></div>
            <div className="field"><label htmlFor="notes">Notes</label><textarea id="notes" name="notes" defaultValue={race.notes ?? ""} style={{ minHeight: 80 }} /></div>
            <button className="btn primary" type="submit">Enregistrer</button>
          </form>
        </>
      ),
    },
    {
      id: "track", label: "Importer le tracé GPX", size: "s",
      node: (
        <>
          <h2>Tracé du parcours</h2>
          <form action={importTrack} style={{ display: "grid", gap: 12 }}>
            <div className="field"><label htmlFor="file">Fichier GPX ou FIT</label><input id="file" name="file" type="file" accept=".gpx,.fit" required /><p className="hint">10 Mo maximum. Remplace le tracé actuel.</p></div>
            <button className="btn" type="submit">Importer</button>
          </form>
        </>
      ),
    },
  ];

  const header = (<div><p className="eyebrow">Fiche de course · {fmtDate(race.race_date + "T12:00:00Z", { weekday: "long", day: "numeric", month: "long" })}</p><h1 className="title">{race.name}</h1></div>);
  return (
    <>
      {erreur && <p className="alert" role="alert">{erreur === "allure" ? "L'allure doit être au format m:ss, par exemple 4:50." : erreur}</p>}
      {ok && <p className="ok" role="status">Enregistré.</p>}
      <Dashboard page="courses" header={header} items={items} saved={prefs.widgets.courses} theme={prefs.theme} accent={prefs.accent} />
    </>
  );
}
