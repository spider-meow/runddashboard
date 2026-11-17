---
version: alpha
name: Rundashboard
description: Un dashboard de running énergique. Grosses typos, chiffres énormes, une carte de couleur vive par écran, un tracé qui se dessine. Tout passe par des variables CSS : thèmes et accent modifiables par l'utilisateur.
inspiration: Dribbble (tags « running dashboard » et « strava ») : tuiles de couleur vive, chiffres géants, photo et carte comme héros. Voir docs/RESOURCES.md.

themes:
  sunrise:            # clair
    bg: "#fdf0e6"
    surface: "#ffffff"
    surface-2: "#fff6ee"
    hairline: "#f0dccb"
    ink: "#1b1613"
    ink-2: "#5c4d43"
    mute: "#7a6a5e"
    accent: "#cf3705"
    on-accent: "#ffffff"
    series-2: "#2a6fdb"
    hot: { bg: "#ffc933", fg: "#1b1613" }
    status: { good: "#1f7a52", warn: "#8a5d00", bad: "#b83225" }
    type: { display: "Bricolage Grotesque 700", ui: "DM Sans", radius: 28 }
  midnight:           # sombre
    bg: "#0a0f1e"
    surface: "#121a2f"
    surface-2: "#1a2440"
    hairline: "#243055"
    ink: "#eef2ff"
    ink-2: "#aab4d4"
    mute: "#8591b5"
    accent: "#f0602f"
    on-accent: "#0a0f1e"
    series-2: "#3b8bcf"
    hot: { bg: "linear-gradient(135deg, #ff7a2b, #ff3d71)", fg: "#0a0f1e" }
    status: { good: "#4fbf86", warn: "#e3a93f", bad: "#ff7a6b" }
    type: { display: "Sora 600", ui: "DM Sans", radius: 24 }
  poster:             # DÉFAUT (choisi) : sombre, affiche
    bg: "#0c0c0c"
    surface: "#151515"
    surface-2: "#1f1f1f"
    hairline: "#2c2c2c"
    ink: "#f6f6f2"
    ink-2: "#b4b4ac"
    mute: "#8d8d85"
    accent: "#c8f031"
    on-accent: "#0c0c0c"
    series-2: "#f6f6f2"
    hot: { bg: "#c8f031", fg: "#0c0c0c" }
    status: { good: "#4fbf86", warn: "#e3a93f", bad: "#ff7a6b" }
    type: { display: "Anton, majuscules", ui: "Barlow", radius: 6 }

typography:
  numeric: { family: "Geist Mono", features: "tabular-nums", use: "allures, temps, tableaux, axes" }
  scale: [12, 14, 16, 20, 28, 44, 72]

spacing: [4, 8, 12, 16, 24, 32, 48]
motion:
  ease: "cubic-bezier(.2,.7,.2,1)"
  durations: { micro: 140, ui: 240, enter: 480, draw: 2200 }
  rules:
    - "Le tracé se dessine une fois (stroke-dashoffset, 2,2 s) à l'entrée dans l'écran. Barres et courbes montent une fois. Rien ne boucle."
    - "Animer transform, opacity et stroke-dashoffset seulement."
    - "prefers-reduced-motion : tout est affiché directement."

components:
  card: "surface, rayon du thème, padding 24"
  hot-card: "data-tone=\"hot\" : une seule carte colorée par écran, pour le chiffre qui compte (compte à rebours, volume des 4 semaines, projection)"
  stat: "libellé 12px capitales espacées, valeur en police display, unité en mono"
  chart: "traits 2px, grille discrète, infobulle au survol, jamais d'axe double"

rules:
  - "Aucune couleur brute dans un composant : uniquement des variables."
  - "Contraste texte ≥ 4,5:1 (vérifié sur les trois thèmes). Cibles tactiles ≥ 44px. Focus visible."
  - "Pas d'emoji comme icône. Un seul jeu d'icônes SVG au trait de 1,5px."
  - "Poster : l'accent volt sort de la bande de luminosité des palettes de séries. Acceptable ici : une seule série par graphique, contraste 13:1."
---

# Rundashboard — design

Le bloc ci-dessus est la source de vérité. **Poster** (noir et volt, majuscules) est le thème par défaut, choisi par l'utilisateur. **Sunrise** (clair, tuile jaune) et **Midnight** (sombre, dégradé orange-rose) restent disponibles dans « Personnaliser ».

Chaque thème règle aussi la police, le rayon et le poids des titres : changer de thème change le caractère de l'interface, pas seulement les couleurs. L'accent reste modifiable.
