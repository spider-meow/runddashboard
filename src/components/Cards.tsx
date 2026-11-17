import type { CSSProperties, ReactNode } from "react";

export type Size = "s" | "m" | "l" | "xl";
export type Item = { id: string; size: Size; tone?: "hot"; node: ReactNode };

// En-tête de page : un seul <h1>, un surtitre, et d'éventuelles actions à droite.
export function PageHeader({ eyebrow, children, actions }: { eyebrow: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <header className="top">
      <div><p className="eyebrow">{eyebrow}</p><h1 className="title">{children}</h1></div>
      {actions}
    </header>
  );
}

// Grille de cartes, rendue côté serveur. data-widget donne à chaque carte un identifiant stable (tests, agents).
export function Cards({ items }: { items: Item[] }) {
  return (
    <div className="grid">
      {items.map((it, i) => (
        <section key={it.id} className="card" data-widget={it.id} data-size={it.size} data-tone={it.tone} data-n={String(i + 1).padStart(2, "0")} style={{ "--i": i } as CSSProperties}>{it.node}</section>
      ))}
    </div>
  );
}
