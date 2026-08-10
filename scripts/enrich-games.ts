import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const API_BASE = 'https://esports-api.lolesports.com/persisted/gw'
const API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z'
const DELAY_MS = 300

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`)
  url.searchParams.set('hl', 'en-US')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const response = await fetch(url.toString(), {
    headers: { 'x-api-key': API_KEY },
  })
  if (!response.ok) throw new Error(`API error ${response.status}`)
  return response.json() as Promise<T>
}

interface EventDetailsTeam {
  id: string
  name: string
  code: string
  result: { gameWins: number }
}

interface EventDetailsGame {
  number: number
  id: string
  state: string
  teams: Array<{ id: string; side: string }>
}

async function main() {
  const root = join(import.meta.dirname, '..')
  const gamesDir = join(root, 'data', 'games')

  const files = (await readdir(gamesDir)).filter((f) => f.endsWith('.json'))
  console.log(`Found ${files.length} match files\n`)

  let enriched = 0
  let alreadyDone = 0
  let failed = 0
  const startTime = Date.now()

  for (let i = 0; i < files.length; i++) {
    const filePath = join(gamesDir, files[i])
    const raw = await readFile(filePath, 'utf-8')
    const match = JSON.parse(raw)

    // Skip if already enriched
    if (match.teams?.[0]?.id) {
      alreadyDone++
      continue
    }

    await sleep(DELAY_MS)

    try {
      const details = await apiFetch<{
        data: {
          event: {
            match: {
              teams: EventDetailsTeam[]
              games: EventDetailsGame[]
            }
          }
        }
      }>('getEventDetails', { id: match.matchId })

      const detailTeams = details.data.event.match.teams
      const detailGames = details.data.event.match.games

      // Enrich match-level teams with IDs
      for (const mt of match.teams) {
        const dt = detailTeams.find((t) => t.code === mt.code)
        if (dt) {
          mt.id = dt.id
        }
      }

      // Enrich each game with per-game team sides
      for (const dg of detailGames) {
        const localGame = match.games.find(
          (g: { gameId: string }) => g.gameId === dg.id,
        )
        if (localGame) {
          localGame.teams = dg.teams
        }
      }

      await writeFile(filePath, JSON.stringify(match, null, 2) + '\n')
      enriched++
    } catch (err) {
      failed++
      console.warn(`  ✗ ${files[i]}: ${err}`)
    }

    if ((enriched + failed) % 100 === 0) {
      const elapsed = (Date.now() - startTime) / 1000
      const rate = (enriched + failed) / elapsed
      const remaining = (files.length - alreadyDone - enriched - failed) / rate / 60
      console.log(`  [${enriched + failed + alreadyDone}/${files.length}] enriched=${enriched} skipped=${alreadyDone} failed=${failed} | ~${remaining.toFixed(0)}m remaining`)
    }
  }

  console.log(`\n=== Done ===`)
  console.log(`Enriched: ${enriched}`)
  console.log(`Already done: ${alreadyDone}`)
  console.log(`Failed: ${failed}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
