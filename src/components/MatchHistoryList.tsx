import { useState } from 'react'
import type { ScheduleEvent, TeamIndexEntry } from '../api/types'
import { useMatchDetails } from '../hooks/useTeamData'
import {
  didTeamWin,
  formatDate,
  formatSeriesScore,
  getOpponent,
  getTeamFromEvent,
} from '../lib/match-utils'

interface MatchHistoryListProps {
  events: ScheduleEvent[]
  team: TeamIndexEntry
  title?: string
  expandable?: boolean
}

export function MatchHistoryList({
  events,
  team,
  title = 'Recent Matches',
  expandable = true,
}: MatchHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
      <div className="px-5 py-3 border-b border-surface-muted">
        <h3 className="font-medium">{title}</h3>
      </div>
      <ul className="divide-y divide-surface-muted">
        {events.map((event) => (
          <MatchRow
            key={event.match.id}
            event={event}
            team={team}
            expanded={expandedId === event.match.id}
            expandable={expandable}
            onToggle={() =>
              setExpandedId(expandedId === event.match.id ? null : event.match.id)
            }
          />
        ))}
      </ul>
    </div>
  )
}

function MatchRow({
  event,
  team,
  expanded,
  expandable,
  onToggle,
}: {
  event: ScheduleEvent
  team: TeamIndexEntry
  expanded: boolean
  expandable: boolean
  onToggle: () => void
}) {
  const opponent = getOpponent(event, team)
  const won = didTeamWin(event, team)
  const matchTeam = getTeamFromEvent(event, team)
  const details = useMatchDetails(expanded && expandable ? event.match.id : null)

  return (
    <li>
      <button
        type="button"
        onClick={expandable ? onToggle : undefined}
        className={`w-full px-5 py-3 flex items-center gap-4 text-left ${
          expandable ? 'hover:bg-surface/50 cursor-pointer' : ''
        }`}
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
          <p className="text-sm font-mono">{formatSeriesScore(event)}</p>
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
        {expandable && (
          <span className="text-text-muted text-xs shrink-0">{expanded ? '▲' : '▼'}</span>
        )}
      </button>

      {expanded && details.data && (
        <div className="px-5 pb-4 bg-surface/30">
          <p className="text-xs text-text-muted mb-2">Game breakdown</p>
          <div className="grid gap-2">
            {details.data.match.games.map((game) => {
              const blue = game.teams.find((t) => t.side === 'blue')
              const red = game.teams.find((t) => t.side === 'red')
              const blueTeam = details.data!.match.teams.find((t) => t.id === blue?.id)
              const redTeam = details.data!.match.teams.find((t) => t.id === red?.id)
              const teamSide = game.teams.find((t) => {
                const st = details.data!.match.teams.find((mt) => mt.id === t.id)
                return st && matchTeam && st.code === matchTeam.code
              })?.side

              return (
                <div
                  key={game.id}
                  className={`rounded-lg px-3 py-2 text-sm flex justify-between ${
                    game.state === 'completed' ? 'bg-surface-elevated' : 'opacity-50'
                  }`}
                >
                  <span>Game {game.number}</span>
                  <span className="font-mono text-xs">
                    {blueTeam?.code} vs {redTeam?.code}
                    {teamSide && game.state === 'completed' && (
                      <span className="ml-2 text-text-muted">
                        ({teamSide === 'blue' ? blueTeam?.code : redTeam?.code} side)
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {expanded && details.isLoading && (
        <p className="px-5 pb-3 text-xs text-text-muted">Loading game details…</p>
      )}
    </li>
  )
}
