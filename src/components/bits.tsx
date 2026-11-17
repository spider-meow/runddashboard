import type { CSSProperties, ReactNode } from "react";
import { fmtDate } from "@/lib/dates";
import { fmtKm, fmtTime } from "@/lib/pace";
import type { Calibration } from "@/lib/calibrate";
import { MIN_KM } from "@/lib/calibrate";
import type { Records, Shoe } from "@/lib/stats";

export const Stat = ({ label, children, unit }: { label: string; children: ReactNode; unit?: string }) => (
  <div className="stat"><div className="l">{label}</div><div className="v">{children}{unit && <small>{unit}</small>}</div></div>
);

export const MigrationNotice = () => (
  <p className="notice" role="alert">La migration <code>supabase/migrations/0002_features.sql</code> n'est pas encore appliquée à ta base. Colle-la dans le SQL editor de Supabase pour activer les courses et les records.</p>
);

// Durée de vie indicative d'une paire de running : la jauge montre où on en est, sans prétendre à une usure exacte.
const SHOE_LIFE_KM = 800;

export function ShoeList({ shoes }: { shoes: Shoe[] }) {
  if (!shoes.length) return <p className="empty">Aucune chaussure associée à tes courses. Ajoute ton équipement dans Strava et affecte-le à tes sorties, puis resynchronise.</p>;
  return (
    <div>
      {shoes.map((s) => (
        <div className="pr shoe" key={s.id}>
          <span>{s.name}<small>{s.runs} sortie{s.runs > 1 ? "s" : ""} · dernière le {fmtDate(s.lastUsed + "T12:00:00Z", { day: "numeric", month: "short" })}</small></span>
          <b>{Math.round(s.km)} km</b>
          <i className="meter" style={{ "--p": `${Math.min(100, (s.km / SHOE_LIFE_KM) * 100)}%` } as CSSProperties} aria-hidden="true" />
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

const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")} %`;

// Où en est le modèle de relief : ses coefficients, ce qu'ils valent sur tes sorties, et pourquoi il est (ou non) adopté.
export function CalibrationNote({ c }: { c: Calibration }) {
  if (c.km === 0) return <p className="empty">Aucune sortie avec détail kilomètre par kilomètre et dénivelé : le modèle par défaut est utilisé.</p>;
  return (
    <div>
      <div className="kv">
        <div><span>Montée, temps en plus par % de pente</span><b>{pct(c.model.up)}</b></div>
        <div><span>Descente, temps en moins par % de pente</span><b>{pct(c.model.down)}</b></div>
        <div><span>Kilomètres analysés</span><b>{Math.round(c.km)} · {c.runs} sorties</b></div>
        <div><span>Erreur sur un kilomètre</span><b>{pct(c.errFlat)} à plat → {pct(c.errFitted)}</b></div>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: "var(--s3)" }}>
        {c.calibrated
          ? `Ajusté sur tes sorties (recalculé chaque jour). Le modèle par défaut (3,3 % et 1,8 %) se trompait de ${pct(c.errDefault)}.`
          : `Pas assez de données pour s'y fier (${Math.round(c.km)} km sur ${MIN_KM} nécessaires) : le modèle par défaut reste utilisé. Sur tes sorties, il aurait donné ${pct(c.fitted.up)} en montée et ${pct(c.fitted.down)} en descente.`}
      </p>
    </div>
  );
}
