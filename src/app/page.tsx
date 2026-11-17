import Link from "next/link";
import { Cards, type Item } from "@/components/Cards";
import { MigrationNotice, PrList, ShoeList } from "@/components/bits";
import { SyncButton } from "@/components/SyncButton";
import { ElevationProfile, PaceBars, VolumeBars } from "@/components/charts";
import { RouteMap } from "@/components/RouteMap";
import { daysUntil, fmtDate, parisDay } from "@/lib/dates";
import { isOwner } from "@/lib/owner";
import { fmtKm, fmtPace, fmtTime, paceSecPerKm } from "@/lib/pace";
import { getCalibration, getGear, getLastRun, getRaces, getRuns } from "@/lib/queries";
import { genericGradeFactor, pickReference, profileGradeFactor, riegel } from "@/lib/riegel";
import { personalRecords, shoeStats, weeklyVolume } from "@/lib/stats";


const ERREURS: Record<string, string> = {
  refus: "Tu as refusé l'accès à Strava.",
  autorisation: "Il faut accepter de partager toutes tes activités (« activity:read_all »).",
  sync: "Connecté, mais la première synchronisation a échoué. Clique sur « Synchroniser » pour réessayer.",
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

  const [runs, last, { races, migrationMissing }, gear, { model }] = await Promise.all([getRuns(), getLastRun(), getRaces(), getGear(), getCalibration()]);

  if (!last) {
    return (
      <div className="stack">
        <h1 className="title">Aucune course</h1>
        {alert}
        {migrationMissing && <MigrationNotice />}
        <p>Aucune course n'est encore en base. Lance une synchronisation, ou importe un fichier GPX/FIT depuis « Données ».</p>
        <SyncButton />
      </div>
    );
  }

  const now = new Date(), today = parisDay(now);
  const race = races.find((r) => r.race_date >= today);
  const records = personalRecords(runs);
  const ref = pickReference(Object.fromEntries(Object.entries(records.efforts).map(([k, v]) => [k, v.time_s])));
  const weeks = weeklyVolume(runs, now, 12);
  const pace = paceSecPerKm(last.moving_time_s, last.distance_m);

  // Projection de la prochaine course : Riegel depuis le meilleur effort de référence, puis coût du relief.
  let flat: number | null = null, adj: number | null = null, gap: number | null = null;
  if (race && ref) {
    flat = riegel(ref.time_s, ref.distance_km, race.distance_m / 1000);
    adj = flat * (race.course_profile && race.course_profile.length > 1 ? profileGradeFactor(race.course_profile, model) : genericGradeFactor(race.distance_m, race.elevation_gain_m ?? 0, model));
    if (race.target_pace_s) gap = adj - race.target_pace_s * (race.distance_m / 1000);
  }
  const days = race ? daysUntil(race.race_date, now) : 0;
  const sum = (w: typeof weeks, k: "km" | "dplus") => w.reduce((a, x) => a + x[k], 0);
  const km4 = sum(weeks.slice(-4), "km"), kmP = sum(weeks.slice(-8, -4), "km");
  const trend = kmP > 0 ? Math.round((km4 / kmP - 1) * 100) : null;

  const items: Item[] = [];
  items.push({
    id: "rhythm", size: "xl",
    node: (
      <>
        <h2>Rythme <span className="hint">12 semaines, km</span></h2>
        <p className="lede"><b>{Math.round(km4)} km</b> sur les 4 dernières semaines{trend !== null && <> <span className={"chip " + (trend >= 0 ? "good" : "warn")}>{trend >= 0 ? "+" : "−"}{Math.abs(trend)} %</span></>}, soit <b>{Math.round(sum(weeks.slice(-4), "dplus"))} m</b> de dénivelé.</p>
        <VolumeBars weeks={weeks} height={230} />
      </>
    ),
  });
  items.push({
    id: "last", size: "m", tone: "hot",
    node: (
      <>
        <h2>Dernière course <span className="hint">{fmtDate(last.started_at, { day: "numeric", month: "short" })}</span></h2>
        <Link className="ticket" href={`/historique/${last.id}`}>
          <span className="ticket-name">{last.name}</span>
          <span className="ticket-pace">{pace ? fmtPace(pace) : "–"}<small>/km</small></span>
          <span className="ticket-row"><span>{fmtKm(last.distance_m)} km</span><span>{fmtTime(last.moving_time_s)}</span><span>{Math.round(last.elevation_gain_m ?? 0)} m D+</span></span>
          <span className="ticket-go">Voir le détail →</span>
        </Link>
      </>
    ),
  });
  items.push({
    id: "pace", size: "m",
    node: (<><h2>Allure par kilomètre <span className="hint">plus haut = plus vite</span></h2><PaceBars splits={last.splits ?? []} totalM={last.distance_m} /></>),
  });
  const profile = race?.course_profile && race.course_profile.length > 1 ? race.course_profile : last.elev_profile;
  items.push({
    id: "elev", size: "xl",
    node: (<><h2>Profil de dénivelé <span className="hint">{race?.course_profile?.length ? "la course" : "dernière course"}</span></h2><ElevationProfile profile={profile ?? []} marks={race?.course_profile?.length ? race.checkpoints.map((c) => c.km) : []} /></>),
  });
  items.push({ id: "shoes", size: "m", node: (<><h2>Chaussures</h2><ShoeList shoes={shoeStats(runs, gear)} /></>) });
  items.push({ id: "prs", size: "m", node: (<><h2>Records</h2><PrList records={records} /></>) });

  const proj = adj !== null && flat !== null ? (
    <p className="hero-proj">
      Projection <b className="num">{fmtTime(adj)}</b> relief inclus
      {gap !== null && <> · <span className={"chip " + (gap > 0 ? "warn" : "good")}>{gap > 0 ? "+" : "−"}{Math.abs(Math.round(gap))} s sur l'objectif</span></>}
    </p>
  ) : null;

  return (
    <>
      {alert}
      {migrationMissing && <MigrationNotice />}
      {race ? (
        <section className="hero" data-widget="race" aria-labelledby="hero-name">
          {race.course_polyline && <div className="hero-map"><RouteMap polyline={race.course_polyline} label="Tracé de la course" w={640} h={440} /></div>}
          <div className="hero-body">
            <p className="eyebrow">Prochaine course · {fmtDate(race.race_date + "T12:00:00Z", { weekday: "long", day: "numeric", month: "long" })}</p>
            <div className="hero-count" data-widget="countdown"><span className="sr">Dans </span>{days > 0 ? `J-${days}` : days === 0 ? "Jour J" : "Passée"}</div>
            <h1 className="hero-name" id="hero-name">{race.name}</h1>
            <dl className="hero-facts">
              <div><dt>Distance</dt><dd>{fmtKm(race.distance_m)}<small>km</small></dd></div>
              {race.elevation_gain_m != null && <div><dt>D+</dt><dd>{Math.round(race.elevation_gain_m)}<small>m</small></dd></div>}
              {race.target_pace_s != null && <div><dt>Objectif</dt><dd>{fmtPace(race.target_pace_s)}<small>/km</small></dd></div>}
              {race.target_pace_s != null && <div><dt>Temps visé</dt><dd>{fmtTime(race.target_pace_s * (race.distance_m / 1000))}</dd></div>}
            </dl>
            {proj}
            <p><Link className="btn primary" href={`/courses/${race.id}`}>Ouvrir la fiche</Link></p>
            {!race.course_polyline && <p className="empty">Importe le tracé GPX depuis la fiche pour le voir ici.</p>}
          </div>
        </section>
      ) : (
        <section className="hero hero-empty" data-widget="race">
          <div className="hero-body">
            <p className="eyebrow">{fmtDate(now.toISOString(), { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="hero-name" id="hero-name">{last.name}</h1>
            <p className="muted">Aucune course à venir. <Link className="inline-link" href="/courses">Ajoute la prochaine</Link> pour voir ici son tracé, son compte à rebours et ta projection de temps.</p>
          </div>
        </section>
      )}
      <Cards items={items} />
      <footer className="foot"><SyncButton label="Synchroniser avec Strava" /></footer>
    </>
  );
}
