import { Link, useLocation } from 'react-router-dom'
import type { MatchNavigationState, ScheduleEvent, TeamIndexEntry } from '../api/types'
import { formatDate, formatSeriesScore } from '../lib/match-utils'

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
          <div className="flex items-center gap-[3px] shrink-0">
            <span className="bg-teal text-surface text-[11px] font-bold tracking-[0.1em] px-3 py-1 rounded-l-full">
              {teamA.code} {aWins} · {aPct}%
            </span>
            <span className="bg-accent text-white text-[11px] font-bold tracking-[0.1em] px-3 py-1 rounded-r-full">
              {bPct}% · {bWins} {teamB.code}
            </span>
          </div>
        </div>
        <ul className="divide-y divide-surface-muted max-h-80 overflow-y-auto">
          {events.map((event) => {
            const navState: MatchNavigationState = {
              from: location.pathname + location.search,
              startTime: event.startTime,
              blockName: event.blockName,
            }

            return (
              <li key={event.match.id}>
                <Link
                  to={`/match/${event.match.id}`}
                  state={navState}
                  className="px-5 py-3 flex items-center gap-4 hover:bg-surface-muted/30 transition-colors group"
                >
                  <span className="text-xs font-medium text-text-muted w-20 shrink-0 tracking-[0.08em]">
                    {formatDate(event.startTime)}
                  </span>
                  <span className="flex-1 text-sm truncate tracking-[0.08em]">
                    {event.league.name}
                    {event.blockName ? ` · ${event.blockName}` : ''}
                  </span>
                  <span className="font-heading text-lg tracking-wider shrink-0">
                    {formatSeriesScore(event, teamA)}
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
