import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const API_BASE = 'https://esports-api.lolesports.com/persisted/gw'
const API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z'
const GPR_URL = 'https://lolesports.com/en-US/gpr/2026/current'

const TIER1_SLUGS = ['lck', 'lpl', 'lec', 'lcs', 'lcp', 'cblol-brazil'] as const

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
  return data.data.leagues.filter((l) => TIER1_SLUGS.includes(l.slug as (typeof TIER1_SLUGS)[number]))
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

async function getRecentSchedule(leagueId: string, pages = 4): Promise<ScheduleEvent[]> {
  const all: ScheduleEvent[] = []
  let token: string | undefined

  for (let i = 0; i < pages; i++) {
    const page = await getSchedulePage(leagueId, token)
    all.push(...page.events)
    if (!page.older) break
    token = page.older
  }

  return all
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
  const leagues = await getLeagues()

  console.log('Fetching GPR rankings…')
  const gprTeams = await fetchGpr()

  const teamsIndex = buildTeamsIndex(leagues, gprTeams)

  console.log(`Writing ${teamsIndex.length} teams to teams-index.json`)
  await writeJson(join(dataDir, 'teams-index.json'), {
    updatedAt: new Date().toISOString(),
    leagues,
    teams: teamsIndex,
  })

  await writeJson(join(dataDir, 'gpr.json'), {
    updatedAt: new Date().toISOString(),
    source: GPR_URL,
    teams: gprTeams,
  })

  await mkdir(schedulesDir, { recursive: true })

  for (const league of leagues) {
    console.log(`Fetching schedule for ${league.slug}…`)
    try {
      const events = await getRecentSchedule(league.id, 4)
      await writeJson(join(schedulesDir, `${league.slug}.json`), {
        updatedAt: new Date().toISOString(),
        leagueId: league.id,
        leagueSlug: league.slug,
        events,
      })
      console.log(`  ${events.length} events cached`)
    } catch (err) {
      console.warn(`  Failed to cache ${league.slug}:`, err)
    }
  }

  console.log('Sync complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
