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
      <div className="rounded-xl border border-surface-muted bg-surface-elevated p-5">
        <h3 className="font-medium mb-2">Head to Head</h3>
        <p className="text-sm text-text-muted">
          No recorded matches between {teamA.name} and {teamB.name} in recent history.
        </p>
      </div>
    )
  }

  let aWins = 0
  let bWins = 0
  for (const event of events) {
    if (event.state !== 'completed') continue
    const aTeam = event.match.teams.find(
      (t) => t.code.toLowerCase() === teamA.code.toLowerCase(),
    )
    if (aTeam?.result?.outcome === 'win') aWins++
    else if (aTeam?.result?.outcome === 'loss') bWins++
  }

  return (
    <div className="rounded-xl border border-surface-muted bg-surface-elevated overflow-hidden">
      <div className="px-5 py-3 border-b border-surface-muted flex items-center justify-between">
        <h3 className="font-medium">Head to Head</h3>
        <p className="text-sm text-text-muted">
          {teamA.code} {aWins} – {bWins} {teamB.code}
          <span className="ml-2">({events.length} series)</span>
        </p>
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
                className="px-5 py-3 flex items-center gap-4 hover:bg-surface/50 transition-colors"
              >
                <span className="text-xs text-text-muted w-20 shrink-0">
                  {formatDate(event.startTime)}
                </span>
                <span className="flex-1 text-sm truncate">
                  {event.league.name}
                  {event.blockName ? ` · ${event.blockName}` : ''}
                </span>
                <span className="text-sm font-mono shrink-0">{formatSeriesScore(event)}</span>
                <span className="text-text-muted text-xs shrink-0">→</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
