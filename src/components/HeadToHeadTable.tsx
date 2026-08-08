import { Link, useLocation } from 'react-router-dom'
import type { MatchNavigationState, ScheduleEvent, TeamIndexEntry } from '../api/types'
import { didTeamWin, formatDate } from '../lib/match-utils'

interface HeadToHeadTableProps {
  events: ScheduleEvent[]
  teamA: TeamIndexEntry
  teamB: TeamIndexEntry
}

export function HeadToHeadTable({ events, teamA, teamB }: HeadToHeadTableProps) {
  const location = useLocation()

  if (events.length === 0) {
    return (
      <div>
        <div className="h-1.5 bg-steel rounded-t-lg" />
        <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted rounded-b-lg p-5">
          <span className="font-heading text-xl text-text tracking-[0.08em]">Head to Head</span>
          <p className="text-sm text-text-muted mt-2 tracking-[0.08em]">
            No recorded matches between {teamA.name} and {teamB.name} in recent history.
          </p>
        </div>
      </div>
    )
  }

  let aWins = 0
  let bWins = 0
  for (const event of events) {
    const aTeam = event.match.teams.find(
      (t) => t.code.toLowerCase() === teamA.code.toLowerCase(),
    )
    if (aTeam?.result?.outcome === 'win') aWins++
    else if (aTeam?.result?.outcome === 'loss') bWins++
  }

  const total = aWins + bWins
  const aPct = total > 0 ? Math.round((aWins / total) * 100) : 0
  const bPct = total > 0 ? Math.round((bWins / total) * 100) : 0

  return (
    <div className="overflow-hidden">
      <div className="h-1.5 bg-steel rounded-t-lg" />
      <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted rounded-b-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-muted flex items-center justify-between gap-4">
          <span className="font-heading text-xl text-text tracking-[0.08em]">Head to Head</span>
          <span className="shrink-0 flex items-center gap-4">
            <span className="flex items-center gap-2 font-heading tracking-wider">
              <span className="text-sm text-text-muted w-8 text-right">{teamA.code}</span>
              <span className="text-lg w-4 text-center">{aWins}</span>
              <span className="text-text-muted text-sm">-</span>
              <span className="text-lg w-4 text-center">{bWins}</span>
              <span className="text-sm text-text-muted w-8">{teamB.code}</span>
            </span>
            <span className="text-xs invisible">→</span>
          </span>
        </div>
        <ul className="divide-y divide-surface-muted max-h-80 overflow-y-auto">
          {events.map((event) => {
            const navState: MatchNavigationState = {
              from: location.pathname + location.search,
              startTime: event.startTime,
              blockName: event.blockName,
            }

            const aTeam = event.match.teams.find(
              (t) => t.code.toLowerCase() === teamA.code.toLowerCase(),
            )
            const bTeam = event.match.teams.find(
              (t) => t.code.toLowerCase() === teamB.code.toLowerCase(),
            )
            const aWins = aTeam?.result?.gameWins ?? 0
            const bWins = bTeam?.result?.gameWins ?? 0
            const aWon = didTeamWin(event, teamA)

            return (
              <li key={event.match.id}>
                <Link
                  to={`/match/${event.match.id}`}
                  state={navState}
                  className="px-5 py-3 flex items-center gap-4 hover:bg-surface-muted/30 transition-colors group"
                >
                  <span className="text-xs font-medium text-text-muted shrink-0 tracking-[0.08em] whitespace-nowrap">
                    {formatDate(event.startTime)}
                  </span>
                  <span className="flex-1 text-sm font-semibold truncate tracking-[0.08em]">
                    {event.league.name}
                    {event.blockName ? ` · ${event.blockName}` : ''}
                  </span>
                  <span className="shrink-0 flex items-center gap-2 font-heading tracking-wider">
                    <span className="text-sm text-text-muted w-8 text-right">{teamA.code}</span>
                    <span className={`text-lg w-4 text-center ${aWon === true ? 'text-teal' : 'text-text'}`}>{aWins}</span>
                    <span className="text-text-muted text-sm">-</span>
                    <span className={`text-lg w-4 text-center ${aWon === false ? 'text-accent' : 'text-text'}`}>{bWins}</span>
                    <span className="text-sm text-text-muted w-8">{teamB.code}</span>
                  </span>
                  <span className="text-text-muted text-xs shrink-0 group-hover:text-accent transition-colors">
                    →
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
