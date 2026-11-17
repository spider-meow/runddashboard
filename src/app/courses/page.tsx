import Link from "next/link";
import { createRace } from "@/app/actions";
import { MigrationNotice } from "@/components/bits";
import { Cards, PageHeader, type Item } from "@/components/Cards";
import { RaceForm } from "@/components/RaceForm";
import { Flash } from "@/components/formkit";
import { daysUntil, fmtDate, parisDay } from "@/lib/dates";
import { splitRaces } from "@/lib/forms";
import { requireOwner } from "@/lib/owner";
import { fmtKm, fmtPace, fmtTime } from "@/lib/pace";
import { getRaces, type Race } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courses" };

function RaceLink({ r, now }: { r: Race; now: Date }) {
  const days = daysUntil(r.race_date, now);
  return (
    <Link className="list-link" href={`/courses/${r.id}`}>
      <span>
        <strong>{r.name}</strong>
        <span className="muted" style={{ fontSize: 14 }}>
          {fmtDate(r.race_date, { day: "numeric", month: "long", year: "numeric" })} · {fmtKm(r.distance_m)} km{r.elevation_gain_m ? ` · ${Math.round(r.elevation_gain_m)} m D+` : ""}
          {r.target_pace_s ? ` · objectif ${fmtPace(r.target_pace_s)} /km (${fmtTime((r.target_pace_s * r.distance_m) / 1000)})` : ""}
        </span>
      </span>
      <span className="chip">{days > 0 ? `J-${days}` : days === 0 ? "Jour J" : "Passée"}</span>
    </Link>
  );
}

export default async function Courses() {
  await requireOwner();
  const { races, migrationMissing } = await getRaces();
  const now = new Date(), { upcoming, past } = splitRaces(races, parisDay(now));

  const items: Item[] = [
    {
      id: "upcoming", size: "l",
      node: (
        <>
          <h2>À venir</h2>
          {upcoming.length === 0 ? <p className="empty">Aucune course à venir. Ajoute la prochaine avec le formulaire{past.length ? " (tes courses passées sont plus bas)" : ""}.</p> : upcoming.map((r) => <RaceLink key={r.id} r={r} now={now} />)}
        </>
      ),
    },
    {
      id: "new", size: "s",
      node: (<><h2>Nouvelle course</h2><RaceForm action={createRace} mode="create" initial={{}} /></>),
    },
  ];
  if (past.length) items.splice(1, 0, { id: "past", size: "l", node: (<><h2>Passées</h2>{past.map((r) => <RaceLink key={r.id} r={r} now={now} />)}</>) });

  return (
    <>
      <PageHeader eyebrow="Objectifs">Tes <em>courses</em></PageHeader>
      {migrationMissing && <MigrationNotice />}
      <Flash param="supprimee">Course supprimée.</Flash>
      <Cards items={items} />
    </>
  );
}
