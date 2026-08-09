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

The sync is **incremental** — it reads the existing cached schedule, fetches 1 page of new events from the API, and appends only new or updated matches. This keeps the full history intact while minimizing API calls.

The sync fetches:
- **GPR rankings** from lolesports.com
- **Team index** for all tier-1 regions
- **Schedules** for all regional and international leagues (incremental)
- **Champion icons** from DDragon (only downloads missing icons)

Updated data is committed to `public/data/` automatically. You can also run it locally:

```bash
npm run sync-data
```

### Seeding Historical Data

To populate the cache with full match history from Aug 2023 onward, run the one-time seed script:

```bash
npx tsx scripts/seed-history.ts
```

This paginates backward through the API with a 2-second delay between requests to avoid rate limits. It merges with any existing cached data, so it's safe to re-run.

### Live Data Overlay

On the client side, cached schedules are overlaid with live API data for events from today onward. This ensures match results and state changes (e.g., unstarted → completed) are reflected immediately, even before the next daily sync. The live overlay only fires for leagues that have events scheduled today, keeping API calls minimal.

## Data Sources

| Data | Source | Method |
|------|--------|--------|
| Teams, match details, rosters | [LoL Esports API](https://esports-api.lolesports.com) | Client-side fetch |
| Global Power Rankings | [lolesports.com/gpr](https://lolesports.com/en-US/gpr) | Daily GitHub Action &rarr; `public/data/gpr.json` |
| Team index & schedule cache | LoL Esports API | Daily GitHub Action &rarr; `public/data/` |
| Champion icons | [DDragon](https://ddragon.leagueoflegends.com) | Daily GitHub Action &rarr; `public/icons/champions/` |

The esports API uses the public key exposed by lolesports.com. Cached JSON in `public/data/` provides fallback if the API becomes unavailable.

## Supported Leagues

**Regional:** LCK, LPL, LEC, LCS, LCP, CBLOL

**International:** MSI, Worlds, EWC, First Stand, WQS, KeSPA Cup, Americas Cup, LTA Cross, CACG, King's Duel, Rift Legends

League slugs and IDs are configured in `src/lib/leagues.ts`. Adding a new league requires adding its slug there and in `scripts/sync-data.ts`, then running the seed or waiting for the next daily sync.

## Project Structure

```
src/
  api/          LoL Esports API client and types
  components/   UI components (Layout, TeamSelector, H2H, etc.)
  hooks/        TanStack Query hooks (useTeamData, useGameWindows)
  lib/          League helpers, match/game/roster utilities, radar bounds
  pages/        ComparePage, TeamPage, MatchPage, PlayerPage, UpcomingPage, RankingsPage
scripts/
  sync-data.ts      Incremental data sync (Actions + local)
  seed-history.ts   One-time historical data seed
public/data/        Cached JSON (GPR, teams, schedules)
public/icons/       Champion and objective icons
docs/               Documentation
```

## Tech Stack

- **React 19** with React Router v7
- **Vite 6** + **Tailwind CSS v4**
- **TanStack Query** for data fetching
- **TypeScript 5.7**
- **GitHub Pages** for hosting
