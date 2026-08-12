import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { getGameWindow, getFirstGameWindow } from '../api/lolesports'
import type { GameDetail, GameWindow } from '../api/types'

export interface GameWindowEntry {
  data?: GameWindow
  firstData?: GameWindow
  isLoading: boolean
  isError: boolean
}

const POLL_INTERVAL = 10_000

export function useGameWindows(games: GameDetail[]) {
  const active = useMemo(
    () => games.filter((game) => game.state === 'completed' || game.state === 'inProgress'),
    [games],
  )

  const latestQueries = useQueries({
    queries: active.map((game) => ({
      queryKey: ['game-window', game.id],
      queryFn: () => getGameWindow(game.id),
      staleTime: game.state === 'inProgress' ? 0 : 1000 * 60 * 60,
      refetchInterval: game.state === 'inProgress' ? POLL_INTERVAL : false as const,
      retry: 1,
    })),
  })

  const firstQueries = useQueries({
    queries: active.map((game) => ({
      queryKey: ['game-window-first', game.id],
      queryFn: () => getFirstGameWindow(game.id),
      staleTime: Infinity,
      retry: 1,
    })),
  })

  const windowsByGameId = useMemo(() => {
    const map = new Map<string, GameWindowEntry>()
    active.forEach((game, index) => {
      const latest = latestQueries[index]
      const first = firstQueries[index]
      map.set(game.id, {
        data: latest.data,
        firstData: first.data,
        isLoading: latest.isLoading || first.isLoading,
        isError: latest.isError || first.isError,
      })
    })
    return map
  }, [active, latestQueries, firstQueries])

  return {
    windowsByGameId,
    isLoading: latestQueries.some((q) => q.isLoading) || firstQueries.some((q) => q.isLoading),
  }
}
