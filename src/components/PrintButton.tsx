"use client";

// Imprime (ou enregistre en PDF) la page : le plan de course se glisse dans une poche ou se photographie. La mise en page papier est dans app.css.
export function PrintButton({ label = "Imprimer le plan" }: { label?: string }) {
  return <button type="button" className="btn noprint" onClick={() => window.print()}>{label}</button>;
}
