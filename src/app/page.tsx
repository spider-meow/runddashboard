import { RouteMap } from "@/components/RouteMap";
import { db } from "@/lib/db";
import { isOwner } from "@/lib/owner";
import { fmtPace, fmtTime, paceSecPerKm } from "@/lib/pace";

export const dynamic = "force-dynamic";

const ERREURS: Record<string, string> = {
  refus: "Tu as refusé l'accès à Strava.",
  autorisation: "Il faut accepter de partager toutes tes activités (« activity:read_all »).",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const alert = erreur && ERREURS[erreur] ? <p className="alert" role="alert">{ERREURS[erreur]}</p> : null;

  if (!(await isOwner())) {
    return (
      <div className="stack">
        <p className="eyebrow">Dashboard privé</p>
        <h1 className="title">Run<em>dashboard</em></h1>
        {alert}
        <p>Connecte-toi avec Strava pour voir ta dernière course.</p>
        <p><a className="btn primary" href="/api/strava/connect">Se connecter avec Strava</a></p>
      </div>
    );
  }

  const { data, error } = await db().from("activities").select("*").in("sport", ["Run", "TrailRun", "VirtualRun"]).order("started_at", { ascending: false }).limit(1);
  if (error) throw error; // base injoignable : on ne l'affiche pas comme « aucune course »
  const run = data?.[0];
  const sync = (label: string) => <form action="/api/strava/sync" method="post"><button className="btn" type="submit">{label}</button></form>;

  if (!run) {
    return (
      <div className="stack">
        <h1 className="title">Aucune course</h1>
        {alert}
        <p>Aucune course n'est encore en base. Lance une synchronisation.</p>
        {sync("Synchroniser")}
      </div>
    );
  }

  const pace = paceSecPerKm(run.moving_time_s, run.distance_m);
  const km = (run.distance_m / 1000).toFixed(1).replace(".", ",");
  const date = new Date(run.started_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <header className="top">
        <div>
          <p className="eyebrow">Dernière course · {date}</p>
          <h1 className="title">{run.name}</h1>
        </div>
        {sync("Synchroniser")}
      </header>
      {alert}
      <div className="grid">
        <section className="card" data-size="s" data-tone="hot">
          <div className="stat"><div className="l">Distance</div><div className="v">{km}<small>km</small></div></div>
        </section>
        <section className="card" data-size="s">
          <div className="stat"><div className="l">Temps</div><div className="v">{fmtTime(run.moving_time_s)}</div></div>
        </section>
        <section className="card" data-size="s">
          <div className="stat"><div className="l">Allure</div><div className="v">{pace ? fmtPace(pace) : "–"}<small>/km</small></div></div>
        </section>
        <section className="card" data-size="l">
          <h2>Tracé</h2>
          {run.polyline ? <RouteMap polyline={run.polyline} /> : <p>Pas de tracé pour cette activité.</p>}
        </section>
        <section className="card pair" data-size="s">
          <div className="stat"><div className="l">Dénivelé +</div><div className="v">{Math.round(run.elevation_gain_m ?? 0)}<small>m</small></div></div>
          {run.avg_hr ? <div className="stat"><div className="l">FC moyenne</div><div className="v">{Math.round(run.avg_hr)}<small>bpm</small></div></div> : null}
        </section>
      </div>
    </>
  );
}
