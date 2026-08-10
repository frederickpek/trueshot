import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const API_BASE = 'https://esports-api.lolesports.com/persisted/gw'
const API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z'
const LIVESTATS_BASE = 'https://feed.lolesports.com/livestats/v1/window'
const DELAY_MS = 500

interface ScheduleEvent {
  startTime: string
  state: string
  type: string
  league: { name: string; slug: string }
  match: {
    id: string
    teams: Array<{ name: string; code: string }>
    strategy: { type: string; count: number }
  }
}

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

  if (!response.ok) {
    throw new Error(`API error ${response.status} for ${path}`)
  }

  return response.json() as Promise<T>
}

async function getEventDetails(matchId: string) {
  const data = await apiFetch<{
    data: {
      event: {
        match: {
          games: Array<{ number: number; id: string; state: string }>
        }
      }
    }
  }>('getEventDetails', { id: matchId })
  return data.data.event.match.games
}

async function getGameWindow(gameId: string, startingTime: string, retries = 2): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const url = `${LIVESTATS_BASE}/${gameId}?startingTime=${startingTime}`
    const response = await fetch(url)
    if (response.status === 400 || response.status === 404) {
      throw new Error(`LiveStats ${response.status} — no data available`)
    }
    if (!response.ok) {
      throw new Error(`LiveStats error ${response.status}`)
    }
    const text = await response.text()
    if (!text || text.trim().length === 0) {
      if (attempt < retries) {
        await sleep(1000)
        continue
      }
      throw new Error('Empty response from LiveStats')
    }
    try {
      return JSON.parse(text)
    } catch {
      if (attempt < retries) {
        await sleep(1000)
        continue
      }
      throw new Error('Invalid JSON from LiveStats')
    }
  }
}

function estimateGameEndTime(matchStartTime: string, gameNumber: number): string {
  const start = new Date(matchStartTime)
  // 90 min per game: ~40min game + 15min draft + 35min buffer for late starts/pauses
  start.setMinutes(start.getMinutes() + gameNumber * 90)
  return start.toISOString()
}

async function loadAllCompletedMatches(schedulesDir: string): Promise<ScheduleEvent[]> {
  const files = await readdir(schedulesDir)
  const all: ScheduleEvent[] = []

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const raw = await readFile(join(schedulesDir, file), 'utf-8')
    const data = JSON.parse(raw)
    for (const event of data.events ?? []) {
      if (event.state === 'completed' && event.type === 'match') {
        const hasOutcome = event.match.teams.some(
          (t: { result?: { outcome?: string } }) => t.result?.outcome != null,
        )
        if (hasOutcome) all.push(event)
      }
    }
  }

  all.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  return all
}

async function main() {
  const root = join(import.meta.dirname, '..')
  const schedulesDir = join(root, 'public', 'data', 'schedules')
  const gamesDir = join(root, 'data', 'games')
  await mkdir(gamesDir, { recursive: true })

  console.log('Loading completed matches from cache…')
  const matches = await loadAllCompletedMatches(schedulesDir)
  console.log(`Found ${matches.length} completed matches\n`)

  const existing = new Set(
    (await readdir(gamesDir))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', '')),
  )

  const remaining = matches.filter((m) => !existing.has(m.match.id))
  console.log(`Already downloaded: ${existing.size}`)
  console.log(`Remaining: ${remaining.length}\n`)

  if (remaining.length === 0) {
    console.log('Nothing to fetch — all matches already downloaded.')
    return
  }

  let processed = 0
  let failed = 0
  let totalGames = 0
  const startTime = Date.now()

  for (const match of remaining) {
    const matchId = match.match.id
    const [teamA, teamB] = match.match.teams
    const label = `${teamA?.code ?? '?'} vs ${teamB?.code ?? '?'}`

    processed++

    let games: Array<{ number: number; id: string; state: string }>
    try {
      games = await getEventDetails(matchId)
    } catch (err) {
      console.error(`  [${processed}/${remaining.length}] ✗ ${label} — failed to get details: ${err}`)
      failed++
      await sleep(DELAY_MS)
      continue
    }

    const completedGames = games.filter((g) => g.state === 'completed')

    if (completedGames.length === 0) {
      await writeFile(
        join(gamesDir, `${matchId}.json`),
        JSON.stringify({ matchId, games: [], error: 'no completed games' }, null, 2) + '\n',
      )
      console.log(`  [${processed}/${remaining.length}] ${label} — no completed games, skipped`)
      await sleep(DELAY_MS)
      continue
    }

    const gameResults = await Promise.allSettled(
      completedGames.map(async (game) => {
        try {
          const endTime = estimateGameEndTime(match.startTime, game.number)
          const window = await getGameWindow(game.id, endTime) as {
            gameMetadata: unknown
            frames: Array<Record<string, unknown>>
          }
          const lastFrame = window.frames?.[window.frames.length - 1] ?? null
          return {
            gameId: game.id,
            gameNumber: game.number,
            metadata: window.gameMetadata,
            lastFrame,
          }
        } catch (err) {
          return {
            gameId: game.id,
            gameNumber: game.number,
            error: String(err),
          }
        }
      }),
    )

    const gameData = gameResults.map((r) =>
      r.status === 'fulfilled' ? r.value : { error: String(r.reason) },
    )

    const successCount = gameData.filter((g) => !('error' in g) || g.error === undefined).length
    totalGames += successCount

    const output = {
      matchId,
      league: match.league,
      teams: match.match.teams,
      startTime: match.startTime,
      strategy: match.match.strategy,
      games: gameData,
    }

    await writeFile(
      join(gamesDir, `${matchId}.json`),
      JSON.stringify(output, null, 2) + '\n',
    )

    const rate = processed / ((Date.now() - startTime) / 1000)
    const eta = ((remaining.length - processed) / rate / 60).toFixed(0)
    console.log(
      `  [${processed}/${remaining.length}] ${label} — ${successCount}/${completedGames.length} games | ${matchId}.json | ~${eta}m remaining`,
    )

    if (successCount < completedGames.length) {
      const failedGames = gameData.filter((g) => 'error' in g && g.error !== undefined)
      for (const fg of failedGames) {
        console.log(`    ✗ Game ${('gameNumber' in fg) ? fg.gameNumber : '?'}: ${('error' in fg) ? fg.error : 'unknown'}`)
      }
    }

    await sleep(DELAY_MS)
  }

  console.log(`\n=== Done ===`)
  console.log(`Processed: ${processed}`)
  console.log(`Failed (no details): ${failed}`)
  console.log(`Total games downloaded: ${totalGames}`)
  console.log(`Files saved to: data/games/`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
