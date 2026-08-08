import type {
  EventDetails,
  GameWindow,
  GprData,
  League,
  ScheduleEvent,
  StandingTeam,
  Team,
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
  const url = new URL(`https://feed.lolesports.com/livestats/v1/window/${gameId}`)
  url.searchParams.set('startingTime', new Date().toISOString())

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Livestats API error: ${response.status}`)
  }
  return response.json() as Promise<GameWindow>
}

export async function getStandings(tournamentId: string): Promise<StandingTeam[]> {
  const data = await apiFetch<{
    data: {
      standings: Array<{
        stages: Array<{
          sections: Array<{
            rankings: Array<{
              teams: StandingTeam[]
            }>
          }>
        }>
      }>
    }
  }>('getStandings', { tournamentId })

  const teams: StandingTeam[] = []
  for (const standing of data.data.standings) {
    for (const stage of standing.stages) {
      for (const section of stage.sections) {
        for (const ranking of section.rankings) {
          teams.push(...ranking.teams)
        }
      }
    }
  }
  return teams
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
