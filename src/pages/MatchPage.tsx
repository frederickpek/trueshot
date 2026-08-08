import { Link, useLocation, useParams } from 'react-router-dom'
import { useMatchDetails } from '../hooks/useTeamData'
import { useGameWindows } from '../hooks/useGameWindows'
import { getGameWinnerTeamId, getTeamById } from '../lib/game-utils'
import {
  formatDate,
  formatDateTime,
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
    return (
      <p className="text-text-muted py-12 text-center tracking-[0.3em] text-xs">
        Loading match…
      </p>
    )
  }

  if (match.isError || !match.data) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-text-muted tracking-[0.15em]">Match not found.</p>
        <Link
          to={navState?.from ?? '/'}
          className="text-accent hover:text-teal transition-colors text-sm tracking-[0.15em]"
        >
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
          className="text-xs text-text-muted hover:text-accent transition-colors tracking-[0.2em]"
        >
          ← Back
        </Link>
      </div>

      <section>
        <div className="h-1.5 bg-accent rounded-t-lg" />
        <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted rounded-b-lg p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-[3px] text-[11px] font-medium">
            <span className="bg-accent/20 text-accent px-3 py-1 rounded-full tracking-[0.15em]">
              {event.league.name}
            </span>
            {navState?.blockName && (
              <span className="bg-surface-muted text-text-muted px-3 py-1 rounded-full tracking-[0.15em]">
                {navState.blockName}
              </span>
            )}
            <span className="bg-surface-muted text-text-muted px-3 py-1 rounded-full tracking-[0.15em]">
              Bo{boCount}
            </span>
            {navState?.startTime && (
              <span className="bg-surface-muted text-text-muted px-3 py-1 rounded-full tracking-[0.15em]">
                {formatDateTime(navState.startTime)}
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-6 items-center">
            <TeamSide team={teamA} highlight={seriesWinner?.id === teamA.id} align="left" />
            <div className="text-center px-4">
              <p className="font-heading text-5xl tracking-[0.15em]">
                {teamA.result.gameWins} - {teamB.result.gameWins}
              </p>
              {seriesWinner && (
                <p className="text-xs text-teal mt-2 tracking-[0.2em]">
                  {seriesWinner.name} wins
                </p>
              )}
            </div>
            <TeamSide team={teamB} highlight={seriesWinner?.id === teamB.id} align="right" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <span className="font-heading text-2xl text-accent tracking-[0.1em]">Games</span>
        {games.length === 0 && (
          <p className="text-sm text-text-muted tracking-[0.1em]">No game data available yet.</p>
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
            <div key={game.id} className="overflow-hidden">
              <div className="h-1.5 bg-steel/60 rounded-t-lg" />
              <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted rounded-b-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-surface-muted flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-heading text-lg tracking-[0.1em]">
                      Game {game.number}
                    </span>
                    <span className="text-[11px] font-medium text-text-muted ml-3 tracking-[0.2em]">
                      {game.state}
                    </span>
                  </div>
                  {winner && game.state === 'completed' && (
                    <span className="text-xs font-semibold text-teal tracking-[0.2em]">
                      {winner.name} won
                    </span>
                  )}
                  {game.state === 'completed' && windowsLoading && !windowState?.data && (
                    <span className="text-[10px] text-text-muted tracking-[0.2em]">
                      Loading roster…
                    </span>
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
                    color="teal"
                  />
                  <GameTeamPanel
                    label="Red side"
                    team={redTeam}
                    isWinner={winnerId === redTeam?.id}
                    participants={
                      windowState?.data?.gameMetadata.redTeamMetadata.participantMetadata
                    }
                    color="accent"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </section>

      {navState?.startTime && (
        <p className="text-[11px] font-medium text-text-muted text-right tracking-[0.2em]">
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
    <div
      className={`flex items-center gap-4 ${align === 'right' ? 'sm:flex-row-reverse sm:text-right' : ''}`}
    >
      <img
        src={team.image}
        alt={team.name}
        className={`w-16 h-16 object-contain rounded-lg bg-surface p-1 border-2 ${highlight ? 'border-teal' : 'border-white/80'}`}
      />
      <div>
        <p className="font-heading text-2xl tracking-[0.1em]">{team.name}</p>
        <p className="text-xs font-medium text-text-muted tracking-[0.2em]">{team.code}</p>
      </div>
    </div>
  )
}

function GameTeamPanel({
  label,
  team,
  isWinner,
  participants,
  color,
}: {
  label: string
  team: { name: string; code: string } | null
  isWinner?: boolean
  participants?: Array<{ summonerName: string; championId: string; role: string }>
  color: 'teal' | 'accent'
}) {
  const colorClass = color === 'teal' ? 'text-teal' : 'text-accent'
  const bgAccent = isWinner ? 'bg-teal/5' : ''

  return (
    <div className={`p-5 ${bgAccent}`}>
      <p className={`text-[11px] font-semibold tracking-[0.3em] mb-2 ${colorClass}`}>{label}</p>
      <p className={`font-bold mb-4 tracking-[0.1em] ${isWinner ? 'text-teal' : ''}`}>
        {team?.name ?? 'TBD'}
      </p>
      {participants && participants.length > 0 ? (
        <ul className="space-y-1.5">
          {participants.map((player) => (
            <li
              key={player.summonerName + player.role}
              className="flex justify-between text-sm gap-4"
            >
              <span className="text-text-muted font-medium tracking-[0.15em]">{player.role}</span>
              <span className="text-right">
                <span className="block font-medium tracking-[0.1em]">{player.summonerName}</span>
                <span className="text-[11px] font-medium text-text-muted tracking-[0.1em]">
                  {player.championId}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted tracking-[0.1em]">Roster unavailable</p>
      )}
    </div>
  )
}
