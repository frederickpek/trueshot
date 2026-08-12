import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { getGameDetails } from '../api/lolesports'
import type { DetailsParticipant, GameDetail } from '../api/types'

const POLL_INTERVAL = 10_000

export function useGameDetails(games: GameDetail[]) {
  const active = useMemo(
    () => games.filter((game) => game.state === 'completed' || game.state === 'inProgress'),
    [games],
  )

  const queries = useQueries({
    queries: active.map((game) => ({
      queryKey: ['game-details', game.id],
      queryFn: () => getGameDetails(game.id),
      staleTime: game.state === 'inProgress' ? 0 : 1000 * 60 * 60,
      refetchInterval: game.state === 'inProgress' ? POLL_INTERVAL : false as const,
      retry: 1,
    })),
  })

  const detailsByGameId = useMemo(() => {
    const map = new Map<string, { participants?: Map<number, DetailsParticipant>; isLoading: boolean }>()
    active.forEach((game, index) => {
      const query = queries[index]
      let participants: Map<number, DetailsParticipant> | undefined
      if (query.data?.frames.length) {
        const lastFrame = query.data.frames[query.data.frames.length - 1]
        participants = new Map(lastFrame.participants.map((p) => [p.participantId, p]))
      }
      map.set(game.id, { participants, isLoading: query.isLoading })
    })
    return map
  }, [active, queries])

  return { detailsByGameId }
}
