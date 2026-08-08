import { useQuery } from '@tanstack/react-query'
import {
  getEventDetails,
  getRecentScheduleForLeague,
  getTeamsBySlug,
  getTeamStandingInTournament,
  getTournamentsForLeague,
  loadCachedSchedule,
  loadGprData,
  loadTeamsIndex,
} from '../api/lolesports'
import type { TeamIndexEntry } from '../api/types'
import { formatStandingLabel } from '../lib/leagues'
import { findGprEntryWithRegional } from '../lib/gpr-utils'
import { filterEventsForTeam } from '../lib/match-utils'

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

export function useLeagueSchedule(leagueId: string | undefined, leagueSlug?: string) {
  return useQuery({
    queryKey: ['schedule', leagueId, leagueSlug],
    queryFn: async () => {
      try {
        return await getRecentScheduleForLeague(leagueId!, 4)
      } catch {
        if (leagueSlug) {
          const cached = await loadCachedSchedule(leagueSlug)
          if (cached) return cached
        }
        throw new Error('Schedule unavailable')
      }
    },
    enabled: Boolean(leagueId),
    staleTime: 1000 * 60 * 5,
  })
}

export function useTeamSchedule(team: TeamIndexEntry | undefined) {
  const schedule = useLeagueSchedule(team?.leagueId, team?.leagueSlug)
  const events = team && schedule.data
    ? filterEventsForTeam(schedule.data, team)
    : []

  return { ...schedule, events }
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

export function useTeamsForLeague(leagueSlug: string | undefined) {
  const index = useTeamsIndex()
  const teams = leagueSlug
    ? (index.data?.teams.filter((t) => t.leagueSlug === leagueSlug) ?? [])
    : (index.data?.teams ?? [])

  return { ...index, teams }
}
