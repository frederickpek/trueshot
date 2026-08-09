import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const API_BASE = 'https://esports-api.lolesports.com/persisted/gw'
const API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z'
const GPR_URL = 'https://lolesports.com/en-US/gpr/2026/current'

const TIER1_SLUGS = ['lck', 'lpl', 'lec', 'lcs', 'lcp', 'cblol-brazil'] as const

const INTERNATIONAL_SLUGS = [
  'msi', 'worlds', 'ewc_lol', 'first_stand', 'wqs',
  'kespa_cup', 'americas_cup', 'lta_cross', 'cacg',
  'duelo_de_reyes', 'rift_legends',
] as const

const ALL_SCHEDULE_SLUGS: readonly string[] = [...TIER1_SLUGS, ...INTERNATIONAL_SLUGS]

interface League {
  id: string
  slug: string
  name: string
  region: string
  image: string
}

interface GprEntry {
  rank: number
  gprScore: number
  elo: number
  slug: string
  name: string
  code: string
  leagueSlug: string
  leagueName: string
  image: string
}

interface TeamIndexEntry {
  slug: string
  name: string
  code: string
  leagueSlug: string
  leagueName: string
  leagueId: string
  region: string
  image: string
  gprRank?: number
  gprScore?: number
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
    }>
    strategy: { type: string; count: number }
  }
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

async function getLeagues(): Promise<League[]> {
  const data = await apiFetch<{ data: { leagues: League[] } }>('getLeagues')
  return data.data.leagues
}

function getTier1Leagues(leagues: League[]): League[] {
  return leagues.filter((l) => TIER1_SLUGS.includes(l.slug as (typeof TIER1_SLUGS)[number]))
}

