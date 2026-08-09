<p align="center">
  <img src="public/favicon.png" alt="Trueshot" width="64" height="64" />
</p>

<h1 align="center">Trueshot</h1>

<p align="center">
  Side-by-side team comparison across every tier-1 LoL esports league.
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

Trueshot pulls live data from the LoL Esports API and Global Power Rankings to give you a fast, cross-region read on any two teams. No accounts, no clutter — just the numbers.

## Features

### Compare

Pick any two teams from **LCK, LPL, LEC, LCS, LCP,** or **CBLOL** and see them side by side:

- **GPR power scores** and global ranks
- **Current rosters** with player roles
- **Recent match history** — wins, losses, and series scores
- **Head-to-head record** between the selected teams

### Team

Dedicated team pages with full roster, league standings, and complete match history for the current split.

### Match

Expand any series to see game-by-game breakdowns — **champion picks**, **side selection**, **objective takes** (dragons, barons, towers), and final scorelines.

---

## Quick Start

```bash
npm install && npm run sync-data && npm run dev
```

> Full setup, build, data sync, and deployment docs are in [`docs/setup.md`](docs/setup.md).

---

## Roadmap

- Per-game player stats (KDA, CS, champions) via livestats API cache
- Match prediction scoring between any two teams
- International tournament cross-region head-to-head
- Standings charts and form streaks

---

<p align="center">
  <sub>Unofficial fan project — not affiliated with or endorsed by Riot Games.</sub>
</p>
