import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { getGameWindow } from '../api/lolesports'
import type { GameDetail, GameWindow } from '../api/types'

export function useGameWindows(games: GameDetail[]) {
  const completed = useMemo(
    () => games.filter((game) => game.state === 'completed'),
    [games],
  )

  const queries = useQueries({
    queries: completed.map((game) => ({
      queryKey: ['game-window', game.id],
      queryFn: () => getGameWindow(game.id),
      staleTime: 1000 * 60 * 60,
      retry: 1,
    })),
  })

  const windowsByGameId = useMemo(() => {
    const map = new Map<string, { data?: GameWindow; isLoading: boolean; isError: boolean }>()
    completed.forEach((game, index) => {
      const query = queries[index]
      map.set(game.id, {
        data: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
      })
    })
    return map
  }, [completed, queries])

  return { windowsByGameId, isLoading: queries.some((q) => q.isLoading) }
}
