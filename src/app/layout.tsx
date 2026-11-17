import type { ReactNode } from "react";
import "../../maquettes/assets/tokens.css";
import "../../maquettes/assets/base.css";
import "./app.css";

export const metadata = { title: "Rundashboard" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
