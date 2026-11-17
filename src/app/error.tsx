"use client";

// Erreur inattendue d'une page : un message clair et un moyen de réessayer, au lieu de la page d'erreur brute.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="stack" role="alert">
      <p className="eyebrow">Erreur</p>
      <h1 className="title">Quelque chose a <em>coincé</em></h1>
      <p>La page n&apos;a pas pu se charger, souvent parce que la base ou Strava ne répondait pas. Tes données ne sont pas touchées.</p>
      {error.digest && <p className="muted" style={{ fontSize: 13 }}>Référence : <code>{error.digest}</code></p>}
      <p style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn primary" type="button" onClick={reset}>Réessayer</button>
        <a className="btn" href="/">Retour à l&apos;accueil</a>
      </p>
    </div>
  );
}
