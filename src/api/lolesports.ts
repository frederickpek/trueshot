import type {
  EventDetails,
  GameWindow,
  GprData,
  League,
  LeagueStandings,
  ScheduleEvent,
  StandingTeam,
  Team,
  TeamStandingResult,
  TeamsIndexData,
} from './types'

const API_BASE = 'https://esports-api.lolesports.com/persisted/gw'
const API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z'

let corsVerified: boolean | null = null

async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`)
  url.searchParams.set('hl', 'en-US')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), {
    headers: { 'x-api-key': API_KEY },
  })

  if (corsVerified === null) {
    corsVerified = response.ok
  }

  if (!response.ok) {
    throw new Error(`LoL Esports API error: ${response.status} ${path}`)
  }

  return response.json() as Promise<T>
}

export async function checkApiAvailable(): Promise<boolean> {
  try {
    await getLeagues()
    return true
  } catch {
    return false
  }
}

export async function getLeagues(): Promise<League[]> {
  const data = await apiFetch<{ data: { leagues: League[] } }>('getLeagues')
  return data.data.leagues
}

export async function getTeamsBySlug(slug: string): Promise<Team | null> {
  const data = await apiFetch<{ data: { teams: Team[] } }>('getTeams', { id: slug })
  return data.data.teams[0] ?? null
}

export async function getSchedule(
  leagueId: string,
  pageToken?: string,
): Promise<{ events: ScheduleEvent[]; older?: string; newer?: string }> {
  const params: Record<string, string> = { leagueId }
  if (pageToken) params.pageToken = pageToken

  const data = await apiFetch<{
    data: {
      schedule: {
        events: ScheduleEvent[]
        pages: { older?: string; newer?: string }
      }
    }
  }>('getSchedule', params)

  return {
    events: data.data.schedule.events.filter((e) => e.type === 'match'),
    older: data.data.schedule.pages.older,
    newer: data.data.schedule.pages.newer,
  }
}

export async function getRecentScheduleForLeague(
  leagueId: string,
  maxPages = 3,
): Promise<ScheduleEvent[]> {
  const all: ScheduleEvent[] = []
  let token: string | undefined

  for (let i = 0; i < maxPages; i++) {
    const page = await getSchedule(leagueId, token)
    all.push(...page.events)
    if (!page.older) break
    token = page.older
  }

  return all
}

export async function getEventDetails(matchId: string): Promise<EventDetails> {
  const data = await apiFetch<{ data: { event: EventDetails } }>('getEventDetails', {
    id: matchId,
  })
  return data.data.event
}

export async function getGameWindow(gameId: string): Promise<GameWindow> {
  const now = new Date(Date.now() - 30_000)
  now.setUTCSeconds(Math.floor(now.getUTCSeconds() / 10) * 10, 0)
  const url = `https://feed.lolesports.com/livestats/v1/window/${gameId}?startingTime=${now.toISOString()}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Livestats API error: ${response.status}`)
  }
  return response.json() as Promise<GameWindow>
}

export async function getTeamStandingInTournament(
  tournamentId: string,
  tournamentSlug: string,
  team: Pick<StandingTeam, 'slug' | 'code'>,
): Promise<TeamStandingResult | null> {
  const data = await apiFetch<{
    data: {
      standings: Array<{
        stages: Array<{
          sections: Array<{
            name?: string
            rankings: Array<{
              teams: StandingTeam[]
            }>
          }>
        }>
      }>
    }
  }>('getStandings', { tournamentId })

  for (const standing of data.data.standings) {
    for (const stage of standing.stages) {
      for (const section of stage.sections) {
        for (const ranking of section.rankings) {
          const match = ranking.teams.find(
            (t) =>
              t.slug === team.slug || t.code.toLowerCase() === team.code.toLowerCase(),
          )
          if (match) {
            return {
              team: match,
              tournamentSlug,
              sectionName: section.name,
            }
          }
        }
      }
    }
  }

  return null
}

interface StandingsMatchTeam {
  id: string
  slug: string
  name: string
  code: string
  image: string
  result: { outcome: string; gameWins: number }
}

interface StandingsSection {
  name?: string
  rankings: Array<{ ordinal: number; teams: StandingTeam[] }>
  matches?: Array<{ teams: StandingsMatchTeam[] }>
}

function buildTeamsFromMatches(matches: StandingsSection['matches']): StandingTeam[] {
  if (!matches) return []
  const map = new Map<string, StandingTeam>()
  for (const match of matches) {
    for (const t of match.teams) {
      if (t.code === 'TBD') continue
      if (!map.has(t.id)) {
        map.set(t.id, {
          id: t.id,
          slug: t.slug,
          name: t.name,
          code: t.code,
          image: t.image,
          record: { wins: 0, losses: 0 },
        })
      }
      const entry = map.get(t.id)!
      if (t.result.outcome === 'win') entry.record.wins++
      else if (t.result.outcome === 'loss') entry.record.losses++
    }
  }
  return [...map.values()].sort((a, b) => {
    const aTotal = a.record.wins + a.record.losses
    const bTotal = b.record.wins + b.record.losses
    const aWr = aTotal > 0 ? a.record.wins / aTotal : 0
    const bWr = bTotal > 0 ? b.record.wins / bTotal : 0
    if (bWr !== aWr) return bWr - aWr
    return b.record.wins - a.record.wins
  })
}

export async function getLeagueStandings(
  leagueId: string,
  leagueSlug: string,
): Promise<LeagueStandings | null> {
  const tournaments = await getTournamentsForLeague(leagueId)
  const current = tournaments[0]
  if (!current) return null

  const data = await apiFetch<{
    data: {
      standings: Array<{
        stages: Array<{
          name: string
          sections: StandingsSection[]
        }>
      }>
    }
  }>('getStandings', { tournamentId: current.id })

  const sections: LeagueStandings['sections'] = []
  for (const standing of data.data.standings) {
    for (const stage of standing.stages) {
      for (const section of stage.sections) {
        const teams = section.rankings
          .sort((a, b) => a.ordinal - b.ordinal)
          .flatMap((r) => r.teams)
        if (teams.length > 0) {
          sections.push({ stageName: stage.name, name: section.name, teams })
        } else {
          const derived = buildTeamsFromMatches(section.matches)
          if (derived.length > 0) {
            sections.push({ stageName: stage.name, name: section.name, teams: derived })
          }
        }
      }
    }
  }

  if (sections.length === 0) return null

  return { leagueSlug, tournamentSlug: current.slug, sections }
}

export async function getTournamentsForLeague(leagueId: string) {
  const data = await apiFetch<{
    data: {
      leagues: Array<{
        tournaments: Array<{ id: string; slug: string; startDate: string; endDate: string }>
      }>
    }
  }>('getTournamentsForLeague', { leagueId })
  return data.data.leagues[0]?.tournaments ?? []
}

const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`

export async function loadGprData(): Promise<GprData> {
  const response = await fetch(dataUrl('gpr.json'))
  if (!response.ok) throw new Error('Failed to load GPR data')
  return response.json()
}

export async function loadTeamsIndex(): Promise<TeamsIndexData> {
  const response = await fetch(dataUrl('teams-index.json'))
  if (!response.ok) throw new Error('Failed to load teams index')
  return response.json()
}

export async function loadCachedSchedule(leagueSlug: string): Promise<ScheduleEvent[] | null> {
  try {
    const response = await fetch(dataUrl(`schedules/${leagueSlug}.json`))
    if (!response.ok) return null
    const data = await response.json()
    return data.events as ScheduleEvent[]
  } catch {
    return null
  }
}
