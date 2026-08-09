import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const API_BASE = 'https://esports-api.lolesports.com/persisted/gw'
const API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z'

const CUTOFF = new Date('2023-01-01T00:00:00Z').getTime()
const DELAY_MS = 2000

const ALL_SCHEDULE_SLUGS = [
  'lck', 'lpl', 'lec', 'lcs', 'lcp', 'cblol-brazil',
  'msi', 'worlds', 'ewc_lol', 'first_stand', 'wqs',
  'kespa_cup', 'americas_cup', 'lta_cross', 'cacg',
  'duelo_de_reyes', 'rift_legends',
]

interface League {
  id: string
  slug: string
  name: string
}

interface ScheduleEvent {
  startTime: string
  state: string
  type: string
  blockName?: string
  league: { name: string; slug: string }
  match: {
    id: string
    teams: Array<{
      name: string
      code: string
      image: string
      result?: { outcome?: string; gameWins: number }
      record?: { wins: number; losses: number }
    }>
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

async function getSchedulePage(leagueId: string, pageToken?: string): Promise<{
  events: ScheduleEvent[]
  older?: string
}> {
  const params: Record<string, string> = { leagueId }
  if (pageToken) params.pageToken = pageToken

  const data = await apiFetch<{
    data: {
      schedule: {
        events: ScheduleEvent[]
        pages: { older?: string }
      }
    }
  }>('getSchedule', params)

  return {
    events: data.data.schedule.events.filter((e) => e.type === 'match'),
    older: data.data.schedule.pages.older,
  }
}

async function writeJson(path: string, data: unknown) {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, JSON.stringify(data, null, 2) + '\n')
}

async function loadExistingEvents(path: string): Promise<Map<string, ScheduleEvent>> {
  try {
    const raw = await readFile(path, 'utf-8')
    const data = JSON.parse(raw)
    const map = new Map<string, ScheduleEvent>()
    for (const event of data.events ?? []) {
      map.set(event.match.id, event)
    }
    return map
  } catch {
    return new Map()
  }
}

async function seedLeague(league: League, schedulesDir: string) {
  const filePath = join(schedulesDir, `${league.slug}.json`)
  const existing = await loadExistingEvents(filePath)
  const startCount = existing.size

  console.log(`\n[${ league.slug.toUpperCase() }] Starting seed (${startCount} existing events)`)

  let token: string | undefined
  let page = 0
  let newCount = 0
  let reachedCutoff = false

  while (true) {
    page++
    await sleep(DELAY_MS)

    let result: { events: ScheduleEvent[]; older?: string }
    try {
      result = await getSchedulePage(league.id, token)
    } catch (err) {
      console.error(`  ✗ Page ${page} failed: ${err}`)
      break
    }

    const events = result.events
    if (events.length === 0) {
      console.log(`  Page ${page}: empty — no more data`)
      break
    }

    const earliest = events[events.length - 1]?.startTime
    const latest = events[0]?.startTime

    let pageNew = 0
    for (const event of events) {
      const eventTime = new Date(event.startTime).getTime()
      if (eventTime < CUTOFF) {
        reachedCutoff = true
        continue
      }
      if (!existing.has(event.match.id)) {
        existing.set(event.match.id, event)
        pageNew++
        newCount++
      }
    }

    const earliestDate = earliest ? earliest.slice(0, 10) : '?'
    const latestDate = latest ? latest.slice(0, 10) : '?'
    console.log(`  Page ${page}: ${events.length} events (${pageNew} new) | ${latestDate} → ${earliestDate} | total: ${existing.size}`)

    if (reachedCutoff) {
      console.log(`  ✓ Reached Jan 2023 cutoff`)
      break
    }

    if (!result.older) {
      console.log(`  ✓ No more pages`)
      break
    }

    token = result.older
  }

  const allEvents = [...existing.values()]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  await writeJson(filePath, {
    updatedAt: new Date().toISOString(),
    leagueId: league.id,
    leagueSlug: league.slug,
    events: allEvents,
  })

  console.log(`  ✓ Saved ${allEvents.length} events (${newCount} new) to ${league.slug}.json`)
}

async function main() {
  const root = join(import.meta.dirname, '..')
  const schedulesDir = join(root, 'public', 'data', 'schedules')
  await mkdir(schedulesDir, { recursive: true })

  console.log('Fetching league list…')
  await sleep(DELAY_MS)
  const allLeagues = await apiFetch<{ data: { leagues: League[] } }>('getLeagues')
  const leagues = allLeagues.data.leagues.filter((l) => ALL_SCHEDULE_SLUGS.includes(l.slug))

  console.log(`Found ${leagues.length} leagues to seed`)
  console.log(`Cutoff: Jan 1, 2023 | Delay between requests: ${DELAY_MS}ms`)

  const found = leagues.map((l) => l.slug)
  const missing = ALL_SCHEDULE_SLUGS.filter((s) => !found.includes(s))
  if (missing.length > 0) {
    console.log(`⚠ Not found in API: ${missing.join(', ')}`)
  }

  for (const league of leagues) {
    await seedLeague(league, schedulesDir)
  }

  console.log('\n=== Seed complete ===')
  let totalEvents = 0
  for (const league of leagues) {
    try {
      const raw = await readFile(join(schedulesDir, `${league.slug}.json`), 'utf-8')
      const data = JSON.parse(raw)
      const count = data.events?.length ?? 0
      totalEvents += count
      console.log(`  ${league.slug}: ${count} events`)
    } catch { /* skip */ }
  }
  console.log(`  Total: ${totalEvents} events`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
