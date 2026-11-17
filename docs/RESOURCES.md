# Ressources

Dépôts clonés hors du projet (rien n'en est committé ici, licences et poids différents). Ce qu'on en retient :

| Ressource | Source | Installé / utilisé | Ce qu'on garde |
|---|---|---|---|
| Ponytail | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT) | 6 skills copiés dans `~/.gemini/antigravity/skills/` (`ponytail`, `-audit`, `-debt`, `-gain`, `-help`, `-review`) | Règle de travail : plus petit changement complet. Toute la phase code suit ça (YAGNI, pas d'abstraction sans besoin). |
| Taste Skill | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | copié dans `~/.gemini/antigravity/skills/design-taste-frontend/` (nom du `SKILL.md`) | Anti-slop : typo, mouvement, direction artistique. C'est un skill pensé pour des sites vitrine ; ses règles « une section par écran » et « photos d'abord » ne s'appliquent pas à un dashboard. On n'utilise pas son gate. |
| Awesome DESIGN.md | [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (MIT) | `Oura` et `Linear` copiés dans `docs/design-refs/` | Format du `DESIGN.md` racine (tokens en frontmatter). Palette chaude type Oura, rigueur type Linear. |
| limiar-app | [sergioctf/limiar-app](https://github.com/sergioctf/limiar-app) | lecture seule | Riegel (`T2 = T1 × (D2/D1)^1.06`), connexion Strava avec refresh de token, cron de sync. |

## Non résolu

**StravaDashboard** : la recherche GitHub ne renvoie que des homonymes à 0 étoile, aucun ne combine Next.js, Supabase, Riegel et suivi des chaussures. Lien à fournir par toi. En attendant, le suivi des chaussures vient de l'objet `gear` de l'API Strava (voir plan, phase 5).

## Remarques sur l'installation Antigravity

Le dossier global `~/.gemini/antigravity/skills/` n'existait pas, je l'ai créé. Les READMEs de Ponytail et Taste ne documentent pas ce chemin pour Antigravity (Ponytail mentionne un repli via `AGENTS.md`). Si Antigravity ne les voit pas, les déposer dans `.agent/skills/` du projet.
