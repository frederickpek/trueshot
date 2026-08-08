# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Casual LoL esports fans checking team stats pre-match, dedicated esports followers who track standings and compare teams across regions regularly, and fantasy/betting analysts who use stats for match predictions. Browsing context is typically evening/night on desktop or phone.

## Product Purpose

Trueshot is a LoL esports team stats tool focused on quick cross-region team comparison. It combines official match data with Global Power Rankings to give users a fast read on any two teams' relative strength, recent form, and head-to-head history. The intended evolution includes match prediction scoring for independent games between two teams.

## Positioning

Side-by-side team comparison across all tier-1 regions in one view — lolesports.com and most stat sites don't surface this well. GPR integration alongside match records gives a composite read no single source provides.

## Capabilities and Constraints

Three pages: Compare (home — pick two teams, see side-by-side stats and head-to-head), Team (individual team detail with roster, standings, match history), Match (series detail with per-game champion picks and sides). Data sourced from LoL Esports API and Global Power Rankings; synced daily via GitHub Actions. Static SPA deployed to GitHub Pages — no backend, no auth. Prediction scoring is a confirmed future feature, not yet implemented.

## Evidence on Hand

Cached JSON data for 6 tier-1 leagues (LCK, LPL, LEC, LCS, LCP, CBLOL). Team logos and player headshots served from LoL Esports CDN. GPR data with global and regional rankings. No proprietary assets, testimonials, or brand materials beyond the "Trueshot" name.

## Product Principles

1. Comparison is the core interaction — every design choice should make two-team evaluation faster and clearer.
2. Data density over decoration — show the numbers, don't hide them behind interactions.
3. Cross-region is the differentiator — the app must treat all major leagues as first-class.
