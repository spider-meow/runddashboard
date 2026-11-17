"use client";

import { useEffect, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { savePrefs } from "@/app/actions";
import { isHexColor, mergeWidgets, onAccent, SIZES, THEMES, type Size, type Theme, type Widget } from "@/lib/prefs";

export type Item = { id: string; label: string; size: Size; tone?: "hot"; node: ReactNode };

const SWATCH: Record<Theme, [string, string, string]> = { poster: ["#0c0c0c", "#c8f031", "#f6f6f2"], sunrise: ["#fdf0e6", "#ffc933", "#cf3705"], midnight: ["#0a0f1e", "#1a2440", "#f0602f"] };
const NAME: Record<Theme, string> = { poster: "Poster", sunrise: "Sunrise", midnight: "Midnight" };
const ACCENTS = ["#c8f031", "#cf3705", "#f0602f", "#2a6fdb", "#1f9d6b", "#a63fd0"];

const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
const I = { up: "M6 15l6-6 6 6", down: "M6 9l6 6 6-6", size: "M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6", eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", off: "M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.7M6.6 6.7A17 17 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 4.2-1", grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" };

// En-tête de page + grille de widgets personnalisable (afficher, masquer, réordonner, redimensionner) + thème et accent.
// Les widgets sont rendus côté serveur et passés en props ; ce composant ne gère que la disposition.
export function Dashboard({ page, header, items, saved, theme: theme0, accent: accent0 }: { page: string; header: ReactNode; items: Item[]; saved?: Widget[]; theme: Theme; accent: string | null }) {
  const defaults = items.map((i): Widget => ({ id: i.id, visible: true, size: i.size }));
  const [widgets, setWidgets] = useState(() => mergeWidgets(saved, defaults));
  const [theme, setTheme] = useState(theme0);
  const [accent, setAccent] = useState(accent0);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));

  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, []);

  const applyTheme = (t: Theme) => { document.documentElement.dataset.theme = t; };
  const applyAccent = (a: string | null) => {
    const s = document.documentElement.style;
    if (a) { s.setProperty("--accent", a); s.setProperty("--on-accent", onAccent(a)); } else { s.removeProperty("--accent"); s.removeProperty("--on-accent"); }
  };
  const [failed, setFailed] = useState(false);
  const [drag, setDrag] = useState<number | null>(null); // widget en cours de glisser-déposer
  // L'affichage change tout de suite ; si l'enregistrement échoue (migration 0002 pas appliquée, base injoignable), on le dit.
  const save = (p: { widgets?: Widget[]; theme?: Theme; accent?: string | null }) =>
    start(async () => { try { await savePrefs({ page, ...p }); setFailed(false); } catch { setFailed(true); } });

  const edit = (i: number, f: (w: Widget[]) => void) => { const next = widgets.map((w) => ({ ...w })); f(next); setWidgets(next); save({ widgets: next }); };
  const pickTheme = (t: Theme) => { setTheme(t); applyTheme(t); save({ theme: t }); };
  const pickAccent = (a: string | null) => { setAccent(a); applyAccent(a); save({ accent: a }); };
  const reset = () => { setWidgets(defaults); setTheme("poster"); setAccent(null); applyTheme("poster"); applyAccent(null); save({ widgets: defaults, theme: "poster", accent: null }); };

  return (
    <>
      <header className="top">
        {header}
        <button className="btn" type="button" onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
          Personnaliser
        </button>
      </header>

      <div className="grid">
        {widgets.map((w, i) => {
          const it = byId[w.id];
          return <section key={w.id} className="card" data-size={w.size} data-tone={it.tone} hidden={!w.visible} style={{ "--i": i } as CSSProperties}>{it.node}</section>;
        })}
      </div>

      <div className={"scrim" + (open ? " on" : "")} onClick={() => setOpen(false)} />
      <aside className={"drawer" + (open ? " open" : "")} role="dialog" aria-label="Personnaliser" aria-hidden={!open}>
        <h3>Personnaliser</h3>
        <h4>Thème</h4>
        <div className="themes">
          {THEMES.map((t) => (
            <button key={t} type="button" className="theme-opt" aria-pressed={t === theme} onClick={() => pickTheme(t)}>
              <div className="sw">{SWATCH[t].map((c) => <i key={c} style={{ background: c }} />)}</div>{NAME[t]}
            </button>
          ))}
        </div>
        <h4>Couleur d'accent</h4>
        <div className="accents">
          {ACCENTS.map((c) => <button key={c} type="button" style={{ background: c }} aria-label={`Accent ${c}`} aria-pressed={c === accent} onClick={() => pickAccent(c)} />)}
          <input type="color" aria-label="Couleur libre" value={accent ?? "#c8f031"} onChange={(e) => { setAccent(e.target.value); applyAccent(e.target.value); }} onBlur={(e) => isHexColor(e.target.value) && accent && save({ accent })} />
        </div>
        <h4>Widgets de cette page</h4>
        <ul className="wlist">
          {widgets.map((w, i) => (
            <li key={w.id} draggable className={drag === i ? "drag" : undefined}
              onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)} onDragOver={(e) => e.preventDefault()}
              onDrop={() => { const from = drag; setDrag(null); if (from !== null && from !== i) edit(i, (n) => { n.splice(i, 0, n.splice(from, 1)[0]); }); }}>
              <span className="grab" aria-hidden="true"><Icon d={I.grip} /></span>
              <span className="name">{byId[w.id].label}</span>
              <button type="button" aria-label={`Changer la taille (${w.size.toUpperCase()})`} title={`Taille : ${w.size.toUpperCase()}`} onClick={() => edit(i, (n) => { n[i].size = SIZES[(SIZES.indexOf(n[i].size) + 1) % SIZES.length]; })}><Icon d={I.size} /></button>
              <button type="button" aria-label="Monter" disabled={i === 0} onClick={() => edit(i, (n) => { [n[i - 1], n[i]] = [n[i], n[i - 1]]; })}><Icon d={I.up} /></button>
              <button type="button" aria-label="Descendre" disabled={i === widgets.length - 1} onClick={() => edit(i, (n) => { [n[i + 1], n[i]] = [n[i], n[i + 1]]; })}><Icon d={I.down} /></button>
              <button type="button" aria-label={w.visible ? "Masquer" : "Afficher"} aria-pressed={w.visible} onClick={() => edit(i, (n) => { n[i].visible = !n[i].visible; })}><Icon d={w.visible ? I.eye : I.off} /></button>
            </li>
          ))}
        </ul>
        <p className="drawer-foot">
          <button className="btn" type="button" onClick={reset}>Réinitialiser</button>{" "}
          <button className="btn primary" type="button" onClick={() => setOpen(false)}>Fermer</button>
        </p>
        <p className="drawer-note" aria-live="polite">{pending ? "Enregistrement…" : failed ? "Enregistrement impossible : la migration 0002 est-elle appliquée ?" : "Enregistré dans ta base."}</p>
      </aside>
    </>
  );
}
