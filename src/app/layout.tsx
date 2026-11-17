import type { CSSProperties, ReactNode } from "react";
import "../../maquettes/assets/tokens.css";
import "../../maquettes/assets/base.css";
import "./app.css";
import { Nav } from "@/components/Nav";
import { isOwner } from "@/lib/owner";
import { onAccent } from "@/lib/prefs";
import { DEFAULT_PREFS, getPrefs } from "@/lib/queries";

export const metadata = { title: "Rundashboard" };

const FONTS = "https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600&family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=DM+Sans:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Sora:wght@500;600;700&display=swap";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const owner = await isOwner();
  const prefs = owner ? await getPrefs().catch(() => DEFAULT_PREFS) : DEFAULT_PREFS;
  const style = prefs.accent ? ({ "--accent": prefs.accent, "--on-accent": onAccent(prefs.accent) } as CSSProperties) : undefined;
  return (
    <html lang="fr" data-theme={prefs.theme} style={style}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
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
