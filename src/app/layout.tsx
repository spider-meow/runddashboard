import { Anton, Barlow, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "../../maquettes/assets/tokens.css";
import "../../maquettes/assets/base.css";
import "./app.css";
import { Nav } from "@/components/Nav";
import { isOwner } from "@/lib/owner";

export const metadata = { title: { default: "Rundashboard", template: "%s · Rundashboard" }, robots: { index: false, follow: false } };

// Polices hébergées par l'app (téléchargées au build) : pas de feuille Google bloquant l'affichage, pas de tiers qui voit les visites.
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--f-anton", display: "swap" });
const barlow = Barlow({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--f-barlow", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--f-mono", display: "swap" });

// Un seul thème : Poster, avec son accent d'origine. L'attribut data-theme sert aux jetons de couleur de tokens.css.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const owner = await isOwner();
  return (
    <html lang="fr" data-theme="poster" className={[anton, barlow, mono].map((f) => f.variable).join(" ")}>
      <body>
        <a className="skip" href="#contenu">Aller au contenu</a>
        {owner ? (
          <>
            <div className="shell"><Nav position="rail" /><main id="contenu" tabIndex={-1}>{children}</main></div>
            <Nav position="tabbar" />
          </>
        ) : (
          <main id="contenu" tabIndex={-1}>{children}</main>
        )}
      </body>
    </html>
  );
}
