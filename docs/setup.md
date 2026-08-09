# Setup & Development

## Prerequisites

- **Node.js** 22+
- **npm** (comes with Node)

## Local Development

```bash
npm install
npm run sync-data   # fetch latest GPR, team index, and schedule cache
npm run dev         # starts dev server at http://localhost:5173/trueshot/
```

## Build & Preview

```bash
npm run build       # compiles TypeScript and outputs to dist/
npm run preview     # preview the production build locally
```

## Deploying to GitHub Pages

1. Push to `master`
2. In your repo **Settings > Pages**, set the source to **GitHub Actions**
3. The workflow at `.github/workflows/deploy.yml` runs on every push and publishes `dist/`

If your repo lives at a different path than `/trueshot/`, update `base` in [`vite.config.ts`](../vite.config.ts).

## Data Sync

Esports data is synced via GitHub Actions (`.github/workflows/sync-data.yml`) on a daily schedule at 06:00 UTC and on manual dispatch.

The sync fetches:
- **GPR rankings** from lolesports.com
- **Team index** for all tier-1 regions
- **Recent schedules** per league

Updated data is committed to `public/data/` automatically. You can also run it locally:

```bash
npm run sync-data
```

## Data Sources

| Data | Source | Method |
|------|--------|--------|
| Teams, schedules, match details, rosters | [LoL Esports API](https://esports-api.lolesports.com) | Client-side fetch |
| Global Power Rankings | [lolesports.com/gpr](https://lolesports.com/en-US/gpr) | Daily GitHub Action &rarr; `public/data/gpr.json` |
| Team index & schedule cache | LoL Esports API | Daily GitHub Action &rarr; `public/data/` |

The esports API uses the public key exposed by lolesports.com. Cached JSON in `public/data/` provides fallback if the API becomes unavailable.

## Project Structure

```
src/
  api/          LoL Esports API client and types
  components/   UI components (Layout, TeamSelector, H2H, etc.)
  hooks/        TanStack Query hooks (useTeamData, useGameWindows)
  lib/          League helpers, match/game/roster utilities
  pages/        ComparePage, TeamPage, MatchPage
scripts/
  sync-data.ts  Data sync script (Actions + local)
public/data/    Cached JSON (GPR, teams, schedules)
docs/           Documentation
```

## Tech Stack

- **React 19** with React Router v7
- **Vite 6** + **Tailwind CSS v4**
- **TanStack Query** for data fetching
- **TypeScript 5.7**
- **GitHub Pages** for hosting
