"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Infobulle des graphiques : survol à la souris, toucher au doigt. Les éléments du graphique portent leur texte dans data-tip.
// Un toucher sur une barre l'affiche, un toucher ailleurs (ou un défilement) la ferme. Le graphique reste décrit en entier par aria-label.
export function Tip({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tip) return;
    const off = (e: Event) => { if (!box.current?.contains(e.target as Node)) setTip(null); };
    const close = () => setTip(null);
    document.addEventListener("pointerdown", off);
    window.addEventListener("scroll", close, { passive: true });
    return () => { document.removeEventListener("pointerdown", off); window.removeEventListener("scroll", close); };
  }, [tip]);

  const show = (e: React.PointerEvent) => {
    const el = (e.target as Element).closest?.("[data-tip]");
    const rect = box.current?.getBoundingClientRect();
    if (!el || !rect) { if (e.pointerType === "mouse") setTip(null); return; }
    setTip({ text: el.getAttribute("data-tip") ?? "", x: Math.min(Math.max(e.clientX - rect.left, 60), rect.width - 60), y: e.clientY - rect.top });
  };

  return (
    <div ref={box} className="tipbox" onPointerMove={(e) => e.pointerType === "mouse" && show(e)} onPointerDown={show} onPointerLeave={(e) => e.pointerType === "mouse" && setTip(null)}>
      {children}
      <div className={"tip2" + (tip ? " on" : "")} style={tip ? { left: tip.x, top: tip.y } : undefined} aria-hidden="true">{tip?.text}</div>
    </div>
  );
}
