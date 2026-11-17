import { importActivity } from "@/app/actions";
import { SyncButton } from "@/components/bits";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { requireOwner } from "@/lib/owner";
import { getRuns } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Donnees({ searchParams }: { searchParams: Promise<{ r?: string; m?: string }> }) {
  await requireOwner();
  const { r, m } = await searchParams;
  const [runs, conn] = await Promise.all([getRuns(), db().from("strava_connections").select("athlete_id, updated_at, scope").maybeSingle().then((x) => x.data)]);
  const by = (s: string) => runs.filter((x) => x.source === s).length;
  const pending = runs.filter((x) => x.source === "strava" && !x.analyzed_at).length;

  return (
    <>
      <header className="top"><div><p className="eyebrow">Sources</p><h1 className="title">Tes <em>données</em></h1></div></header>
      {r === "ok" && <p className="ok" role="status">Activité importée.</p>}
      {r === "doublon" && <p className="notice" role="status">Ce fichier est déjà importé : rien n'a été ajouté.</p>}
      {r === "erreur" && <p className="alert" role="alert">{m || "Import impossible."}</p>}
      <div className="grid">
        <section className="card" data-size="m">
          <h2>Strava</h2>
          <div className="kv">
            <div><span>Connexion</span><b>{conn ? "active" : "absente"}</b></div>
            <div><span>Accès accordé</span><b>{conn?.scope ?? "–"}</b></div>
            <div><span>Jetons mis à jour</span><b>{conn ? fmtDate(conn.updated_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–"}</b></div>
            <div><span>Courses Strava en base</span><b>{by("strava")}</b></div>
            <div><span>À analyser (splits, records)</span><b>{pending}</b></div>
          </div>
          <p style={{ marginTop: "var(--s5)", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {conn ? <SyncButton label="Resynchroniser" /> : <a className="btn primary" href="/api/strava/connect">Se connecter avec Strava</a>}
          </p>
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Les courses se synchronisent aussi toutes seules : tous les jours, et à chaque nouvelle activité si le webhook est activé.</p>
        </section>
        <section className="card" data-size="m">
          <h2>Importer un fichier <span className="hint">plan B sans Strava</span></h2>
          <form action={importActivity} style={{ display: "grid", gap: 12 }}>
            <div className="field"><label htmlFor="file">Fichier .gpx ou .fit</label><input id="file" name="file" type="file" accept=".gpx,.fit" required /><p className="hint">4 Mo maximum. Le fichier doit contenir l'heure de chaque point.</p></div>
            <button className="btn primary" type="submit">Importer</button>
          </form>
          <div className="kv" style={{ marginTop: "var(--s5)" }}>
            <div><span>Importées depuis GPX</span><b>{by("gpx")}</b></div>
            <div><span>Importées depuis FIT</span><b>{by("fit")}</b></div>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Un même fichier importé deux fois n'ajoute rien (empreinte SHA-256). Une course déjà reçue de Strava et importée en fichier apparaîtrait en double : à éviter.</p>
        </section>
      </div>
    </>
  );
}
