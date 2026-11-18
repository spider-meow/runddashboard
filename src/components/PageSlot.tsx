"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { CoursesSk, HistoriqueSk, HomeSk, PageSk, ProjectionsSk } from "./Skeleton";

// Bascule immédiate vers le squelette de la page demandée : dès le clic sur un onglet, le contenu actuel laisse la place au squelette
// de la destination, sans attendre la réponse du serveur. Il disparaît quand la nouvelle page est arrivée (l'adresse change).
// Un onglet déjà préchargé répond en moins de 100 ms : on n'affiche alors aucun squelette, pour ne pas faire clignoter.
let target: string | null = null;
const listeners = new Set<() => void>();
export function showSkeletonFor(href: string | null) {
  target = href;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

const SKELETONS: Record<string, () => ReactNode> = {
  "/": () => <HomeSk />, "/historique": () => <HistoriqueSk />, "/projections": () => <ProjectionsSk />, "/courses": () => <CoursesSk />,
};

export function PageSlot({ children }: { children: ReactNode }) {
  const path = usePathname();
  const href = useSyncExternalStore(subscribe, () => target, () => null);
  const [shown, setShown] = useState<string | null>(null);

  // La page est arrivée : on referme.
  useEffect(() => { showSkeletonFor(null); }, [path]);
  // Délai de grâce avant d'afficher, et garde-fou si la navigation n'aboutit jamais (réseau coupé).
  useEffect(() => {
    if (!href) { setShown(null); return; }
    const on = setTimeout(() => setShown(href), 100), off = setTimeout(() => showSkeletonFor(null), 15000);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [href]);

  const sk = shown && shown === href ? (SKELETONS[shown] ?? (() => <PageSk />))() : null;
  return (
    <>
      <div hidden={!!sk}>{children}</div>
      {sk}
    </>
  );
}
