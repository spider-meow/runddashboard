import { Anton, Barlow, Bricolage_Grotesque, DM_Sans, Geist_Mono, Sora } from "next/font/google";
import type { CSSProperties, ReactNode } from "react";
import "../../maquettes/assets/tokens.css";
import "../../maquettes/assets/base.css";
import "./app.css";
import { Nav } from "@/components/Nav";
import { isOwner } from "@/lib/owner";
import { onAccent } from "@/lib/prefs";
import { DEFAULT_PREFS, getPrefs } from "@/lib/queries";

export const metadata = { title: "Rundashboard" };

// Polices hébergées par l'app (téléchargées au build) : plus de feuille de style Google bloquant l'affichage, plus de tiers qui voit les visites.
// Seules celles du thème Poster (défaut) sont préchargées ; les autres ne sont téléchargées que si leur thème est choisi.
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--f-anton", display: "swap" });
const barlow = Barlow({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--f-barlow", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--f-mono", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz"], variable: "--f-bricolage", display: "swap", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--f-dmsans", display: "swap", preload: false });
const sora = Sora({ subsets: ["latin"], variable: "--f-sora", display: "swap", preload: false });
const fontVars = [anton, barlow, mono, bricolage, dmSans, sora].map((f) => f.variable).join(" ");

export default async function RootLayout({ children }: { children: ReactNode }) {
  const owner = await isOwner();
  const prefs = owner ? await getPrefs().catch(() => DEFAULT_PREFS) : DEFAULT_PREFS;
  const style = prefs.accent ? ({ "--accent": prefs.accent, "--on-accent": onAccent(prefs.accent) } as CSSProperties) : undefined;
  return (
    <html lang="fr" data-theme={prefs.theme} style={style} className={fontVars}>
      <body>
        {owner ? (
          <>
            <div className="shell"><Nav position="rail" /><main>{children}</main></div>
            <Nav position="tabbar" />
          </>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}
