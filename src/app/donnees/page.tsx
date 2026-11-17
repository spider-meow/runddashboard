import { importActivity, logout } from "@/app/actions";
import { Cards, PageHeader, type Item } from "@/components/Cards";
import { FileForm } from "@/components/FileForm";
import { SyncButton } from "@/components/SyncButton";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { requireOwner } from "@/lib/owner";
import { getRuns } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Données" };

export default async function Donnees() {
  await requireOwner();
  const [runs, conn] = await Promise.all([getRuns(), db().from("strava_connections").select("athlete_id, updated_at, scope").maybeSingle().then((x) => x.data)]);
  const by = (s: string) => runs.filter((x) => x.source === s).length;
  const pending = runs.filter((x) => x.source === "strava" && !x.analyzed_at).length;

  const items: Item[] = [
    {
      id: "strava", size: "m",
      node: (
        <>
          <h2>Strava</h2>
          <div className="kv">
            <div><span>Connexion</span><b>{conn ? "active" : "absente"}</b></div>
            <div><span>Accès accordé</span><b>{conn?.scope ?? "–"}</b></div>
            <div><span>Jetons mis à jour</span><b>{conn ? fmtDate(conn.updated_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–"}</b></div>
            <div><span>Courses Strava en base</span><b>{by("strava")}</b></div>
            <div><span>À analyser (splits, records)</span><b>{pending}</b></div>
          </div>
          <div style={{ marginTop: "var(--s5)" }}>
            {conn ? <SyncButton label="Resynchroniser" /> : <a className="btn primary" href="/api/strava/connect">Se connecter avec Strava</a>}
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Les courses se synchronisent aussi toutes seules : tous les jours, et à chaque nouvelle activité si le webhook est activé. L&apos;analyse traite 30 activités par passage : s&apos;il en reste, relance.</p>
        </>
      ),
    },
    {
      id: "import", size: "m",
      node: (
        <>
          <h2>Importer une sortie <span className="hint">plan B sans Strava</span></h2>
          <FileForm action={importActivity} label="Fichier .gpx ou .fit de la sortie" hint="4 Mo maximum. Le fichier doit contenir l'heure de chaque point." submit="Importer la sortie" pending="Analyse du fichier…" />
          <div className="kv" style={{ marginTop: "var(--s5)" }}>
            <div><span>Importées depuis GPX</span><b>{by("gpx")}</b></div>
            <div><span>Importées depuis FIT</span><b>{by("fit")}</b></div>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Un même fichier importé deux fois n&apos;ajoute rien (empreinte SHA-256). Une course déjà reçue de Strava et importée en fichier apparaîtrait en double : à éviter.</p>
        </>
      ),
    },
    {
      id: "session", size: "s",
      node: (
        <>
          <h2>Session</h2>
          <p className="muted" style={{ fontSize: 14, marginBottom: "var(--s4)" }}>Tu es connecté en tant que propriétaire. La session dure 30 jours.</p>
          <form action={logout}><button className="btn" type="submit">Se déconnecter</button></form>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Sources">Tes <em>données</em></PageHeader>
      <Cards items={items} />
    </>
  );
}
