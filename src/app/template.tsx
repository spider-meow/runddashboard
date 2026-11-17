import type { ReactNode } from "react";

// Un template est recréé à chaque navigation : le fondu d'entrée (CSS, opacité seule, 180 ms) rejoue donc à chaque page.
// <ViewTransition> de React a été essayé : le contenu d'une page restait bloqué derrière le squelette tant que le navigateur ne
// peignait pas d'images (onglet en arrière-plan), ce qui est pire qu'une transition en moins. Pas de dépendance à l'API.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-in">{children}</div>;
}
