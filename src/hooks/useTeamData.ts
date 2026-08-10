import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  getEventDetails,
  getLeagueStandings,
  getRecentScheduleForLeague,
  getTeamsBySlug,
  getTeamStandingInTournament,
  getTournamentsForLeague,
  loadCachedSchedule,
  loadGprData,
  loadTeamElos,
  loadTeamsIndex,
} from '../api/lolesports'
import type { TeamEloEntry } from '../api/lolesports'
import type { ScheduleEvent, TeamIndexEntry } from '../api/types'
import { formatStandingLabel } from '../lib/leagues'
import { findGprEntryWithRegional } from '../lib/gpr-utils'
import { filterEventsForTeam, filterUpcomingEvents } from '../lib/match-utils'
import { ALL_SCHEDULE_SLUGS, INTERNATIONAL_LEAGUE_SLUGS, LEAGUE_IDS, TIER1_LEAGUE_SLUGS } from '../lib/leagues'

export function useTeamsIndex() {
  return useQuery({
    queryKey: ['teams-index'],
    queryFn: loadTeamsIndex,
    staleTime: 1000 * 60 * 60,
  })
}

export function useGprData() {
  return useQuery({
    queryKey: ['gpr'],
    queryFn: loadGprData,
    staleTime: 1000 * 60 * 60,
  })
}

export function useTeamDetails(slug: string | undefined) {
  return useQuery({
    queryKey: ['team', slug],
    queryFn: () => getTeamsBySlug(slug!),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 15,
  })
}

function getTodayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function hasEventsFromToday(events: ScheduleEvent[], todayMs: number): boolean {
  return events.some((e) => new Date(e.startTime).getTime() >= todayMs)
}

async function mergeWithLive(
  cached: ScheduleEvent[],
  leagueId: string,
): Promise<ScheduleEvent[]> {
  const todayMs = getTodayStart()
  if (!hasEventsFromToday(cached, todayMs)) return cached

  try {
    const live = await getRecentScheduleForLeague(leagueId, 1)
    const freshById = new Map(live.map((e) => [e.match.id, e]))
    const cachedIds = new Set(cached.map((e) => e.match.id))
    return cached
      .map((e) => {
        if (new Date(e.startTime).getTime() >= todayMs) {
          return freshById.get(e.match.id) ?? e
        }
        return e
      })
      .concat(live.filter((e) => !cachedIds.has(e.match.id)))
  } catch {
    return cached
  }
}

export function useLeagueSchedule(leagueId: string | undefined, leagueSlug?: string) {
  return useQuery({
    queryKey: ['schedule', leagueId, leagueSlug],
    queryFn: async () => {
      const cached = leagueSlug ? await loadCachedSchedule(leagueSlug) : null
      if (cached) return mergeWithLive(cached, leagueId!)
      return getRecentScheduleForLeague(leagueId!, 4)
    },
    enabled: Boolean(leagueId),
    staleTime: 1000 * 60 * 5,
  })
}

export function useInternationalSchedules() {
  return useQueries({
    queries: INTERNATIONAL_LEAGUE_SLUGS.map((slug) => ({
      queryKey: ['cached-schedule', slug],
      queryFn: async () => {
        const cached = await loadCachedSchedule(slug)
        if (!cached) return null
        const leagueId = LEAGUE_IDS[slug]
        if (!leagueId) return cached
        return mergeWithLive(cached, leagueId)
      },
      staleTime: 1000 * 60 * 5,
    })),
  })
}

