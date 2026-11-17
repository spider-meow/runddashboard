---
version: alpha
name: Rundashboard
description: Un dashboard de running chaud et éditorial. Papier ou charbon, un seul accent braise, de grands chiffres en serif, des données en mono, un tracé qui se dessine. Tout est piloté par des variables CSS, donc thèmes et couleurs sont modifiables par l'utilisateur.
inspiration: Oura (palette chaude, serif éditorial) et Linear (rigueur, densité), via VoltAgent/awesome-design-md. Voir docs/design-refs/.

themes:
  ember:            # défaut, sombre
    bg: "#14110f"
    surface: "#1c1815"
    surface-2: "#26201c"
    hairline: "#332c27"
    ink: "#f4ede4"
    ink-2: "#bdb2a5"
    mute: "#9a8e81"
    accent: "#ea5b2e"
    on-accent: "#14110f"
    series-2: "#4a98d6"
  paper:            # clair, chaud
    bg: "#f7f1e8"
    surface: "#fffdf9"
    surface-2: "#f0e9de"
    hairline: "#e1dcd3"
    ink: "#1c1b1a"
    ink-2: "#52504b"
    mute: "#6e6b65"
    accent: "#d8481f"
    on-accent: "#ffffff"
    series-2: "#2a78d6"
    good: "#1f7a52"   # statuts propres au thème clair
    warn: "#8a5d00"
    bad: "#b83225"
  nocturne:         # sombre, froid
    bg: "#0b0d12"
    surface: "#12151c"
    surface-2: "#1a1e27"
    hairline: "#252a35"
    ink: "#e8ecf4"
    ink-2: "#a4adbd"
    mute: "#8590a3"
    accent: "#5b8def"
    on-accent: "#0b0d12"
    series-2: "#d9693f"
status:             # défauts sombres ; le thème clair a les siens (contraste ≥ 4,5:1). Toujours avec libellé, jamais la couleur seule.
  good: "#4fbf86"
  warn: "#e3a93f"
  bad: "#e5604d"

typography:
  display:  { family: "Fraunces", weight: 400, use: "gros chiffres, titres d'écran", opsz: auto }
  ui:       { family: "Geist", fallback: "Inter, system-ui", weights: [400, 500, 600] }
  numeric:  { family: "Geist Mono", fallback: "ui-monospace", features: "tabular-nums", use: "allures, temps, tableaux" }
  scale:    [12, 14, 16, 20, 28, 44, 72]   # px, base 16, interligne ~1.5 sur le texte courant

spacing: [4, 8, 12, 16, 24, 32, 48, 72]
radius:  { card: 20, control: 12, pill: 999 }
elevation: "aucune ombre portée en sombre ; bordure hairline 1px. En clair : ombre très douce."

motion:
  ease: "cubic-bezier(.2,.7,.2,1)"
  durations: { micro: 140, ui: 240, enter: 480, draw: 2200 }
  rules:
    - "Le tracé d'une course se dessine une fois (stroke-dashoffset), 2,2 s, quand la carte entre dans l'écran."
    - "Les barres et courbes montent à l'entrée. Rien ne boucle."
    - "Animer seulement transform et opacity (et stroke-dashoffset). Sorties plus rapides que les entrées."
    - "prefers-reduced-motion : tout est affiché directement, sans animation."

components:
  card: "surface, radius card, bordure hairline, padding 24"
  widget: "card + poignée de réordonnancement + bouton masquer en mode édition"
  stat: "libellé 12px ink-2 en capitales espacées, valeur display 44 ou 72, unité mono mute"
  chart: "traits 2px, grille hairline, légende directe, infobulle au survol (crosshair), jamais d'axe double"

rules:
  - "Aucune valeur de couleur brute dans un composant : uniquement des variables."
  - "Le texte n'a jamais la couleur d'une série : la couleur est portée par une puce à côté."
  - "Contraste texte ≥ 4,5:1. Cibles tactiles ≥ 44px. Focus visible partout."
  - "Pas d'emoji comme icône. Un seul jeu d'icônes SVG au trait de 1,5px."
  - "Éviter : dégradés génériques, cartes identiques empilées, ombres lourdes, violet par défaut."

validation:
  charts: "Paires de séries validées avec le validateur de palette du skill dataviz, en mode sombre et clair (écart daltonien ≥ 22, plancher vision normale ≥ 28)."
---

# Rundashboard — design

Le tableau ci-dessus est la source de vérité. En pratique :

- **Trois thèmes livrés** (Ember, Paper, Nocturne) + un sélecteur d'accent libre. L'accent doit rester dans la bande de luminosité des graphiques : si l'utilisateur choisit une couleur trop claire ou trop terne, l'interface la corrige (voir la phase 7 du plan).
- **Personnalisation** : chaque widget a `visible`, `order`, `size`. Le mode édition montre des poignées ; l'état est sauvegardé dans `user_prefs`.
- **Taste Skill** sert de garde-fou artistique (typo travaillée, pas d'interface générique) mais ses règles de page vitrine ne s'appliquent pas ici.
