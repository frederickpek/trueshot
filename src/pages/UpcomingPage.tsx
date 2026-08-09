import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAllUpcomingEvents } from '../hooks/useTeamData'
import { getLeagueLabel, TIER1_LEAGUE_SLUGS, INTERNATIONAL_LEAGUE_SLUGS } from '../lib/leagues'
import type { ScheduleEvent } from '../api/types'

export function UpcomingPage() {
  const { events: allEvents, isLoading } = useAllUpcomingEvents()
  const [leagueFilter, setLeagueFilter] = useState<string>('all')

  const events = leagueFilter === 'all'
    ? allEvents
    : allEvents.filter((e) => e.league.slug === leagueFilter)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted tracking-[0.3em] text-xs">
        Loading upcoming matches…
      </div>
    )
  }


  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-4xl text-accent tracking-[0.1em] leading-none">
          Upcoming Matches
        </h2>
        <p className="text-text-muted text-xs tracking-[0.15em] mt-2 mb-4">
          Scheduled matches across all regions and international tournaments.
        </p>
        <div className="flex flex-wrap gap-[3px]">
          <button
            type="button"
            onClick={() => setLeagueFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold tracking-[0.1em] transition-colors ${
              leagueFilter === 'all'
                ? 'bg-accent text-white'
                : 'bg-surface-muted text-text-muted hover:bg-accent/20 hover:text-accent'
            }`}
          >
            All
          </button>
          {TIER1_LEAGUE_SLUGS.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => setLeagueFilter(slug)}
              className={`px-3 py-1.5 text-xs font-semibold tracking-[0.1em] transition-colors ${
                leagueFilter === slug
                  ? 'bg-accent text-white'
                  : 'bg-surface-muted text-text-muted hover:bg-accent/20 hover:text-accent'
              }`}
            >
              {getLeagueLabel(slug)}
            </button>
          ))}
          {INTERNATIONAL_LEAGUE_SLUGS.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => setLeagueFilter(slug)}
              className={`px-3 py-1.5 text-xs font-semibold tracking-[0.1em] transition-colors ${
                leagueFilter === slug
                  ? 'bg-teal text-white'
                  : 'bg-surface-muted text-text-muted hover:bg-teal/20 hover:text-teal'
              }`}
            >
              {getLeagueLabel(slug)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="h-1.5 bg-accent" />
        <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-muted flex items-center justify-between">
            <span className="font-heading text-xl text-text tracking-[0.08em]">
              Schedule
            </span>
            <span className="text-[0.6875rem] font-medium text-text-muted tracking-[0.15em]">
              {events.length} matches
            </span>
          </div>
          {events.length === 0 ? (
            <div className="px-5 py-8 text-center text-text-muted tracking-[0.15em] text-sm">
              No upcoming matches scheduled.
            </div>
          ) : (
            <ul className="divide-y divide-surface-muted">
              {events.map((event) => (
                <UpcomingRow key={event.match.id} event={event} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function UpcomingRow({ event }: { event: ScheduleEvent }) {
  const [teamA, teamB] = event.match.teams
  const countdown = useCountdown(event.startTime)
  const isLive = countdown === 'Live'

  const content = (
    <>
      <div className={`shrink-0 w-14 text-xs font-medium tracking-[0.08em] whitespace-nowrap flex items-center gap-2 ${isLive ? 'text-accent' : 'text-text-muted'}`}>
        {isLive && (
          <span className="relative flex h-[0.4375rem] w-[0.4375rem] shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-[0.4375rem] w-[0.4375rem] rounded-full bg-accent" />
          </span>
        )}
        {countdown}
      </div>
      <div className="shrink-0 w-32 text-xs font-medium text-text-muted tracking-[0.08em] whitespace-nowrap">
        {new Date(event.startTime).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
        {' · '}
        {new Date(event.startTime).toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate tracking-[0.08em]">
          {teamA?.name ?? 'TBD'} vs {teamB?.name ?? 'TBD'}
        </p>
        <p className="text-[0.6875rem] font-medium text-text-muted tracking-[0.08em]">
          {getLeagueLabel(event.league.slug)}
          {event.blockName ? ` · ${event.blockName}` : ''}
          {' · Bo'}{event.match.strategy.count}
        </p>
      </div>
      {isLive && (
        <span className="text-text-muted text-xs shrink-0 group-hover:text-accent transition-colors">
          →
        </span>
      )}
    </>
  )

  if (isLive) {
    return (
      <li className="flex">
        <div className="w-1 shrink-0 bg-accent" />
        <Link
          to={`/match/${event.match.id}`}
          state={{ from: '/upcoming', startTime: event.startTime, blockName: event.blockName }}
          className="w-full px-5 py-3 flex items-center gap-4 hover:bg-surface-muted/30 transition-colors group"
        >
          {content}
        </Link>
      </li>
    )
  }

  return (
    <li className="flex">
      <div className="w-1 shrink-0 bg-surface-muted" />
      <div className="w-full px-5 py-3 flex items-center gap-4">
        {content}
      </div>
    </li>
  )
}

function useCountdown(target: string) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const diff = new Date(target).getTime() - now
  if (diff <= 0) return 'Live'

  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}
