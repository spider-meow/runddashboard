import type { ReactNode } from "react";

// Un template est recréé à chaque navigation : le fondu d'entrée (CSS, opacité seule, 180 ms) rejoue donc à chaque page.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-in">{children}</div>;
}
