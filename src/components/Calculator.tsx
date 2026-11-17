"use client";

import { useState } from "react";
import { fmtPace, fmtTime, parsePace } from "@/lib/pace";
import { genericGradeFactor, profileGradeFactor, riegel, type Reference } from "@/lib/riegel";

type Props = {
  refs: Reference[];                               // efforts de référence disponibles (tes records)
  race: { name: string; distance_km: number; dplus: number; target_pace_s: number | null; profile: [number, number][] | null };
};

// Calculateur de projection : Riegel depuis une référence, puis coût du relief. Tout se recalcule à la saisie.
export function Calculator({ refs, race }: Props) {
  const [refIdx, setRefIdx] = useState(0);
  const [k, setK] = useState(1.06);
  const [margin, setMargin] = useState(0.02);
  const [dist, setDist] = useState(String(race.distance_km));
  const [dplus, setDplus] = useState(String(race.dplus));
  const [target, setTarget] = useState(race.target_pace_s ? fmtPace(race.target_pace_s) : "");

  const ref = refs[refIdx];
  const d = parseFloat(dist.replace(",", ".")), up = parseFloat(dplus) || 0;
  const sameAsRace = Math.abs(d - race.distance_km) < 0.01 && up === race.dplus;
  const factor = sameAsRace && race.profile && race.profile.length > 1 ? profileGradeFactor(race.profile) : genericGradeFactor(d * 1000, up);
  const T = (kk: number) => (ref ? riegel(ref.time_s, ref.distance_km, d, kk) * factor : NaN);
  const t = T(k), a = T(k - margin), b = T(k + margin), lo = Math.min(a, b), hi = Math.max(a, b);
  const objPace = target ? parsePace(target) : null, obj = objPace ? objPace * d : null;
  const gap = obj !== null ? Math.round(t - obj) : null;
  const left = Math.min(lo, obj ?? lo) * 0.985, right = Math.max(hi, obj ?? hi) * 1.015;
  const pos = (v: number) => `${((v - left) / (right - left)) * 100}%`;

  if (!ref) return <p className="empty">Il faut au moins un effort de 5 km, 10 km ou semi pour projeter un temps.</p>;
  return (
    <>
      <div className="form">
        <div className="field"><label htmlFor="ref">Performance de référence</label>
          <select id="ref" value={refIdx} onChange={(e) => setRefIdx(+e.target.value)}>{refs.map((r, i) => <option key={r.name} value={i}>{r.name === "Semi" ? "Semi" : r.name.replace("K", " km")} · {fmtTime(r.time_s)}</option>)}</select></div>
        <div className="field"><label htmlFor="exp">Exposant de Riegel <span className="rv">{k.toFixed(2).replace(".", ",")}</span></label>
          <input id="exp" type="range" min="1.03" max="1.10" step="0.01" value={k} onChange={(e) => setK(+e.target.value)} /></div>
        <div className="field"><label htmlFor="obj">Allure objectif (m:ss /km)</label>
          <input id="obj" value={target} inputMode="text" autoComplete="off" placeholder="4:50" onChange={(e) => setTarget(e.target.value)} /></div>
        <div className="field"><label htmlFor="dist">Distance de la course (km)</label>
          <input id="dist" type="number" step="0.1" min="1" value={dist} onChange={(e) => setDist(e.target.value)} /></div>
        <div className="field"><label htmlFor="dp">Dénivelé positif (m)</label>
          <input id="dp" type="number" step="5" min="0" value={dplus} onChange={(e) => setDplus(e.target.value)} /></div>
        <div className="field"><label htmlFor="mg">Marge d'incertitude <span className="rv">± {margin.toFixed(2).replace(".", ",")}</span></label>
          <input id="mg" type="range" min="0" max="0.04" step="0.01" value={margin} onChange={(e) => setMargin(+e.target.value)} /></div>
      </div>
      {isFinite(t) ? (
        <div className="result">
          <div><div className="l">Temps projeté (relief inclus)</div><div className="v">{fmtTime(t)}</div>
            <div className="band" role="img" aria-label={`Fourchette de ${fmtTime(lo)} à ${fmtTime(hi)}`}><i style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }} /><b style={{ left: pos(t) }} />{obj !== null && <u style={{ left: pos(obj) }} title="objectif" />}</div></div>
          <div><div className="l">Allure</div><div className="v sm">{fmtPace(t / d)} /km</div></div>
          <div><div className="l">Par rapport à l'objectif</div>
            {gap !== null ? <><div className="v sm">{gap > 0 ? "+" : "−"}{Math.abs(gap)} s</div><p className="muted" style={{ fontSize: 13, marginTop: 6 }}>{gap > 120 ? "Objectif très ambitieux." : gap > 0 ? "Objectif tenable avec une course bien gérée." : "Objectif en réserve."}</p></> : <div className="v sm">–</div>}</div>
        </div>
      ) : <p className="empty">Saisis une distance valide.</p>}
    </>
  );
}
