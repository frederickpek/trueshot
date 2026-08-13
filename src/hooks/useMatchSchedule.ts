import { useMemo, useRef } from 'react'
import { useQueries } from '@tanstack/react-query'
import { getEventDetails } from '../api/lolesports'
import type { EventDetails, ScheduleEvent } from '../api/types'
import { isSeriesDecided } from '../lib/match-utils'
import { useAllUpcomingEvents, useAllRecentEvents } from './useTeamData'

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
        const d = query.state.data
        const allDone = d?.match.games.every(
          (g) => g.state === 'completed' || g.state === 'unneeded',
        ) || (d && isSeriesDecided(d))
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
      ) || (q.data && isSeriesDecided(q.data))
      if (allDone) completedIds.add(liveIds[i])
    })
    return { completedIds, detailsMap }
  }, [queries, liveIds])
}

export function useMatchSchedule() {
  const { events: allEvents, isLoading } = useAllUpcomingEvents()
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

  const notActuallyCompleted = useMemo(() => {
    const list: ScheduleEvent[] = []
    for (const e of recentEvents) {
      const details = recentScores.get(e.match.id)
      if (!details) continue
      if (!isSeriesDecided(details)) list.push(e)
    }
    return list
  }, [recentEvents, recentScores])

  const notCompletedIds = useMemo(() => new Set(notActuallyCompleted.map((e) => e.match.id)), [notActuallyCompleted])

  const actualRecent = useMemo(() =>
    recentEvents.filter((e) => !notCompletedIds.has(e.match.id)),
    [recentEvents, notCompletedIds],
  )

  const upcoming = useMemo(() => {
    const seen = new Set<string>()
    const recentIdSet = new Set(actualRecent.map((e) => e.match.id))
    return [
      ...allEvents.filter((e) => !completedIds.has(e.match.id) && !recentIdSet.has(e.match.id)),
      ...notActuallyCompleted,
    ]
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .filter((e) => {
        if (seen.has(e.match.id)) return false
        seen.add(e.match.id)
        return true
      })
  }, [allEvents, completedIds, actualRecent, notActuallyCompleted])

  const allDetails = useMemo(() => {
    const map = new Map<string, EventDetails>()
    for (const [id, d] of recentScores) map.set(id, d)
    for (const [id, d] of liveDetails) map.set(id, d)
    return map
  }, [recentScores, liveDetails])

  return { upcoming, recent: actualRecent, allDetails, isLoading }
}
