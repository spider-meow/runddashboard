import type { CSSProperties } from "react";
import type { Split } from "@/lib/analyze";
import { fmtPace } from "@/lib/pace";
import type { Week } from "@/lib/stats";

// Graphiques SVG rendus côté serveur, sans JavaScript côté navigateur. Les infobulles sont des <title> natifs.
// Les styles (.chart, .line, .bar...) viennent de maquettes/assets/base.css.
const W = 520;
const DRAW = { "--len": 1 } as CSSProperties;
const scale = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
const fmtN = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const Empty = ({ children }: { children: string }) => <p className="empty">{children}</p>;

export function ElevationProfile({ profile, marks = [], height = 190 }: { profile: [number, number][]; marks?: number[]; height?: number }) {
  if (profile.length < 2) return <Empty>Profil d'altitude indisponible.</Empty>;
  const m = { l: 44, r: 8, t: 10, b: 24 }, kmMax = profile[profile.length - 1][0];
  const alts = profile.map((p) => p[1]);
  const lo = Math.floor(Math.min(...alts) / 10) * 10 - 5, hi = Math.ceil(Math.max(...alts) / 10) * 10 + 5;
  const x = scale(0, kmMax, m.l, W - m.r), y = scale(lo, hi, height - m.b, m.t);
  const d = "M" + profile.map(([k, a]) => `${x(k).toFixed(1)} ${y(a).toFixed(1)}`).join("L");
  const step = kmMax > 12 ? 4 : kmMax > 6 ? 2 : 1;
  const altAt = (km: number) => profile.reduce((b, p) => (Math.abs(p[0] - km) < Math.abs(b[0] - km) ? p : b))[1];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`Profil de dénivelé sur ${fmtN(kmMax)} km : départ ${Math.round(alts[0])} m, arrivée ${Math.round(alts[alts.length - 1])} m, de ${Math.round(Math.min(...alts))} m (point bas) à ${Math.round(Math.max(...alts))} m (point haut)`}>
      {[lo + 5, (lo + hi) / 2, hi - 5].map((v) => (
        <g key={v}><line className="grid-l" x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} /><text x={0} y={y(v) + 4}>{Math.round(v)} m</text></g>
      ))}
      <path className="area" d={`${d}L${x(kmMax)} ${height - m.b}L${m.l} ${height - m.b}Z`} />
      <path className="line draw go" d={d} pathLength={1} style={DRAW} />
      {marks.filter((k) => k > 0 && k < kmMax).map((k) => <line key={k} className="ref" x1={x(k)} x2={x(k)} y1={y(altAt(k))} y2={height - m.b} />)}
      {Array.from({ length: Math.floor(kmMax / step) + 1 }, (_, i) => i * step).map((k) => <text key={k} x={x(k)} y={height - 5} textAnchor="middle">{k}</text>)}
    </svg>
  );
}

// Allure par kilomètre : plus haut = plus rapide. totalM sert à calculer l'allure du dernier kilomètre partiel.
export function PaceBars({ splits, totalM, height = 190 }: { splits: Split[]; totalM: number; height?: number }) {
  if (!splits.length) return <Empty>Pas encore de détail kilomètre par kilomètre.</Empty>;
  const paces = splits.map((s) => (s.partial ? s.time_s / ((totalM - (s.km - 1) * 1000) / 1000) : s.time_s));
  const full = splits.filter((s) => !s.partial), avg = full.length ? full.reduce((a, s) => a + s.time_s, 0) / full.length : paces[0];
  const m = { l: 44, r: 62, t: 14, b: 24 }, hi = Math.max(...paces) + 8, lo = Math.min(...paces) - 14;
  const y = scale(hi, lo, height - m.b, m.t), bw = (W - m.l - m.r) / splits.length;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`Allure par kilomètre : moyenne ${fmtPace(avg)} /km, plus rapide au km ${splits[paces.indexOf(Math.min(...paces))].km} (${fmtPace(Math.min(...paces))}), plus lent au km ${splits[paces.indexOf(Math.max(...paces))].km} (${fmtPace(Math.max(...paces))})`}>
      {[lo + 6, (lo + hi) / 2, hi - 6].map((v) => (
        <g key={v}><line className="grid-l" x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} /><text x={0} y={y(v) + 4}>{fmtPace(v)}</text></g>
      ))}
      {splits.map((s, i) => {
        const top = y(paces[i]), x0 = m.l + i * bw + 2;
        return (
          <g key={s.km}>
            <rect className={"bar" + (s.partial ? " mute" : "")} style={{ "--k": i } as CSSProperties} x={x0} y={top} width={Math.max(2, bw - 4)} height={height - m.b - top} rx={3}>
              <title>{`km ${s.km} : ${fmtPace(paces[i])} /km, ${s.elev_m > 0 ? "+" : ""}${Math.round(s.elev_m)} m`}</title>
            </rect>
            {(splits.length <= 14 || i % 2 === 0) && <text x={x0 + (bw - 4) / 2} y={height - 6} textAnchor="middle">{s.km}</text>}
          </g>
        );
      })}
      <line className="ref" x1={m.l} x2={W - m.r} y1={y(avg)} y2={y(avg)} />
      <text x={W - m.r + 6} y={y(avg) + 4}>moy. {fmtPace(avg)}</text>
    </svg>
  );
}

