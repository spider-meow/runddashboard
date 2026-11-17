"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const icon = (d: ReactNode) => <svg viewBox="0 0 24 24" aria-hidden="true">{d}</svg>;
const ITEMS: [string, string, ReactNode][] = [
  ["/", "Accueil", icon(<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />)],
  ["/historique", "Historique", icon(<path d="M4 19V9M10 19V5M16 19v-7M21 19H3" />)],
  ["/projections", "Projections", icon(<path d="M3 17l6-6 4 4 8-8M15 7h6v6" />)],
  ["/courses", "Courses", icon(<path d="M5 21V4M5 4h11l-2 4 2 4H5" />)],
  ["/donnees", "Données", icon(<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />)],
];

// Retour immédiat au clic : la page suivante est dynamique (lecture en base), le lien clignote pendant qu'elle arrive.
function Pending() {
  const { pending } = useLinkStatus();
  return <i aria-hidden="true" className={"nav-pending" + (pending ? " on" : "")} />;
}

// Navigation : icône + libellé visible (une icône seule est ambiguë), page courante annoncée par aria-current.
export function Nav({ position }: { position: "rail" | "tabbar" }) {
  const path = usePathname();
  const links = ITEMS.map(([href, label, svg]) => {
    const current = href === "/" ? path === "/" : path.startsWith(href);
    return <Link key={href} href={href} aria-current={current ? "page" : undefined}>{svg}<span>{label}</span><Pending /></Link>;
  });
  return position === "rail"
    ? <nav className="rail" aria-label="Navigation principale"><div className="logo" aria-hidden="true">rd</div>{links}</nav>
    : <nav className="tabbar" aria-label="Navigation principale (mobile)">{links}</nav>;
}
