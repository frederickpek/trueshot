import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { useAllUpcomingEvents, useAllRecentEvents, useTeamsIndex } from '../hooks/useTeamData'
import { getEventDetails } from '../api/lolesports'
import { getLeagueLabel, TIER1_LEAGUE_SLUGS, INTERNATIONAL_LEAGUE_SLUGS } from '../lib/leagues'
import type { EventDetails, ScheduleEvent } from '../api/types'

function useRecentScores(matchIds: string[]) {
  const queries = useQueries({
    queries: matchIds.map((id) => ({
      queryKey: ['recent-score', id],
      queryFn: () => getEventDetails(id),
      staleTime: Infinity,
      retry: 1,
    })),
  })

  return useMemo(() => {
    const map = new Map<string, EventDetails>()
    queries.forEach((q, i) => {
      if (q.data) map.set(matchIds[i], q.data)
    })
    return map
  }, [queries, matchIds])
}

function useLiveMatchDetails(events: ScheduleEvent[]) {
  const now = Date.now()
  const liveIds = useMemo(
    () => events
      .filter((e) => new Date(e.startTime).getTime() <= now)
      .map((e) => e.match.id),
    [events, now],
  )

  const queries = useQueries({
    queries: liveIds.map((id) => ({
      queryKey: ['upcoming-check', id],
      queryFn: () => getEventDetails(id),
      staleTime: 0,
      refetchInterval: (query: { state: { data?: { match: { games: Array<{ state: string }> } } } }) => {
        const allDone = query.state.data?.match.games.every(
          (g) => g.state === 'completed' || g.state === 'unneeded',
        )
        return allDone ? false : 60_000
      },
      retry: 1,
    })),
  })

  return useMemo(() => {
    const completedIds = new Set<string>()
    const detailsMap = new Map<string, EventDetails>()
    queries.forEach((q, i) => {
      if (q.data) detailsMap.set(liveIds[i], q.data)
      const allDone = q.data?.match.games.every(
        (g) => g.state === 'completed' || g.state === 'unneeded',
      )
      if (allDone) completedIds.add(liveIds[i])
    })
    return { completedIds, detailsMap }
  }, [queries, liveIds])
}