export function VolumeBars({ weeks, height = 190 }: { weeks: Week[]; height?: number }) {
  if (!weeks.some((w) => w.km > 0)) return <Empty>Aucune course sur cette période.</Empty>;
  const m = { l: 34, r: 8, t: 14, b: 24 }, hi = Math.max(20, Math.ceil(Math.max(...weeks.map((w) => w.km)) / 20) * 20);
  const y = scale(0, hi, height - m.b, m.t), bw = (W - m.l - m.r) / weeks.length;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`Volume hebdomadaire sur ${weeks.length} semaines : total ${fmtN(weeks.reduce((a, w) => a + w.km, 0))} km, maximum ${fmtN(Math.max(...weeks.map((w) => w.km)))} km, semaine en cours ${fmtN(weeks[weeks.length - 1].km)} km`}>
      {[0, hi / 2, hi].map((v) => <g key={v}><line className="grid-l" x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} /><text x={0} y={y(v) + 4}>{v}</text></g>)}
      {weeks.map((w, i) => {
        const top = y(w.km), x0 = m.l + i * bw + 1.5, last = i === weeks.length - 1;
        return (
          <g key={w.weekStart}>
            <rect className={"bar" + (last ? " mute" : "")} style={{ "--k": i } as CSSProperties} x={x0} y={top} width={Math.max(2, bw - 3)} height={Math.max(0, height - m.b - top)} rx={3}>
              <title>{`semaine du ${w.weekStart} : ${w.km} km${w.pace ? `, ${fmtPace(w.pace)} /km` : ""}${last ? " (en cours)" : ""}`}</title>
            </rect>
            {i % 4 === 0 && <text x={x0 + (bw - 3) / 2} y={height - 6} textAnchor="middle">S{i + 1}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function PaceLine({ weeks, height = 190 }: { weeks: Week[]; height?: number }) {
  const known = weeks.filter((w) => w.pace !== null);
  if (known.length < 2) return <Empty>Il faut au moins deux semaines avec des courses.</Empty>;
  const paces = known.map((w) => w.pace!), m = { l: 44, r: 8, t: 14, b: 24 };
  const hi = Math.max(...paces) + 6, lo = Math.min(...paces) - 6;
  const x = scale(0, weeks.length - 1, m.l, W - m.r), y = scale(hi, lo, height - m.b, m.t);
  let d = "", pen = false;
  weeks.forEach((w, i) => { if (w.pace === null) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(w.pace).toFixed(1)}`; pen = true; });
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`Allure moyenne par semaine : de ${fmtPace(paces[0])} à ${fmtPace(paces[paces.length - 1])} /km entre la première et la dernière semaine courue, meilleure semaine ${fmtPace(Math.min(...paces))} /km`}>
      {[lo + 4, (lo + hi) / 2, hi - 4].map((v) => <g key={v}><line className="grid-l" x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} /><text x={0} y={y(v) + 4}>{fmtPace(v)}</text></g>)}
      <path className="line draw go" d={d} pathLength={1} style={DRAW} />
      {weeks.map((w, i) => w.pace !== null && <circle key={w.weekStart} className="pt" cx={x(i)} cy={y(w.pace)} r={3.5}><title>{`semaine du ${w.weekStart} : ${fmtPace(w.pace)} /km`}</title></circle>)}
      {weeks.map((_, i) => i % 4 === 0 && <text key={i} x={x(i)} y={height - 6} textAnchor="middle">S{i + 1}</text>)}
    </svg>
  );
}
