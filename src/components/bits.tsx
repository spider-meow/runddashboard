import type { ReactNode } from "react";
import { fmtDate } from "@/lib/dates";
import { fmtKm, fmtTime } from "@/lib/pace";
import type { Records, Shoe } from "@/lib/stats";

export const Stat = ({ label, children, unit }: { label: string; children: ReactNode; unit?: string }) => (
  <div className="stat"><div className="l">{label}</div><div className="v">{children}{unit && <small>{unit}</small>}</div></div>
);

export const MigrationNotice = () => (
  <p className="notice" role="alert">La migration <code>supabase/migrations/0002_features.sql</code> n'est pas encore appliquée à ta base. Colle-la dans le SQL editor de Supabase pour activer les courses et les records.</p>
);

export function ShoeList({ shoes }: { shoes: Shoe[] }) {
  if (!shoes.length) return <p className="empty">Aucune chaussure associée à tes courses. Ajoute ton équipement dans Strava et affecte-le à tes sorties, puis resynchronise.</p>;
  return (
    <div>
      {shoes.map((s) => (
        <div className="pr" key={s.id}>
          <span>{s.name}<small>{s.runs} sortie{s.runs > 1 ? "s" : ""} · dernière le {fmtDate(s.lastUsed + "T12:00:00Z", { day: "numeric", month: "short" })}</small></span>
          <b>{Math.round(s.km)} km</b>
        </div>
      ))}
    </div>
  );
}

const EFFORT_LABEL: Record<string, string> = { "1K": "1 km", "5K": "5 km", "10K": "10 km", "15K": "15 km", Semi: "Semi-marathon" };

export function PrList({ records }: { records: Records }) {
  const rows = ["1K", "5K", "10K", "15K", "Semi"].filter((k) => records.efforts[k]);
  if (!rows.length && !records.longest) return <p className="empty">Les records apparaissent après l'analyse de tes courses.</p>;
  return (
    <div>
      {rows.map((k) => (
        <div className="pr" key={k}><span>{EFFORT_LABEL[k]}<small>{fmtDate(records.efforts[k].date, { day: "numeric", month: "short", year: "numeric" })}</small></span><b>{fmtTime(records.efforts[k].time_s)}</b></div>
      ))}
      {records.longest && <div className="pr"><span>Plus longue sortie<small>{fmtDate(records.longest.date, { day: "numeric", month: "short", year: "numeric" })}</small></span><b>{fmtKm(records.longest.distance_m)} km</b></div>}
      {records.biggestClimb && <div className="pr"><span>Plus gros dénivelé<small>{fmtDate(records.biggestClimb.date, { day: "numeric", month: "short", year: "numeric" })}</small></span><b>{Math.round(records.biggestClimb.elevation_gain_m)} m</b></div>}
    </div>
  );
}
