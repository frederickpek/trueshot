import type { GprEntry, ScheduleEvent, TeamIndexEntry } from '../api/types'

export function teamMatchesEvent(
  team: Pick<TeamIndexEntry, 'code' | 'name'>,
  matchTeam: { code: string; name: string },
): boolean {
  const codeMatch = team.code.toLowerCase() === matchTeam.code.toLowerCase()
  const nameMatch = team.name.toLowerCase() === matchTeam.name.toLowerCase()
  return codeMatch || nameMatch
}

export function filterEventsForTeam(
  events: ScheduleEvent[],
  team: Pick<TeamIndexEntry, 'code' | 'name'>,
): ScheduleEvent[] {
  return events
    .filter((event) =>
      event.match.teams.some((t) => teamMatchesEvent(team, t)),
    )
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
}

export function filterCompletedEvents(events: ScheduleEvent[]): ScheduleEvent[] {
  return events.filter((event) => event.state === 'completed')
}

export function getHeadToHead(
  events: ScheduleEvent[],
  teamA: Pick<TeamIndexEntry, 'code' | 'name'>,
  teamB: Pick<TeamIndexEntry, 'code' | 'name'>,
): ScheduleEvent[] {
  return events
    .filter((event) => {
      const codes = event.match.teams.map((t) => t.code.toLowerCase())
      const hasA = event.match.teams.some((t) => teamMatchesEvent(teamA, t))
      const hasB = event.match.teams.some((t) => teamMatchesEvent(teamB, t))
      return hasA && hasB && codes.length === 2
    })
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
}

function orderTeamsForDisplay<T extends { code: string; name: string }>(
  teams: T[],
  primaryTeam?: Pick<TeamIndexEntry, 'code' | 'name'>,
): [T, T] {
  const [first, second] = teams
  if (teams.length !== 2 || !primaryTeam) return [first, second]
  if (teamMatchesEvent(primaryTeam, second)) return [second, first]
  return [first, second]
}

export function formatSeriesScore(
  event: ScheduleEvent,
  primaryTeam?: Pick<TeamIndexEntry, 'code' | 'name'>,
): string {
  const [a, b] = orderTeamsForDisplay(event.match.teams, primaryTeam)
  return `${a.code} ${a.result?.gameWins ?? 0} - ${b.result?.gameWins ?? 0} ${b.code}`
}

export function formatSeriesScoreFromMatch(
  teams: Array<{ code: string; name: string; result?: { gameWins: number } }>,
  primaryTeam?: Pick<TeamIndexEntry, 'code' | 'name'>,
): string {
  const [a, b] = orderTeamsForDisplay(teams, primaryTeam)
  return `${a.code} ${a.result?.gameWins ?? 0} - ${b.result?.gameWins ?? 0} ${b.code}`
}

export function getSeriesWinner<T extends { id: string; code: string; name: string; result: { gameWins: number } }>(
  teams: T[],
): T | null {
  if (teams.length !== 2) return null
  const [a, b] = teams
  if (a.result.gameWins === b.result.gameWins) return null
  return a.result.gameWins > b.result.gameWins ? a : b
}

export function getTeamFromEvent(
  event: ScheduleEvent,
  team: Pick<TeamIndexEntry, 'code' | 'name'>,
) {
  return event.match.teams.find((t) => teamMatchesEvent(team, t))
}

export function didTeamWin(event: ScheduleEvent, team: Pick<TeamIndexEntry, 'code' | 'name'>): boolean | null {
  const matchTeam = getTeamFromEvent(event, team)
  if (!matchTeam?.result?.outcome) return null
  return matchTeam.result.outcome === 'win'
}

export function computeRecord(events: ScheduleEvent[], team: Pick<TeamIndexEntry, 'code' | 'name'>) {
  let wins = 0
  let losses = 0
  for (const event of events) {
    if (event.state !== 'completed') continue
    const outcome = didTeamWin(event, team)
    if (outcome === true) wins++
    else if (outcome === false) losses++
  }
  return { wins, losses }
}

export function formatRecordWithWinRate(record: { wins: number; losses: number }): string | null {
  const total = record.wins + record.losses
  if (total === 0) return null
  const pct = Math.round((record.wins / total) * 100)
  return `${record.wins}W ${record.losses}L · ${pct}%`
}

export function findGprEntry(gprTeams: GprEntry[], slug: string): GprEntry | undefined {
  return gprTeams.find((t) => t.slug === slug)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getOpponent(
  event: ScheduleEvent,
  team: Pick<TeamIndexEntry, 'code' | 'name'>,
) {
  return event.match.teams.find((t) => !teamMatchesEvent(team, t))
}

export function uniqueLeagueIdsFromTeams(teams: TeamIndexEntry[]): string[] {
  return [...new Set(teams.map((t) => t.leagueId))]
}