export function UpcomingPage() {
  const { events: allEvents, isLoading } = useAllUpcomingEvents()
  const { events: recentFromCache } = useAllRecentEvents()
  const index = useTeamsIndex()
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const { completedIds, detailsMap: liveDetails } = useLiveMatchDetails(allEvents)
  const newlyCompletedRef = useRef<ScheduleEvent[]>([])

  const cacheIds = useMemo(() => new Set(recentFromCache.map((e) => e.match.id)), [recentFromCache])
  completedIds.forEach((id) => {
    if (!cacheIds.has(id) && !newlyCompletedRef.current.some((e) => e.match.id === id)) {
      const ev = allEvents.find((e) => e.match.id === id)
      if (ev) newlyCompletedRef.current.push(ev)
    }
  })

  const recentEvents = useMemo(() => {
    const merged = [...recentFromCache, ...newlyCompletedRef.current]
    const seen = new Set<string>()
    return merged
      .filter((e) => {
        if (seen.has(e.match.id)) return false
        seen.add(e.match.id)
        return true
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [recentFromCache, completedIds])

  const findSlug = (code: string) =>
    index.data?.teams.find((t) => t.code.toLowerCase() === code.toLowerCase())?.slug

  const events = (leagueFilter === 'all'
    ? allEvents
    : allEvents.filter((e) => e.league.slug === leagueFilter)
  ).filter((e) => !completedIds.has(e.match.id))

  const recentMatchIds = useMemo(() => recentEvents.map((e) => e.match.id), [recentEvents])
  const recentScores = useRecentScores(recentMatchIds)

  const verifiedRecentIds = new Set<string>()
  const notActuallyCompleted: ScheduleEvent[] = []
  for (const e of recentEvents) {
    const details = recentScores.get(e.match.id)
    if (!details) continue
    const allDone = details.match.games.every((g) => g.state === 'completed' || g.state === 'unneeded')
    if (allDone) {
      verifiedRecentIds.add(e.match.id)
    } else {
      notActuallyCompleted.push(e)
    }
  }
  const verifiedRecent = recentEvents.filter((e) => verifiedRecentIds.has(e.match.id))

  const allUpcoming = [...events, ...notActuallyCompleted]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const filteredUpcoming = leagueFilter === 'all'
    ? allUpcoming
    : allUpcoming.filter((e) => e.league.slug === leagueFilter)

  const filteredRecent = leagueFilter === 'all'
    ? verifiedRecent
    : verifiedRecent.filter((e) => e.league.slug === leagueFilter)

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

      {filteredRecent.length > 0 && (
        <div className="overflow-hidden">
          <div className="h-1.5 bg-steel/40" />
          <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-muted flex items-center justify-between">
              <span className="font-heading text-xl text-text tracking-[0.08em]">
                Recently Completed
              </span>
              <span className="text-[0.6875rem] font-medium text-text-muted tracking-[0.15em]">
                {filteredRecent.length} matches
              </span>
            </div>
            <ul className="divide-y divide-surface-muted">
              {filteredRecent.map((event) => (
                <RecentRow key={event.match.id} event={event} findSlug={findSlug} details={recentScores.get(event.match.id)} />
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="overflow-hidden">
        <div className="h-1.5 bg-accent" />
        <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-muted flex items-center justify-between">
            <span className="font-heading text-xl text-text tracking-[0.08em]">
              Schedule
            </span>
            <span className="text-[0.6875rem] font-medium text-text-muted tracking-[0.15em]">
              {filteredUpcoming.length} matches
            </span>
          </div>
          {filteredUpcoming.length === 0 ? (
            <div className="px-5 py-8 text-center text-text-muted tracking-[0.15em] text-sm">
              No upcoming matches scheduled.
            </div>
          ) : (
            <ul className="divide-y divide-surface-muted">
              {filteredUpcoming.map((event) => (
                <UpcomingRow key={event.match.id} event={event} findSlug={findSlug} details={liveDetails.get(event.match.id) ?? recentScores.get(event.match.id)} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function UpcomingRow({ event, findSlug, details }: { event: ScheduleEvent; findSlug: (code: string) => string | undefined; details?: EventDetails }) {
  const [teamA, teamB] = event.match.teams
  const countdown = useCountdown(event.startTime)
  const isLive = countdown === 'Live'
  const bothConfirmed = teamA?.name && teamA.name !== 'TBD' && teamB?.name && teamB.name !== 'TBD'
  const winsA = details?.match.teams[0]?.result.gameWins ?? 0
  const winsB = details?.match.teams[1]?.result.gameWins ?? 0

  return (
    <li className="flex">
      <div className={`w-1 shrink-0 ${isLive ? 'bg-accent' : 'bg-surface-muted'}`} />
      <div className="w-full px-5 py-2 flex items-center gap-4">
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
        <div className="shrink-0 w-40 text-[0.6875rem] font-medium text-text-muted tracking-[0.08em] whitespace-nowrap">
          {getLeagueLabel(event.league.slug)}
          {event.blockName ? ` · ${event.blockName}` : ''}
          {' · Bo'}{event.match.strategy.count}
        </div>
        <div className="flex items-center gap-[0.625rem] text-[1.125rem] font-semibold tracking-[0.08em]">
          {findSlug(teamA?.code) ? (
            <Link to={`/team/${findSlug(teamA.code)}`} className="truncate text-right w-14 underline decoration-text-muted/30 underline-offset-2 hover:text-accent transition-colors">
              {teamA.code}
            </Link>
          ) : (
            <span className="truncate text-right w-14">{teamA?.code ?? 'TBD'}</span>
          )}
          <img src={teamA?.image} alt="" className="w-[2rem] h-[2rem] object-contain shrink-0" />
          {isLive ? (
            <span className="font-heading text-[1rem] tracking-[0.1em] w-12 text-center">{winsA} - {winsB}</span>
          ) : (
            <span className="text-text-muted text-[0.75rem] w-12 text-center">vs</span>
          )}
          <img src={teamB?.image} alt="" className="w-[2rem] h-[2rem] object-contain shrink-0" />
          {findSlug(teamB?.code) ? (
            <Link to={`/team/${findSlug(teamB.code)}`} className="truncate w-14 underline decoration-text-muted/30 underline-offset-2 hover:text-accent transition-colors">
              {teamB.code}
            </Link>
          ) : (
            <span className="truncate w-14">{teamB?.code ?? 'TBD'}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {isLive && (
            <Link
              to={`/match/${event.match.id}`}
              state={{ from: '/upcoming', startTime: event.startTime, blockName: event.blockName }}
              className="px-2.5 py-1 text-[0.625rem] font-semibold tracking-[0.1em] bg-accent text-white hover:bg-accent/80 transition-colors"
            >
              View Match
            </Link>
          )}
          {bothConfirmed && (
            <Link
              to={`/?teamA=${findSlug(teamA.code) ?? ''}&teamB=${findSlug(teamB.code) ?? ''}`}
              className="px-2.5 py-1 text-[0.625rem] font-semibold tracking-[0.1em] bg-surface-muted text-text-muted hover:bg-accent/20 hover:text-accent transition-colors"
            >
              Compare
            </Link>
          )}
        </div>
      </div>
    </li>
  )
}

function RecentRow({ event, findSlug, details }: { event: ScheduleEvent; findSlug: (code: string) => string | undefined; details?: EventDetails }) {
  const [teamA, teamB] = event.match.teams
  const winsA = details?.match.teams[0]?.result.gameWins ?? teamA?.result?.gameWins ?? 0
  const winsB = details?.match.teams[1]?.result.gameWins ?? teamB?.result?.gameWins ?? 0
  const bothConfirmed = teamA?.name && teamA.name !== 'TBD' && teamB?.name && teamB.name !== 'TBD'

  return (
    <li className="flex">
      <div className="w-1 shrink-0 bg-steel/40" />
      <div className="w-full px-5 py-2 flex items-center gap-4">
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
        <div className="shrink-0 w-40 text-[0.6875rem] font-medium text-text-muted tracking-[0.08em] whitespace-nowrap">
          {getLeagueLabel(event.league.slug)}
          {event.blockName ? ` · ${event.blockName}` : ''}
          {' · Bo'}{event.match.strategy.count}
        </div>
        <div className="flex items-center gap-[0.625rem] text-[1.125rem] font-semibold tracking-[0.08em]">
          {findSlug(teamA?.code) ? (
            <Link to={`/team/${findSlug(teamA.code)}`} className={`truncate text-right w-14 underline decoration-text-muted/30 underline-offset-2 hover:text-accent transition-colors ${winsA > winsB ? 'text-teal' : ''}`}>
              {teamA.code}
            </Link>
          ) : (
            <span className={`truncate text-right w-14 ${winsA > winsB ? 'text-teal' : ''}`}>{teamA?.code ?? 'TBD'}</span>
          )}
          <img src={teamA?.image} alt="" className="w-[2rem] h-[2rem] object-contain shrink-0" />
          <span className="font-heading text-[1rem] tracking-[0.1em] w-12 text-center">{winsA} - {winsB}</span>
          <img src={teamB?.image} alt="" className="w-[2rem] h-[2rem] object-contain shrink-0" />
          {findSlug(teamB?.code) ? (
            <Link to={`/team/${findSlug(teamB.code)}`} className={`truncate w-14 underline decoration-text-muted/30 underline-offset-2 hover:text-accent transition-colors ${winsB > winsA ? 'text-teal' : ''}`}>
              {teamB.code}
            </Link>
          ) : (
            <span className={`truncate w-14 ${winsB > winsA ? 'text-teal' : ''}`}>{teamB?.code ?? 'TBD'}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <Link
            to={`/match/${event.match.id}`}
            state={{ from: '/upcoming', startTime: event.startTime, blockName: event.blockName }}
            className="px-2.5 py-1 text-[0.625rem] font-semibold tracking-[0.1em] bg-accent text-white hover:bg-accent/80 transition-colors"
          >
            View Match
          </Link>
          {bothConfirmed && (
            <Link
              to={`/?teamA=${findSlug(teamA.code) ?? ''}&teamB=${findSlug(teamB.code) ?? ''}`}
              className="px-2.5 py-1 text-[0.625rem] font-semibold tracking-[0.1em] bg-surface-muted text-text-muted hover:bg-accent/20 hover:text-accent transition-colors"
            >
              Compare
            </Link>
          )}
        </div>
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
