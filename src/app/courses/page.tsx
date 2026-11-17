import Link from "next/link";
import { createRace } from "@/app/actions";
import { MigrationNotice } from "@/components/bits";
import { daysUntil, fmtDate } from "@/lib/dates";
import { requireOwner } from "@/lib/owner";
import { fmtKm, fmtPace, fmtTime } from "@/lib/pace";
import { getRaces } from "@/lib/queries";

export const dynamic = "force-dynamic";

const ERREURS: Record<string, string> = { champs: "Nom, date (AAAA-MM-JJ) et distance sont obligatoires.", allure: "L'allure doit être au format m:ss, par exemple 4:50." };

export default async function Courses({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  await requireOwner();
  const { erreur } = await searchParams;
  const { races, migrationMissing } = await getRaces();
  const now = new Date();

  return (
    <>
      <header className="top"><div><p className="eyebrow">Objectifs</p><h1 className="title">Courses à <em>venir</em></h1></div></header>
      {migrationMissing && <MigrationNotice />}
      {erreur && ERREURS[erreur] && <p className="alert" role="alert">{ERREURS[erreur]}</p>}
      <div className="grid">
        <section className="card" data-size="l">
          <h2>Mes courses</h2>
          {races.length === 0 ? <p className="empty">Aucune course pour l'instant. Ajoute la première avec le formulaire.</p> : races.map((r) => {
            const days = daysUntil(r.race_date, now);
            return (
              <Link key={r.id} className="list-link" href={`/courses/${r.id}`}>
                <span><strong>{r.name}</strong><span className="muted" style={{ fontSize: 14 }}>{fmtDate(r.race_date, { day: "numeric", month: "long", year: "numeric" })} · {fmtKm(r.distance_m)} km{r.elevation_gain_m ? ` · ${Math.round(r.elevation_gain_m)} m D+` : ""}{r.target_pace_s ? ` · objectif ${fmtPace(r.target_pace_s)} /km (${fmtTime(r.target_pace_s * r.distance_m / 1000)})` : ""}</span></span>
                <span className="chip">{days > 0 ? `J-${days}` : days === 0 ? "Jour J" : "Passée"}</span>
              </Link>
            );
          })}
        </section>
        <section className="card" data-size="s">
          <h2>Nouvelle course</h2>
          <form action={createRace} style={{ display: "grid", gap: 12 }}>
            <div className="field"><label htmlFor="name">Nom</label><input id="name" name="name" required /></div>
            <div className="field"><label htmlFor="date">Date</label><input id="date" name="date" type="date" required /></div>
            <div className="field"><label htmlFor="distance_km">Distance (km)</label><input id="distance_km" name="distance_km" inputMode="decimal" required /></div>
            <div className="field"><label htmlFor="dplus">D+ (m)</label><input id="dplus" name="dplus" inputMode="numeric" /></div>
            <div className="field"><label htmlFor="pace">Allure objectif (m:ss /km)</label><input id="pace" name="pace" placeholder="4:50" /></div>
            <button className="btn primary" type="submit">Créer</button>
          </form>
        </section>
      </div>
    </>
  );
}
