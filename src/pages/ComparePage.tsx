import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import type { EventDetails, ScheduleEvent, TeamIndexEntry } from '../api/types'
import { getEventDetails } from '../api/lolesports'
import { HeadToHeadTable } from '../components/HeadToHeadTable'
import { MatchHistoryList } from '../components/MatchHistoryList'
import { TeamCompareCard } from '../components/TeamCompareCard'
import { TeamSelector } from '../components/TeamSelector'
import {
  useAllRecentEvents,
  useAllUpcomingEvents,
  useInternationalSchedules,
  useLeagueSchedule,
  useTeamDetails,
  useTeamElos,
  useTeamsIndex,
} from '../hooks/useTeamData'
import { getLeagueLabel, TIER1_LEAGUE_SLUGS } from '../lib/leagues'
import {
  computeRecord,
  filterCompletedEvents,
  filterCompletedOrLiveEvents,
  filterEventsForTeam,
  getHeadToHead,
} from '../lib/match-utils'

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const index = useTeamsIndex()
  const elos = useTeamElos()

  const [leagueA, setLeagueA] = useState('lck')
  const [leagueB, setLeagueB] = useState('lck')
  const [compareFlash, setCompareFlash] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)
  const paramA = searchParams.get('teamA') ?? 't1'
  const paramB = searchParams.get('teamB') ?? 'hanwha-life-esports'
  const sameTeam = paramA && paramB && paramA === paramB
  const [teamSlugA, setTeamSlugA] = useState(sameTeam ? 't1' : paramA)
  const [teamSlugB, setTeamSlugB] = useState(sameTeam ? 'hanwha-life-esports' : paramB)

  const teams = index.data?.teams ?? []

  const teamA = useMemo(
    () => teams.find((t) => t.slug === teamSlugA),
    [teams, teamSlugA],
  )
  const teamB = useMemo(
    () => teams.find((t) => t.slug === teamSlugB),
    [teams, teamSlugB],
  )

  const scheduleA = useLeagueSchedule(teamA?.leagueId, teamA?.leagueSlug)
  const scheduleB = useLeagueSchedule(teamB?.leagueId, teamB?.leagueSlug)
  const intlResults = useInternationalSchedules()
  const detailsA = useTeamDetails(teamSlugA || undefined)
  const detailsB = useTeamDetails(teamSlugB || undefined)

  useEffect(() => {
    if (teamA) setLeagueA(teamA.leagueSlug)
  }, [teamA])

  useEffect(() => {
    if (teamB) setLeagueB(teamB.leagueSlug)
  }, [teamB])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (teamSlugA) params.teamA = teamSlugA
    if (teamSlugB) params.teamB = teamSlugB
    setSearchParams(params, { replace: true })
  }, [teamSlugA, teamSlugB, setSearchParams])

  const intlEvents = useMemo(
    () => intlResults.flatMap((q) => q.data ?? []),
    [intlResults],
  )

  const combinedSchedule = useMemo(() => {
    const all = [...(scheduleA.data ?? []), ...(scheduleB.data ?? []), ...intlEvents]
    const seen = new Set<string>()
    return all.filter((e) => {
      if (seen.has(e.match.id)) return false
      seen.add(e.match.id)
      return true
    })
  }, [scheduleA.data, scheduleB.data, intlEvents])

  const recentA = teamA
    ? filterCompletedOrLiveEvents(filterEventsForTeam(combinedSchedule, teamA)).slice(0, 10)
    : []
  const recentB = teamB
    ? filterCompletedOrLiveEvents(filterEventsForTeam(combinedSchedule, teamB)).slice(0, 10)
    : []
  const h2h =
    teamA && teamB
      ? filterCompletedEvents(getHeadToHead(combinedSchedule, teamA, teamB))
      : []

  const recordA = teamA ? computeRecord(recentA, teamA) : undefined
  const recordB = teamB ? computeRecord(recentB, teamB) : undefined

  const eloA = teamA ? elos.ranked.get(teamA.code) : undefined
  const eloB = teamB ? elos.ranked.get(teamB.code) : undefined

  const handleLeagueA = (slug: string) => {
    setLeagueA(slug)
    const first = teams.find((t) => t.leagueSlug === slug && t.slug !== teamSlugB)
    setTeamSlugA(first?.slug ?? '')
  }

  const handleLeagueB = (slug: string) => {
    setLeagueB(slug)
    const first = teams.find((t) => t.leagueSlug === slug && t.slug !== teamSlugA)
    setTeamSlugB(first?.slug ?? '')
  }

  if (index.isLoading) {
    return <LoadingState message="Loading teams…" />
  }

  if (index.isError) {
    return (
      <ErrorState message="Failed to load team data. Run npm run sync-data to generate cached data." />
    )
  }

  const mainContent = (
    <div className="space-y-8">
      <section>
        <h2 className="font-heading text-4xl text-accent tracking-[0.1em] leading-none">
          Compare Teams
        </h2>
        <p className="text-text-muted text-xs tracking-[0.15em] mt-2 mb-6">
          Pick two teams from major regions to compare stats, recent form, and head-to-head history.
        </p>

        <div
          ref={selectorRef}
          className="grid md:grid-cols-2 gap-6"
          style={compareFlash ? { animation: 'compare-flash 0.6s ease-out forwards' } : undefined}
          onAnimationEnd={() => setCompareFlash(false)}
        >
          <TeamSelector
            label="Team A"
            leagueSlug={leagueA}
            teamSlug={teamSlugA}
            leagues={[...TIER1_LEAGUE_SLUGS]}
            teams={teams}
            onLeagueChange={handleLeagueA}
            onTeamChange={setTeamSlugA}
            side="left"
            excludeSlug={teamSlugB}
          />
          <TeamSelector
            label="Team B"
            leagueSlug={leagueB}
            teamSlug={teamSlugB}
            leagues={[...TIER1_LEAGUE_SLUGS]}
            teams={teams}
            onLeagueChange={handleLeagueB}
            onTeamChange={setTeamSlugB}
            excludeSlug={teamSlugA}
          />
        </div>
      </section>

      {teamA && teamB && (
        <>
          <section className="grid md:grid-cols-2 gap-6">
            <TeamCompareCard
              team={teamA}
              elo={eloA}
              record={recordA}
              roster={detailsA.data?.players}
              loading={detailsA.isLoading || scheduleA.isLoading}
              side="left"
            />
            <TeamCompareCard
              team={teamB}
              elo={eloB}
              record={recordB}
              roster={detailsB.data?.players}
              loading={detailsB.isLoading || scheduleB.isLoading}
              side="right"
            />
          </section>

          {eloA && eloB && (
            <WinProbabilityBar teamA={teamA} teamB={teamB} eloA={eloA.elo} eloB={eloB.elo} />
          )}

          <HeadToHeadTable events={h2h} teamA={teamA} teamB={teamB} />

          <section className="grid md:grid-cols-2 gap-6">
            <MatchHistoryList
              events={recentA}
              team={teamA}
            />
            <MatchHistoryList
              events={recentB}
              team={teamB}
            />
          </section>
        </>
      )}

      {(!teamSlugA || !teamSlugB) && (
        <div className=" border-2 border-dashed border-surface-muted p-12 text-center text-text-muted tracking-[0.15em] text-sm">
          Select two teams above to see comparison stats.
        </div>
      )}
    </div>
  )

  return (
    <UpcomingSidebarLayout
      teams={teams}
      elos={elos.ranked}
      onCompare={(slugA, slugB) => {
        const tA = teams.find((t) => t.slug === slugA)
        const tB = teams.find((t) => t.slug === slugB)
        if (tA) setLeagueA(tA.leagueSlug)
        if (tB) setLeagueB(tB.leagueSlug)
        setTeamSlugA(slugA)
        setTeamSlugB(slugB)
        selectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        setCompareFlash(false)
        requestAnimationFrame(() => setCompareFlash(true))
      }}
    >
      {mainContent}
    </UpcomingSidebarLayout>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-24 text-text-muted tracking-[0.3em] text-xs">
      {message}
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className=" border-2 border-danger/30 bg-danger/5 p-6 text-danger text-sm tracking-[0.1em]">
      {message}
    </div>
  )
}

