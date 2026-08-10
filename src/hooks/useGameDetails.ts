import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { getGameDetails } from '../api/lolesports'
import type { DetailsParticipant, GameDetail } from '../api/types'

export function useGameDetails(games: GameDetail[]) {
  const completed = useMemo(
    () => games.filter((game) => game.state === 'completed'),
    [games],
  )

  const queries = useQueries({
    queries: completed.map((game) => ({
      queryKey: ['game-details', game.id],
      queryFn: () => getGameDetails(game.id),
      staleTime: 1000 * 60 * 60,
      retry: 1,
    })),
  })

  const detailsByGameId = useMemo(() => {
    const map = new Map<string, { participants?: Map<number, DetailsParticipant>; isLoading: boolean }>()
    completed.forEach((game, index) => {
      const query = queries[index]
      let participants: Map<number, DetailsParticipant> | undefined
      if (query.data?.frames.length) {
        const lastFrame = query.data.frames[query.data.frames.length - 1]
        participants = new Map(lastFrame.participants.map((p) => [p.participantId, p]))
      }
      map.set(game.id, { participants, isLoading: query.isLoading })
    })
    return map
  }, [completed, queries])

  return { detailsByGameId }
}