export function useTeamSchedule(team: TeamIndexEntry | undefined) {
  const schedule = useLeagueSchedule(team?.leagueId, team?.leagueSlug)
  const intlResults = useInternationalSchedules()

  const events = useMemo(() => {
    if (!team) return []
    const regional = schedule.data ? filterEventsForTeam(schedule.data, team) : []
    const intlEvents = intlResults
      .flatMap((q) => q.data ?? [])
    const intlForTeam = filterEventsForTeam(intlEvents, team)
    const all = [...regional, ...intlForTeam]
    const seen = new Set<string>()
    return all
      .filter((e) => {
        if (seen.has(e.match.id)) return false
        seen.add(e.match.id)
        return true
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }, [team, schedule.data, intlResults])

  const isLoading = schedule.isLoading || intlResults.some((q) => q.isLoading)

  return { ...schedule, isLoading, events }
}

export function useMatchDetails(matchId: string | null) {
  return useQuery({
    queryKey: ['match', matchId],
    queryFn: () => getEventDetails(matchId!),
    enabled: Boolean(matchId),
    staleTime: 1000 * 60 * 30,
  })
}

export function useTeamStandings(team: TeamIndexEntry | undefined) {
  return useQuery({
    queryKey: ['standings', team?.leagueId],
    queryFn: async () => {
      const tournaments = await getTournamentsForLeague(team!.leagueId)
      const current = tournaments[0]
      if (!current) return null
      const standing = await getTeamStandingInTournament(current.id, current.slug, team!)
      if (!standing) return null
      return {
        ...standing,
        label: formatStandingLabel(standing.tournamentSlug, standing.sectionName),
      }
    },
    enabled: Boolean(team?.leagueId),
    staleTime: 1000 * 60 * 30,
  })
}

export function useTeamGpr(slug: string | undefined) {
  const gpr = useGprData()
  const entry =
    slug && gpr.data ? findGprEntryWithRegional(gpr.data.teams, slug) : undefined
  return { ...gpr, entry }
}

export function useAllUpcomingEvents() {
  const results = useQueries({
    queries: ALL_SCHEDULE_SLUGS.map((slug) => ({
      queryKey: ['cached-schedule', slug],
      queryFn: () => loadCachedSchedule(slug),
      staleTime: 1000 * 60 * 60,
    })),
  })

  const isLoading = results.some((q) => q.isLoading)
  const events = filterUpcomingEvents(
    results.flatMap((q) => q.data ?? []),
  )

  return { events, isLoading }
}

export function useAllLeagueStandings() {
  const results = useQueries({
    queries: TIER1_LEAGUE_SLUGS.map((slug) => ({
      queryKey: ['league-standings', slug],
      queryFn: () => getLeagueStandings(LEAGUE_IDS[slug], slug),
      staleTime: 1000 * 60 * 30,
    })),
  })

  const isLoading = results.some((q) => q.isLoading)
  const standings = results
    .map((q) => q.data)
    .filter((d): d is NonNullable<typeof d> => d != null)

  return { standings, isLoading }
}

export function useTeamsForLeague(leagueSlug: string | undefined) {
  const index = useTeamsIndex()
  const teams = leagueSlug
    ? (index.data?.teams.filter((t) => t.leagueSlug === leagueSlug) ?? [])
    : (index.data?.teams ?? [])

  return { ...index, teams }
}

export interface TeamEloRanked {
  elo: number
  globalRank: number
  regionalRank: number
}

export function useTeamElos() {
  const index = useTeamsIndex()
  const eloQuery = useQuery({
    queryKey: ['team-elos'],
    queryFn: loadTeamElos,
    staleTime: 1000 * 60 * 60,
  })

  const ranked = useMemo(() => {
    if (!eloQuery.data || !index.data) return new Map<string, TeamEloRanked>()

    const indexCodes = new Set(index.data.teams.map((t) => t.code))
    const eligible = eloQuery.data.teams
      .filter((t) => indexCodes.has(t.code))
      .sort((a, b) => b.elo - a.elo)

    const result = new Map<string, TeamEloRanked>()
    const regionCounters = new Map<string, number>()

    const codeToLeague = new Map<string, string>()
    for (const t of index.data.teams) {
      codeToLeague.set(t.code, t.leagueSlug)
    }

    const regionSorted = new Map<string, TeamEloEntry[]>()
    for (const t of eligible) {
      const league = codeToLeague.get(t.code) ?? ''
      if (!regionSorted.has(league)) regionSorted.set(league, [])
      regionSorted.get(league)!.push(t)
    }

    const regionRankMap = new Map<string, number>()
    for (const [, teams] of regionSorted) {
      let rank = 1
      for (const t of teams) {
        regionRankMap.set(t.code, rank++)
      }
    }

    eligible.forEach((t, i) => {
      result.set(t.code, {
        elo: Math.round(t.elo),
        globalRank: i + 1,
        regionalRank: regionRankMap.get(t.code) ?? 0,
      })
    })

    return result
  }, [eloQuery.data, index.data])

  return { ...eloQuery, ranked }
}
