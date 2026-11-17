import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteRun } from "@/app/actions";
import { Cards, PageHeader, type Item } from "@/components/Cards";
import { ElevationProfile, PaceBars } from "@/components/charts";
import { DeleteRace } from "@/components/RaceForm";
import { RouteMap } from "@/components/RouteMap";
import { fmtDate } from "@/lib/dates";
import { findDuplicates } from "@/lib/duplicates";
import { requireOwner } from "@/lib/owner";
import { fmtKm, fmtPace, fmtTime, paceSecPerKm } from "@/lib/pace";
import { getGear, getRun, getRuns } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const run = await getRun((await params).id);
  return { title: run?.name ?? "Sortie" };
}

export default async function Sortie({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const [run, runs, gear] = await Promise.all([getRun(id), getRuns(), getGear()]);
  if (!run) notFound();

  const pace = paceSecPerKm(run.moving_time_s, run.distance_m);
  const shoe = run.gear_id ? gear.find((g) => g.id === run.gear_id)?.name : null;
  const twinId = findDuplicates(runs).get(run.id);
  const twin = twinId ? runs.find((r) => r.id === twinId) : null;
  const remove = deleteRun.bind(null, run.id);
  const fromFile = run.source !== "strava";

  const items: Item[] = [];
  items.push({
    id: "map", size: "m",
    node: (<><h2>Tracé</h2>{run.polyline ? <RouteMap polyline={run.polyline} label={`Tracé de ${run.name}`} /> : <p className="empty">Pas de tracé GPS pour cette sortie.</p>}</>),
  });
  items.push({
    id: "pace", size: "m",
    node: (<><h2>Allure par kilomètre <span className="hint">plus haut = plus vite</span></h2><PaceBars splits={run.splits ?? []} totalM={run.distance_m} /></>),
  });
  items.push({
    id: "elev", size: "xl",
    node: (<><h2>Profil de dénivelé</h2><ElevationProfile profile={run.elev_profile ?? []} /></>),
  });
  if (run.splits?.length) {
    items.push({
      id: "splits", size: "xl",
      node: (
        <>
          <h2>Kilomètres</h2>
          <div className="tablewrap"><table>
            <thead><tr><th>Km</th><th className="num">Temps</th><th className="num">Allure</th><th className="num">Dénivelé</th></tr></thead>
            <tbody>{run.splits.map((s) => {
              const p = s.partial ? s.time_s / ((run.distance_m - (s.km - 1) * 1000) / 1000) : s.time_s;
              return <tr key={s.km}><td>{s.partial ? `${s.km} (partiel)` : s.km}</td><td className="num">{fmtTime(s.time_s)}</td><td className="num"><b>{fmtPace(p)}</b> /km</td><td className="num"><span className={s.elev_m > 0 ? "up" : "dn"}>{s.elev_m > 0 ? "+" : ""}{Math.round(s.elev_m)} m</span></td></tr>;
            })}</tbody>
          </table></div>
        </>
      ),
    });
  }
  items.push({
    id: "source", size: "m",
    node: (
      <>
        <h2>Origine</h2>
        {fromFile ? (
          <>
            <p className="muted" style={{ marginBottom: "var(--s4)" }}>Importée depuis un fichier {run.source.toUpperCase()}. Tu peux la supprimer : les sorties Strava ne sont pas touchées.</p>
            <DeleteRace name={run.name} action={remove} what="cette sortie" consequence="Elle disparaît de l'historique, des records et des totaux. Le fichier d'origine, lui, reste sur ton disque." />
          </>
        ) : (
          <p className="muted">Synchronisée depuis Strava. Pour la retirer du dashboard, supprime-la dans Strava : la prochaine synchro la fera disparaître.</p>
        )}
      </>
    ),
  });

  return (
    <>
      <p className="back"><Link href="/historique" className="inline-link">← Historique</Link></p>
      <PageHeader eyebrow={fmtDate(run.started_at, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>{run.name}</PageHeader>
      {twin && (
        <p className="notice" role="status">
          Cette sortie importée ressemble à « <Link className="inline-link" href={`/historique/${twin.id}`}>{twin.name}</Link> » déjà présente via Strava (même départ, même distance). Elle compte deux fois dans tes totaux : supprime l'une des deux.
        </p>
      )}
      <dl className="facts">
        <div><dt>Distance</dt><dd>{fmtKm(run.distance_m)}<small>km</small></dd></div>
        <div><dt>Temps</dt><dd>{fmtTime(run.moving_time_s)}</dd></div>
        <div className="accent"><dt>Allure</dt><dd>{pace ? fmtPace(pace) : "–"}<small>/km</small></dd></div>
        <div><dt>D+</dt><dd>{Math.round(run.elevation_gain_m ?? 0)}<small>m</small></dd></div>
        {run.avg_hr != null && <div><dt>FC moy.</dt><dd>{Math.round(run.avg_hr)}<small>bpm</small></dd></div>}
        {shoe && <div><dt>Chaussures</dt><dd className="txt">{shoe}</dd></div>}
      </dl>
      <Cards items={items} />
    </>
  );
}
