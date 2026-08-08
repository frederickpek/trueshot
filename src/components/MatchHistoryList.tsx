import { Link, useLocation } from 'react-router-dom'
import type { MatchNavigationState, ScheduleEvent, TeamIndexEntry } from '../api/types'
import {
  didTeamWin,
  formatDate,
  formatSeriesScore,
  getOpponent,
} from '../lib/match-utils'

interface MatchHistoryListProps {
  events: ScheduleEvent[]
  team: TeamIndexEntry
  title?: string
}

export function MatchHistoryList({
  events,
  team,
  title = 'Recent Matches',
}: MatchHistoryListProps) {
  const location = useLocation()

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-surface-muted bg-surface-elevated p-5">
        <h3 className="font-medium mb-2">{title}</h3>
        <p className="text-sm text-text-muted">No matches found.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-surface-muted bg-surface-elevated overflow-hidden">
      <div className="px-5 py-3 border-b border-surface-muted flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <span className="text-xs text-text-muted">{events.length} matches</span>
      </div>
      <ul className="divide-y divide-surface-muted">
        {events.map((event) => (
          <MatchRow
            key={event.match.id}
            event={event}
            team={team}
            from={location.pathname + location.search}
          />
        ))}
      </ul>
    </div>
  )
}

function MatchRow({
  event,
  team,
  from,
}: {
  event: ScheduleEvent
  team: TeamIndexEntry
  from: string
}) {
  const opponent = getOpponent(event, team)
  const won = didTeamWin(event, team)

  const navState: MatchNavigationState = {
    from,
    startTime: event.startTime,
    blockName: event.blockName,
  }

  return (
    <li>
      <Link
        to={`/match/${event.match.id}`}
        state={navState}
        className="w-full px-5 py-3 flex items-center gap-4 hover:bg-surface/50 transition-colors"
      >
        <div className="w-16 shrink-0 text-xs text-text-muted">{formatDate(event.startTime)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            vs {opponent?.name ?? 'Unknown'}
          </p>
          <p className="text-xs text-text-muted">
            {event.league.name}
            {event.blockName ? ` · ${event.blockName}` : ''}
            {' · Bo'}
            {event.match.strategy.count}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-mono">{formatSeriesScore(event, team)}</p>
          {won != null && (
            <span
              className={`text-xs font-medium ${
                won ? 'text-success' : 'text-danger'
              }`}
            >
              {won ? 'W' : 'L'}
            </span>
          )}
        </div>
        <span className="text-text-muted text-xs shrink-0">→</span>
      </Link>
    </li>
  )
}