const UPCOMING_48H = 48 * 60 * 60 * 1000

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
      queryKey: ['match', id],
      queryFn: () => getEventDetails(id),
      staleTime: 0,
      refetchInterval: (query: { state: { data?: EventDetails } }) => {
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

function useSidebarUpcoming(teams: TeamIndexEntry[]) {
  const { events: allEvents } = useAllUpcomingEvents()
  const { events: recentFromCache } = useAllRecentEvents()
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

  const recentMatchIds = useMemo(() => recentEvents.map((e) => e.match.id), [recentEvents])
  const recentScores = useRecentScores(recentMatchIds)

  const notActuallyCompleted: ScheduleEvent[] = []
  for (const e of recentEvents) {
    const details = recentScores.get(e.match.id)
    if (!details) continue
    const allDone = details.match.games.every((g) => g.state === 'completed' || g.state === 'unneeded')
    if (!allDone) notActuallyCompleted.push(e)
  }

  const upcomingBase = [...allEvents.filter((e) => !completedIds.has(e.match.id)), ...notActuallyCompleted]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const now = Date.now()
  const cutoff = now + UPCOMING_48H
  const filtered = useMemo(() => {
    return upcomingBase
      .filter((e) => {
        const [a, b] = e.match.teams
        if (!a?.name || a.name === 'TBD' || !b?.name || b.name === 'TBD') return false
        return new Date(e.startTime).getTime() <= cutoff
      })
      .slice(0, 10)
  }, [upcomingBase, cutoff])

  const findSlug = (code: string) =>
    teams.find((t) => t.code.toLowerCase() === code.toLowerCase())?.slug

  const allDetails = useMemo(() => {
    const map = new Map<string, EventDetails>()
    for (const [id, d] of recentScores) map.set(id, d)
    for (const [id, d] of liveDetails) map.set(id, d)
    return map
  }, [recentScores, liveDetails])

  return { events: filtered, allDetails, findSlug }
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

function UpcomingSidebarLayout({
  teams,
  onCompare,
  elos,
  children,
}: {
  teams: TeamIndexEntry[]
  onCompare: (slugA: string, slugB: string) => void
  elos: Map<string, { elo: number }>
  children: React.ReactNode
}) {
  const { events, allDetails, findSlug } = useSidebarUpcoming(teams)

  if (events.length === 0) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      <aside className="hidden 2xl:block absolute left-0 top-0 w-72 -translate-x-[calc(100%+1.5rem)]">
        <div className="sticky top-4">
          <div className="h-1.5 bg-accent" />
          <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted">
            <div className="px-4 py-2.5 border-b border-surface-muted">
              <span className="font-heading text-sm text-text tracking-[0.08em]">
                Upcoming
              </span>
            </div>
            <ul className="divide-y divide-surface-muted">
              {events.map((event) => (
                <SidebarRow
                  key={event.match.id}
                  event={event}
                  findSlug={findSlug}
                  details={allDetails.get(event.match.id)}
                  onCompare={onCompare}
                  elos={elos}
                />
              ))}
            </ul>
          </div>
        </div>
      </aside>
      {children}
    </div>
  )
}

function SidebarRow({
  event,
  findSlug,
  details,
  onCompare,
  elos,
}: {
  event: ScheduleEvent
  findSlug: (code: string) => string | undefined
  details?: EventDetails
  onCompare: (slugA: string, slugB: string) => void
  elos: Map<string, { elo: number }>
}) {
  const [teamA, teamB] = event.match.teams
  const countdown = useCountdown(event.startTime)
  const isLive = countdown === 'Live'
  const detailA = details?.match.teams.find((t) => t.code === teamA?.code)
  const detailB = details?.match.teams.find((t) => t.code === teamB?.code)
  const winsA = detailA?.result.gameWins ?? 0
  const winsB = detailB?.result.gameWins ?? 0
  const slugA = findSlug(teamA?.code) ?? ''
  const slugB = findSlug(teamB?.code) ?? ''

  const eloA = elos.get(teamA?.code)?.elo
  const eloB = elos.get(teamB?.code)?.elo
  const pctA = eloA && eloB ? Math.round(eloWinProbability(eloA, eloB) * 100) : null

  return (
    <li className="group relative overflow-hidden">
      <div className={`absolute left-0 top-0 w-1 h-full ${isLive ? 'bg-accent' : 'bg-surface-muted'}`} />
      <div className="px-5 pt-2 pb-2">
        <div className="flex items-center gap-1.5 mb-1 text-[0.625rem] font-medium tracking-[0.08em] text-text-muted">
          {isLive && (
            <span className="flex items-center gap-1.5 text-accent">
              <span className="relative flex h-[0.3125rem] w-[0.3125rem] shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-[0.3125rem] w-[0.3125rem] rounded-full bg-accent" />
              </span>
              Live
            </span>
          )}
          <span>
            {new Date(event.startTime).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
            {', '}
            {new Date(event.startTime).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
            {' — '}
            {getLeagueLabel(event.league.slug)}
            {event.blockName ? ` · ${event.blockName}` : ''}
            {' · Bo'}{event.match.strategy.count}
          </span>
        </div>
        <div className="flex items-center justify-between">
          {slugA ? (
            <Link to={`/team/${slugA}`} className="font-heading text-[1.125rem] tracking-[0.06em] truncate text-right underline decoration-text-muted/30 underline-offset-2 hover:text-accent transition-colors">
              {teamA.code}
            </Link>
          ) : (
            <span className="font-heading text-[1.125rem] tracking-[0.06em] truncate text-right">{teamA?.code ?? 'TBD'}</span>
          )}
          <div className="flex items-center gap-[0.5rem] shrink-0">
            <img src={teamA?.image} alt="" className="w-[2.75rem] h-[2.75rem] object-contain" />
            {isLive ? (
              <span className="font-heading text-[0.8125rem] tracking-[0.1em] w-[2.5rem] text-center whitespace-nowrap">{winsA} - {winsB}</span>
            ) : (
              <span className="text-text-muted text-[0.75rem] w-[2.5rem] text-center whitespace-nowrap">vs</span>
            )}
            <img src={teamB?.image} alt="" className="w-[2.75rem] h-[2.75rem] object-contain" />
          </div>
          {slugB ? (
            <Link to={`/team/${slugB}`} className="font-heading text-[1.125rem] tracking-[0.06em] truncate text-left underline decoration-text-muted/30 underline-offset-2 hover:text-accent transition-colors">
              {teamB.code}
            </Link>
          ) : (
            <span className="font-heading text-[1.125rem] tracking-[0.06em] truncate text-left">{teamB?.code ?? 'TBD'}</span>
          )}
        </div>
        {pctA !== null && (
          <div className="flex h-[4px] mt-2.5">
            <div className="bg-teal/60" style={{ width: `${pctA}%` }} />
            <div className="bg-accent/60" style={{ width: `${100 - pctA}%` }} />
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out">
        <button
          type="button"
          onClick={() => onCompare(slugA, slugB)}
          className="flex-1 py-2 text-[0.5625rem] font-semibold tracking-[0.12em] bg-teal/70 text-black hover:bg-teal transition-colors text-center backdrop-blur-sm"
        >
          Compare
        </button>
        {isLive && (
          <Link
            to={`/match/${event.match.id}`}
            state={{ from: '/', startTime: event.startTime, blockName: event.blockName }}
            className="flex-1 py-2 text-[0.5625rem] font-semibold tracking-[0.12em] bg-accent/70 text-white hover:bg-accent transition-colors text-center backdrop-blur-sm"
          >
            View Match
          </Link>
        )}
      </div>
    </li>
  )
}

function eloWinProbability(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

function WinProbabilityBar({
  teamA,
  teamB,
  eloA,
  eloB,
}: {
  teamA: TeamIndexEntry
  teamB: TeamIndexEntry
  eloA: number
  eloB: number
}) {
  const probA = eloWinProbability(eloA, eloB)
  const pctA = Math.round(probA * 100)
  const pctB = 100 - pctA

  return (
    <section>
      <div className="h-1.5 bg-steel" />
      <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted p-5">
        <span className="font-heading text-xl text-text tracking-[0.08em]">
          Trueshot Match Prediction
        </span>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs font-semibold tracking-[0.1em] text-text-muted w-16 text-right shrink-0 truncate">
            {teamA.code}
          </span>
          <div className="flex-1 flex h-6">
            <div
              className="bg-teal/80 flex items-center justify-start px-3 transition-all duration-500"
              style={{ width: `${pctA}%` }}
            >
              <span className="text-xs font-heading tracking-wider text-surface">{pctA}%</span>
            </div>
            <div
              className="bg-accent/80 flex items-center justify-end px-3 transition-all duration-500"
              style={{ width: `${pctB}%` }}
            >
              <span className="text-xs font-heading tracking-wider text-surface">{pctB}%</span>
            </div>
          </div>
          <span className="text-xs font-semibold tracking-[0.1em] text-text-muted w-16 shrink-0 truncate">
            {teamB.code}
          </span>
        </div>
      </div>
    </section>
  )
}