function getScheduleLeagues(leagues: League[]): League[] {
  return leagues.filter((l) => ALL_SCHEDULE_SLUGS.includes(l.slug))
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

async function loadExistingSchedule(path: string): Promise<Map<string, ScheduleEvent>> {
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

async function syncLeagueSchedule(
  league: { id: string; slug: string },
  schedulesDir: string,
): Promise<{ total: number; added: number; updated: number }> {
  const filePath = join(schedulesDir, `${league.slug}.json`)
  const existing = await loadExistingSchedule(filePath)
  let added = 0
  let updated = 0

  const page = await getSchedulePage(league.id)
  let allNew = true

  for (const event of page.events) {
    const prev = existing.get(event.match.id)
    if (!prev) {
      existing.set(event.match.id, event)
      added++
    } else if (prev.state !== event.state) {
      existing.set(event.match.id, event)
      updated++
    }
    if (prev) allNew = false
  }

  if (allNew && page.older) {
    const page2 = await getSchedulePage(league.id, page.older)
    for (const event of page2.events) {
      const prev = existing.get(event.match.id)
      if (!prev) {
        existing.set(event.match.id, event)
        added++
      } else if (prev.state !== event.state) {
        existing.set(event.match.id, event)
        updated++
      }
    }
  }

  const allEvents = [...existing.values()]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  await writeJson(filePath, {
    updatedAt: new Date().toISOString(),
    leagueId: league.id,
    leagueSlug: league.slug,
    events: allEvents,
  })

  return { total: allEvents.length, added, updated }
}

async function fetchGpr(): Promise<GprEntry[]> {
  const response = await fetch(GPR_URL, {
    headers: {
      'User-Agent': 'Trueshot/1.0 (GitHub Actions data sync)',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch GPR page: ${response.status}`)
  }

  const html = await response.text()

  const pattern =
    /"elo":(\d+),"gprScore":(\d+),"rank":(\d+)\},"team":\{"__typename":"Team","code":"([^"]+)","homeLeague":\{"__typename":"HomeLeague","id":"[^"]+","image":"[^"]+","name":"([^"]+)","slug":"([^"]+)"\},"id":"[^"]+","image":"([^"]+)","name":"([^"]+)","slug":"([^"]+)"/g

  const teams: GprEntry[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html)) !== null) {
    teams.push({
      elo: Number(match[1]),
      gprScore: Number(match[2]),
      rank: Number(match[3]),
      code: match[4],
      leagueName: match[5],
      leagueSlug: match[6],
      image: match[7],
      name: match[8],
      slug: match[9],
    })
  }

  if (teams.length === 0) {
    throw new Error('No GPR teams parsed — page structure may have changed')
  }

  teams.sort((a, b) => a.rank - b.rank)
  return teams
}

function buildTeamsIndex(leagues: League[], gprTeams: GprEntry[]): TeamIndexEntry[] {
  const leagueBySlug = new Map(leagues.map((l) => [l.slug, l]))
  const entries: TeamIndexEntry[] = []

  for (const gpr of gprTeams) {
    if (!TIER1_SLUGS.includes(gpr.leagueSlug as (typeof TIER1_SLUGS)[number])) continue

    const league = leagueBySlug.get(gpr.leagueSlug)
    if (!league) continue

    entries.push({
      slug: gpr.slug,
      name: gpr.name,
      code: gpr.code,
      leagueSlug: gpr.leagueSlug,
      leagueName: gpr.leagueName,
      leagueId: league.id,
      region: league.region,
      image: gpr.image,
      gprRank: gpr.rank,
      gprScore: gpr.gprScore,
    })
  }

  entries.sort((a, b) => {
    const leagueCmp = a.leagueSlug.localeCompare(b.leagueSlug)
    if (leagueCmp !== 0) return leagueCmp
    return a.name.localeCompare(b.name)
  })

  return entries
}

async function writeJson(path: string, data: unknown) {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, JSON.stringify(data, null, 2) + '\n')
}

async function main() {
  const root = join(import.meta.dirname, '..')
  const dataDir = join(root, 'public', 'data')
  const schedulesDir = join(dataDir, 'schedules')

  console.log('Fetching leagues…')
  const allLeagues = await getLeagues()
  const tier1Leagues = getTier1Leagues(allLeagues)
  const scheduleLeagues = getScheduleLeagues(allLeagues)

  console.log('Fetching GPR rankings…')
  const gprTeams = await fetchGpr()

  const teamsIndex = buildTeamsIndex(tier1Leagues, gprTeams)

  console.log(`Writing ${teamsIndex.length} teams to teams-index.json`)
  await writeJson(join(dataDir, 'teams-index.json'), {
    updatedAt: new Date().toISOString(),
    leagues: tier1Leagues,
    teams: teamsIndex,
  })

  await writeJson(join(dataDir, 'gpr.json'), {
    updatedAt: new Date().toISOString(),
    source: GPR_URL,
    teams: gprTeams,
  })

  await mkdir(schedulesDir, { recursive: true })

  for (const league of scheduleLeagues) {
    console.log(`Syncing schedule for ${league.slug}…`)
    try {
      const result = await syncLeagueSchedule(league, schedulesDir)
      console.log(`  ${result.total} total (${result.added} new, ${result.updated} updated)`)
    } catch (err) {
      console.warn(`  Failed to sync ${league.slug}:`, err)
    }
  }

  console.log('Syncing champion icons…')
  await syncChampionIcons(root)

  console.log('Sync complete.')
}

async function syncChampionIcons(root: string) {
  const iconsDir = join(root, 'public', 'icons', 'champions')
  await mkdir(iconsDir, { recursive: true })

  const existing = new Set(
    (await readdir(iconsDir)).filter((f) => f.endsWith('.png')).map((f) => f.replace('.png', '')),
  )

  const versions = (await fetch('https://ddragon.leagueoflegends.com/api/versions.json').then(
    (r) => r.json(),
  )) as string[]
  const latest = versions[0]

  const champData = (await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${latest}/data/en_US/champion.json`,
  ).then((r) => r.json())) as { data: Record<string, unknown> }

  const allChamps: string[] = Object.keys(champData.data)
  const missing = allChamps.filter((c) => !existing.has(c))

  if (missing.length === 0) {
    console.log(`  All ${allChamps.length} champion icons up to date`)
    return
  }

  console.log(`  Downloading ${missing.length} new champion icon(s)…`)
  for (let i = 0; i < missing.length; i += 20) {
    const batch = missing.slice(i, i + 20)
    await Promise.all(
      batch.map(async (c) => {
        const url = `https://ddragon.leagueoflegends.com/cdn/${latest}/img/champion/${c}.png`
        const res = await fetch(url)
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer())
          await writeFile(join(iconsDir, `${c}.png`), buf)
        } else {
          console.warn(`  Failed to download ${c}: ${res.status}`)
        }
      }),
    )
  }
  console.log(`  ${missing.length} champion icon(s) added`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
