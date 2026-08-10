<p align="center">
  <img src="public/favicon.png" alt="Trueshot" width="64" height="64" />
</p>

<h1 align="center">Trueshot</h1>

<p align="center">
  LoL esports analytics platform with team comparisons, player profiles, Elo rankings, and match predictions.
  <br />
  <a href="https://frederickpek.github.io/trueshot"><strong>View Live &rarr;</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-58c4dc?style=flat-square" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6-646cff?style=flat-square" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Deployed-GitHub%20Pages-222?style=flat-square" alt="GitHub Pages" />
</p>

---

## What It Does

Trueshot pulls live data from the LoL Esports API to give you a fast, data-driven read on any team or player across all tier-1 regions. No accounts, no clutter — just the numbers.

## Features

### Compare

Pick any two teams from **LCK, LPL, LEC, LCS, LCP,** or **CBLOL** and see them side by side:

- **Trueshot Elo ratings** and regional/global ranks
- **Match prediction** — Elo-based win probability bar
- **Current rosters** with clickable player cards
- **Recent match history** — wins, losses, and series scores (regional + international)
- **Head-to-head record** between the selected teams

### Elo Rankings

Interactive Elo history chart with sortable team table:

- **SVG line chart** showing Elo trajectories over time
- **Click-to-toggle** team lines with fixed color assignments
- **Region and date filters** (2025, 2026+)
- **Dynamic axis scaling** that zooms to fit selected teams

### Player Profiles

Detailed player pages with performance analytics:

- **Radar chart** with percentile-based bounds (p10-p95) across KDA, CS, Gold, Kills, and Win Rate
- **Overall performance score** (0-100)
- **Champion pool table** with win rate bars, KDA, CS, and gold per champion
- Accessible from roster cards, compare page, or global search

### Team Pages

Dedicated team pages with Trueshot Elo rank, roster, league standings, and complete match history including international tournaments.

### Match Details

Expand any series to see game-by-game breakdowns — **champion picks**, **side selection**, **objective takes** (dragons, barons, towers), and final scorelines.

### Upcoming

Upcoming matches across all regions and international tournaments with live countdown timers, filterable by league.

### Standings

League standings across all tier-1 regions for the current split.

### Global Search

Search bar in the header to quickly find any team or player across the entire dataset.

---

## Quick Start

```bash
npm install && npm run sync-data && npm run dev
```

> Full setup, data sync, and deployment docs are in [`docs/setup.md`](docs/setup.md).

---

## Supported Leagues

**Regional:** LCK, LPL, LEC, LCS, LCP, CBLOL

**International:** MSI, Worlds, EWC, First Stand, KeSPA Cup, Americas Cup, LTA Cross

---

## Data Pipeline

- **Schedule sync** runs every 8 hours via GitHub Actions
- **Elo ratings** computed per match using K=32, starting at 1200
- **Player stats** aggregated from per-game frame data with percentile distributions
- **Champion icons** synced from the LoL data dragon CDN

---

<p align="center">
  <sub>Unofficial fan project — not affiliated with or endorsed by Riot Games.</sub>
</p>
