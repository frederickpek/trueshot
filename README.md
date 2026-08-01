# Trueshot

A static web app for comparing League of Legends esports teams — recent matches, Global Power Rankings, rosters, head-to-head history, and per-series scorelines.

**Live site:** [frederickpek.github.io/trueshot](https://frederickpek.github.io/trueshot)

> Unofficial fan project — not affiliated with or endorsed by Riot Games.

## Features

- Compare any two tier-1 teams (LCK, LPL, LEC, LCS, LCP, CBLOL)
- Global Power Rankings (GPR) power scores and ranks
- Current rosters with player roles
- Recent match history with W/L and series scores
- Head-to-head history between selected teams
- Expandable game-by-game scorelines
- Team detail pages at `/team/:slug`

## Data sources

| Data | Source | How |
|------|--------|-----|
| Teams, schedules, match details, rosters | [LoL Esports API](https://esports-api.lolesports.com) (unofficial) | Client-side fetch (CORS enabled) |
| Global Power Rankings | [lolesports.com/gpr](https://lolesports.com/en-US/gpr) | Daily GitHub Action cache → `public/data/gpr.json` |
| Team index & schedule cache | Same APIs | Daily GitHub Action → `public/data/` |

The esports API uses the public key exposed by lolesports.com. If Riot changes or restricts this API, cached JSON in `public/data/` provides fallback for schedules and GPR.

## Local development

```bash
npm install
npm run sync-data   # fetch latest GPR + team index + schedule cache
npm run dev         # http://localhost:5173/trueshot/
```

## Build

```bash
npm run build       # outputs to dist/
npm run preview     # preview production build
```

## GitHub Pages setup

1. Push to `master` (or `main`)
2. In repo **Settings → Pages**, set source to **GitHub Actions**
3. The deploy workflow (`.github/workflows/deploy.yml`) runs on push and publishes `dist/`

If your repo is not at `username.github.io/trueshot`, update `base` in [`vite.config.ts`](vite.config.ts).

## Data sync (GitHub Actions)

`.github/workflows/sync-data.yml` runs daily at 06:00 UTC (and on manual dispatch):

- Fetches GPR rankings from lolesports.com
- Builds team index for all tier-1 regions
- Caches recent schedules per league
- Commits changes to `public/data/` if updated

Run locally anytime:

```bash
npm run sync-data
```

## Project structure

```
src/
  api/          LoL Esports API client + types
  components/   UI components
  hooks/        TanStack Query hooks
  lib/          League helpers, match utilities
  pages/        Compare + Team pages
scripts/
  sync-data.ts  Data sync for Actions + local dev
public/data/    Cached JSON (GPR, teams, schedules)
```

## Roadmap (v2)

- Per-game player stats (KDA, CS, champions) via livestats API cache
- International tournament cross-region H2H
- Standings charts and form streaks
