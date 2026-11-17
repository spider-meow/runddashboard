import Link from "next/link";
import { Dashboard, type Item } from "@/components/Dashboard";
import { MigrationNotice, PrList, Stat, SyncButton } from "@/components/bits";
import { ElevationProfile, PaceBars, VolumeBars } from "@/components/charts";
import { RouteMap } from "@/components/RouteMap";
import { daysUntil, fmtDate, parisDay } from "@/lib/dates";
import { isOwner } from "@/lib/owner";
import { fmtKm, fmtPace, fmtTime, paceSecPerKm } from "@/lib/pace";
import { getPrefs, getRaces, getRuns } from "@/lib/queries";
import { genericGradeFactor, pickReference, profileGradeFactor, riegel } from "@/lib/riegel";
import { personalRecords, weeklyVolume } from "@/lib/stats";

export const dynamic = "force-dynamic";

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

  const [runs, prefs, { races, migrationMissing }] = await Promise.all([getRuns(), getPrefs(), getRaces()]);
  const last = runs[0];

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
    adj = flat * (race.course_profile && race.course_profile.length > 1 ? profileGradeFactor(race.course_profile) : genericGradeFactor(race.distance_m, race.elevation_gain_m ?? 0));
    if (race.target_pace_s) gap = adj - race.target_pace_s * (race.distance_m / 1000);
  }
  const days = race ? daysUntil(race.race_date, now) : 0;

  const items: Item[] = [];
  if (race) {
    items.push({
      id: "race", label: "Prochaine course", size: "xl",
      node: (
        <>
          <h2>Prochaine course <span className="hint">{fmtDate(race.race_date, { day: "numeric", month: "long" })}</span></h2>
          <div className="race-hero">
            <div>
              <h3>{race.name}</h3>
              <div className="trio">
                <div><div className="l">Distance</div><div className="v">{fmtKm(race.distance_m)}<small>km</small></div></div>
                {race.elevation_gain_m != null && <div><div className="l">D+</div><div className="v">{Math.round(race.elevation_gain_m)}<small>m</small></div></div>}
                {race.target_pace_s != null && <div><div className="l">Objectif</div><div className="v">{fmtPace(race.target_pace_s)}<small>/km</small></div></div>}
              </div>
              {race.target_pace_s != null && <p className="muted">Temps visé <b className="num" style={{ color: "var(--ink)" }}>{fmtTime(race.target_pace_s * (race.distance_m / 1000))}</b></p>}
              <p style={{ marginTop: "var(--s4)" }}><Link className="btn primary" href={`/courses/${race.id}`}>Ouvrir la fiche</Link></p>
            </div>
            {race.course_polyline ? <RouteMap polyline={race.course_polyline} label="Tracé de la course" /> : <p className="empty">Importe le tracé GPX de la course depuis sa fiche pour le voir ici.</p>}
          </div>
        </>
      ),
    });
    items.push({
      id: "countdown", label: "Compte à rebours", size: "s", tone: "hot",
      node: (
        <div className="count">
          <div><h2>Compte à rebours</h2><div className="big">{days > 0 ? `J-${days}` : days === 0 ? "Jour J" : "Passée"}</div></div>
          {adj !== null && flat !== null ? (
            <div className="kv">
              <div><span>Forme actuelle ({ref!.name === "Semi" ? "semi" : ref!.name.replace("K", " km")})</span><b>{fmtTime(flat)}</b></div>
              <div><span>Avec le relief</span><b>{fmtTime(adj)}</b></div>
              {gap !== null && <div><span>Écart à l'objectif</span><span className="chip">{gap > 0 ? "+" : "−"}{Math.abs(Math.round(gap))} s</span></div>}
            </div>
          ) : <p className="muted">Pas assez de données pour projeter un temps.</p>}
        </div>
      ),
    });
  }

  const profile = race?.course_profile && race.course_profile.length > 1 ? race.course_profile : last.elev_profile;
  items.push({
    id: "elev", label: "Profil de dénivelé", size: "l",
    node: (<><h2>Profil de dénivelé <span className="hint">{race?.course_profile?.length ? "la course" : "dernière course"}</span></h2><ElevationProfile profile={profile ?? []} marks={race?.course_profile?.length ? race.checkpoints.map((c) => c.km) : []} /></>),
  });
  items.push({
    id: "last", label: "Dernière course", size: "m",
    node: (
      <>
        <h2>Dernière course</h2>
        <div className="last-top"><h3>{last.name}</h3><span className="chip">{fmtDate(last.started_at, { day: "numeric", month: "short" })}</span></div>
        <div className="quad">
          <div><div className="l">Distance</div><div className="v">{fmtKm(last.distance_m)}<small>km</small></div></div>
          <div><div className="l">Temps</div><div className="v">{fmtTime(last.moving_time_s)}</div></div>
          <div><div className="l">Allure</div><div className="v">{pace ? fmtPace(pace) : "–"}<small>/km</small></div></div>
          <div><div className="l">D+</div><div className="v">{Math.round(last.elevation_gain_m ?? 0)}<small>m</small></div></div>
        </div>
        <div style={{ marginTop: "var(--s4)" }}><SyncButton /></div>
      </>
    ),
  });
  items.push({
    id: "pace", label: "Allure par kilomètre", size: "m",
    node: (<><h2>Allure par kilomètre <span className="hint">plus haut = plus vite</span></h2><PaceBars splits={last.splits ?? []} totalM={last.distance_m} /></>),
  });
  items.push({ id: "volume", label: "Volume hebdomadaire", size: "l", node: (<><h2>Volume hebdomadaire <span className="hint">12 semaines, km</span></h2><VolumeBars weeks={weeks} /></>) });
  items.push({ id: "prs", label: "Records", size: "s", node: (<><h2>Records</h2><PrList records={records} /></>) });

  const header = (
    <div>
      <p className="eyebrow">{fmtDate(now.toISOString(), { weekday: "long", day: "numeric", month: "long" })}</p>
      <h1 className="title">{race ? <>En route pour <em>{race.name}</em></> : last.name}</h1>
    </div>
  );

  return (
    <>
      {alert}
      {migrationMissing && <MigrationNotice />}
      <Dashboard page="home" header={header} items={items} saved={prefs.widgets.home} theme={prefs.theme} accent={prefs.accent} />
    </>
  );
}
