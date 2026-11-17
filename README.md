# rundashboard

Dashboard de running perso, pour s'amuser. Next.js + Supabase (gratuit) + Vercel (gratuit), données Strava.

**État : phase de planification et de maquettes.** Aucun code applicatif pour l'instant.

| Quoi | Où |
|---|---|
| Plan, architecture, schéma de base, phases | [docs/PLAN.md](docs/PLAN.md) |
| Système de design (tokens, typo, motion) | [DESIGN.md](DESIGN.md) |
| Ressources tirées et ce qu'on en a gardé | [docs/RESOURCES.md](docs/RESOURCES.md) |
| Maquettes HTML cliquables | [maquettes/](maquettes/index.html) |

## Voir les maquettes

Ouvrir `maquettes/index.html` dans un navigateur. Aucun build. Les données sont synthétiques (aucun vrai tracé GPS dans ce dépôt public).

## Règle de base

Les clés Strava (`STRAVA_CLIENT_SECRET`, tokens) ne sortent jamais du serveur. Voir le plan.
