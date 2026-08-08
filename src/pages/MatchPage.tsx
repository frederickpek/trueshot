import { Link, useLocation, useParams } from 'react-router-dom'
import { useMatchDetails } from '../hooks/useTeamData'
import { useGameWindows } from '../hooks/useGameWindows'
import { getGameWinnerTeamId, getTeamById } from '../lib/game-utils'
import {
  formatDate,
  formatDateTime,
  formatSeriesScoreFromMatch,
  getSeriesWinner,
} from '../lib/match-utils'
import type { MatchNavigationState } from '../api/types'

export function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const location = useLocation()
  const navState = location.state as MatchNavigationState | null

  const match = useMatchDetails(matchId ?? null)
  const games = match.data?.match.games ?? []
  const { windowsByGameId, isLoading: windowsLoading } = useGameWindows(games)

  if (match.isLoading) {
    return <p className="text-text-muted py-12 text-center">Loading match…</p>
  }

  if (match.isError || !match.data) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-text-muted">Match not found.</p>
        <Link to={navState?.from ?? '/'} className="text-accent hover:underline text-sm">
          Go back
        </Link>
      </div>
    )
  }

  const event = match.data
  const [teamA, teamB] = event.match.teams
  const seriesWinner = getSeriesWinner(event.match.teams)
  const boCount = event.match.strategy.count

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={navState?.from ?? '/'}
          className="text-sm text-text-muted hover:text-accent transition-colors"
        >
          ← Back
        </Link>
      </div>

      <section className="rounded-xl border border-surface-muted bg-surface-elevated p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
          <span>{event.league.name}</span>
          {navState?.blockName && (
            <>
              <span>·</span>
              <span>{navState.blockName}</span>
            </>
          )}
          <span>·</span>
          <span>Bo{boCount}</span>
          {navState?.startTime && (
            <>
              <span>·</span>
              <span>{formatDateTime(navState.startTime)}</span>
            </>
          )}
        </div>

        <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-6 items-center">
          <TeamSide team={teamA} highlight={seriesWinner?.id === teamA.id} align="left" />
          <div className="text-center px-4">
            <p className="text-3xl font-bold font-mono tracking-wide">
              {formatSeriesScoreFromMatch(event.match.teams)}
            </p>
            {seriesWinner && (
              <p className="text-sm text-accent mt-2">{seriesWinner.name} wins</p>
            )}
          </div>
          <TeamSide team={teamB} highlight={seriesWinner?.id === teamB.id} align="right" />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Games</h3>
        {games.length === 0 && (
          <p className="text-sm text-text-muted">No game data available yet.</p>
        )}
        {games.map((game) => {
          const blueSlot = game.teams.find((t) => t.side === 'blue')
          const redSlot = game.teams.find((t) => t.side === 'red')
          const blueTeam = getTeamById(event.match.teams, blueSlot?.id ?? null)
          const redTeam = getTeamById(event.match.teams, redSlot?.id ?? null)
          const windowState = windowsByGameId.get(game.id)
          const winnerId = getGameWinnerTeamId(windowState?.data)
          const winner = getTeamById(event.match.teams, winnerId)

          return (
            <div
              key={game.id}
              className="rounded-xl border border-surface-muted bg-surface-elevated overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-surface-muted flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-medium">Game {game.number}</h4>
                  <p className="text-xs text-text-muted capitalize">{game.state}</p>
                </div>
                {winner && game.state === 'completed' && (
                  <span className="text-sm text-accent">{winner.name} won</span>
                )}
                {game.state === 'completed' && windowsLoading && !windowState?.data && (
                  <span className="text-xs text-text-muted">Loading roster…</span>
                )}
              </div>

              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surface-muted">
                <GameTeamPanel
                  label="Blue side"
                  team={blueTeam}
                  isWinner={winnerId === blueTeam?.id}
                  participants={
                    windowState?.data?.gameMetadata.blueTeamMetadata.participantMetadata
                  }
                />
                <GameTeamPanel
                  label="Red side"
                  team={redTeam}
                  isWinner={winnerId === redTeam?.id}
                  participants={
                    windowState?.data?.gameMetadata.redTeamMetadata.participantMetadata
                  }
                />
              </div>
            </div>
          )
        })}
      </section>

      {navState?.startTime && (
        <p className="text-xs text-text-muted text-right">
          Played {formatDate(navState.startTime)}
        </p>
      )}
    </div>
  )
}

function TeamSide({
  team,
  highlight,
  align,
}: {
  team: { name: string; code: string; image: string; result: { gameWins: number } }
  highlight?: boolean
  align: 'left' | 'right'
}) {
  return (
    <div className={`flex items-center gap-4 ${align === 'right' ? 'sm:flex-row-reverse sm:text-right' : ''}`}>
      <img
        src={team.image}
        alt={team.name}
        className={`w-16 h-16 object-contain rounded-lg bg-surface p-1 ${highlight ? 'ring-2 ring-accent/50' : ''}`}
      />
      <div>
        <p className="text-xl font-semibold">{team.name}</p>
        <p className="text-sm text-text-muted">{team.code}</p>
        <p className="text-lg font-mono mt-1">{team.result.gameWins}</p>
      </div>
    </div>
  )
}

function GameTeamPanel({
  label,
  team,
  isWinner,
  participants,
}: {
  label: string
  team: { name: string; code: string } | null
  isWinner?: boolean
  participants?: Array<{ summonerName: string; championId: string; role: string }>
}) {
  return (
    <div className={`p-5 ${isWinner ? 'bg-accent/5' : ''}`}>
      <p className="text-xs text-text-muted uppercase tracking-wide mb-2">{label}</p>
      <p className={`font-medium mb-4 ${isWinner ? 'text-accent' : ''}`}>
        {team?.name ?? 'TBD'}
      </p>
      {participants && participants.length > 0 ? (
        <ul className="space-y-2">
          {participants.map((player) => (
            <li key={player.summonerName + player.role} className="flex justify-between text-sm gap-4">
              <span className="capitalize text-text-muted">{player.role}</span>
              <span className="text-right">
                <span className="block">{player.summonerName}</span>
                <span className="text-xs text-text-muted">{player.championId}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">Roster unavailable</p>
      )}
    </div>
  )
}
