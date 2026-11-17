import Link from "next/link";

export const metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <div className="stack">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="title">Page <em>introuvable</em></h1>
      <p>Cette page n&apos;existe pas, ou la course a été supprimée.</p>
      <p style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="btn primary" href="/">Accueil</Link>
        <Link className="btn" href="/courses">Mes courses</Link>
      </p>
    </div>
  );
}
