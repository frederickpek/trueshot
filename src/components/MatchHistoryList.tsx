import { Link, useLocation } from 'react-router-dom'
import type { MatchNavigationState, ScheduleEvent, TeamIndexEntry } from '../api/types'
import {
  didTeamWin,
  formatDate,
  getOpponent,
  getTeamFromEvent,
} from '../lib/match-utils'

interface MatchHistoryListProps {
  events: ScheduleEvent[]
  team: TeamIndexEntry
  title?: string
  showTeamName?: boolean
  upcoming?: boolean
}

export function MatchHistoryList({
  events,
  team,
  title = 'Recent',
  showTeamName = true,
  upcoming = false,
}: MatchHistoryListProps) {
  const location = useLocation()

  if (events.length === 0) {
    return (
      <div>
        <div className="h-1.5 bg-steel/40 " />
        <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted  p-5">
          <span className="font-heading text-xl text-text tracking-[0.08em]">
            {showTeamName && (
              <><Link to={`/team/${team.slug}`} className="hover:text-accent underline decoration-text-muted/30 underline-offset-2 transition-colors">{team.name}</Link>{' — '}</>
            )}
            {title}
          </span>
          <p className="text-sm text-text-muted mt-2 tracking-[0.08em]">No matches found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      <div className="h-1.5 bg-steel/40 " />
      <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted  overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-muted flex items-center justify-between">
          <span className="font-heading text-xl text-text tracking-[0.08em]">
            {showTeamName && (
              <><Link to={`/team/${team.slug}`} className="hover:text-accent underline decoration-text-muted/30 underline-offset-2 transition-colors">{team.name}</Link>{' — '}</>
            )}
            {title}
          </span>
          <span className="text-[0.6875rem] font-medium text-text-muted tracking-[0.15em]">
            {events.length} matches
          </span>
        </div>
        <ul className="divide-y divide-surface-muted">
          {events.map((event) => (
            <MatchRow
              key={event.match.id}
              event={event}
              team={team}
              from={location.pathname + location.search}
              upcoming={upcoming}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

function MatchRow({
  event,
  team,
  from,
  upcoming = false,
}: {
  event: ScheduleEvent
  team: TeamIndexEntry
  from: string
  upcoming?: boolean
}) {
  const opponent = getOpponent(event, team)
  const won = didTeamWin(event, team)
  const primary = getTeamFromEvent(event, team)
  const primaryWins = primary?.result?.gameWins ?? 0
  const opponentWins = opponent?.result?.gameWins ?? 0

  const navState: MatchNavigationState = {
    from,
    startTime: event.startTime,
    blockName: event.blockName,
  }

  const content = (
    <>
      <div className="shrink-0 text-xs font-medium text-text-muted tracking-[0.08em] whitespace-nowrap">
        {formatDate(event.startTime)}
      </div>
      {opponent?.image && <img src={opponent.image} alt="" className="w-8 h-8 object-contain shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate tracking-[0.08em]">
          {opponent?.name ?? 'TBD'}
        </p>
        <p className="text-[0.6875rem] font-medium text-text-muted tracking-[0.08em] leading-tight">
          {event.league.name}
          {event.blockName ? ` · ${event.blockName}` : ''}
          {' · Bo'}
          {event.match.strategy.count}
        </p>
      </div>
      {!upcoming && (
        <>
          <span className="shrink-0 flex items-center gap-2 font-heading tracking-wider">
            <span className="text-sm text-text-muted w-8 text-right">{team.code}</span>
            <span className="text-lg w-4 text-center">{primaryWins}</span>
            <span className="text-text-muted text-sm">-</span>
            <span className="text-lg w-4 text-center">{opponentWins}</span>
            <span className="text-sm text-text-muted w-8">{opponent?.code ?? '?'}</span>
          </span>
          {won != null ? (
            <span
              className={`text-[0.625rem] font-bold tracking-[0.1em] py-0.5  shrink-0 w-10 text-center ${
                won
                  ? 'bg-success/15 text-success border border-success/30'
                  : 'bg-danger/15 text-danger border border-danger/30'
              }`}
            >
              {won ? 'WIN' : 'LOSS'}
            </span>
          ) : event.state === 'completed' ? (
            <span className="text-[0.625rem] font-bold tracking-[0.1em] py-0.5 shrink-0 w-10 text-center bg-surface-muted text-text-muted border border-surface-muted">
              —
            </span>
          ) : (
            <span className="shrink-0 w-10 flex items-center justify-center">
              <span className="relative flex h-[0.4375rem] w-[0.4375rem]">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-[0.4375rem] w-[0.4375rem] rounded-full bg-accent" />
              </span>
            </span>
          )}
          <span className="text-text-muted text-xs shrink-0 group-hover:text-accent transition-colors">
            →
          </span>
        </>
      )}
    </>
  )

  if (upcoming) {
    return (
      <li className="flex">
        <div className="w-1 shrink-0 bg-surface-muted" />
        <div className="w-full px-5 py-3 flex items-center gap-4 min-h-[4.5rem]">
          {content}
        </div>
      </li>
    )
  }

  return (
    <li className="flex">
      <div
        className={`w-1 shrink-0 ${
          won === true ? 'bg-success' : won === false ? 'bg-danger' : 'bg-surface-muted'
        }`}
      />
      <Link
        to={`/match/${event.match.id}`}
        state={navState}
        className="w-full px-5 py-3 flex items-center gap-4 min-h-[4.5rem] hover:bg-surface-muted/30 transition-colors group"
      >
        {content}
      </Link>
    </li>
  )
}
