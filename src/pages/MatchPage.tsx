import { Link, useLocation, useParams } from 'react-router-dom'
import { useMatchDetails } from '../hooks/useTeamData'
import { useGameWindows } from '../hooks/useGameWindows'
import { getGameWinnerTeamId, getTeamById, getTeamFrameData } from '../lib/game-utils'
import {
  formatDate,
  formatDateTime,
  getSeriesWinner,
} from '../lib/match-utils'
import type { FrameTeam, MatchNavigationState } from '../api/types'

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
              <span className="bg-surface-muted text-text-muted px-3 py-1 rounded-full tracking-[0.15em] whitespace-nowrap">
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

          const teamASide = blueTeam?.id === teamA.id ? 'blue' : 'red'
          const teamAParticipants = teamASide === 'blue'
            ? windowState?.data?.gameMetadata.blueTeamMetadata.participantMetadata
            : windowState?.data?.gameMetadata.redTeamMetadata.participantMetadata
          const teamBParticipants = teamASide === 'blue'
            ? windowState?.data?.gameMetadata.redTeamMetadata.participantMetadata
            : windowState?.data?.gameMetadata.blueTeamMetadata.participantMetadata

          return (
            <div key={game.id} className="overflow-hidden">
              <div className="h-1.5 bg-steel/60 rounded-t-lg" />
              <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted rounded-b-lg overflow-hidden">
                <div className={`px-5 py-3 ${game.state === 'completed' ? 'border-b border-surface-muted' : ''} flex flex-wrap items-center justify-between gap-3`}>
                  <div>
                    <span className="font-heading text-lg tracking-[0.1em]">
                      Game {game.number}
                    </span>
                    <span className="text-[11px] font-medium text-text-muted ml-3 tracking-[0.2em]">
                      {game.state}
                    </span>
                  </div>
                  {game.state === 'completed' && windowsLoading && !windowState?.data && (
                    <span className="text-[10px] text-text-muted tracking-[0.2em]">
                      Loading roster…
                    </span>
                  )}
                </div>

                {game.state === 'completed' && (
                  <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surface-muted">
                    <GameTeamPanel
                      label={`${teamASide} side`}
                      team={teamA}
                      isWinner={winnerId === teamA.id}
                      participants={teamAParticipants}
                      teamFrame={getTeamFrameData(windowState?.data, teamA.id)?.teamFrame}
                    />
                    <GameTeamPanel
                      label={`${teamASide === 'blue' ? 'red' : 'blue'} side`}
                      team={teamB}
                      isWinner={winnerId === teamB.id}
                      participants={teamBParticipants}
                      teamFrame={getTeamFrameData(windowState?.data, teamB.id)?.teamFrame}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </section>

      {navState?.startTime && (
        <p className="text-[11px] font-medium text-text-muted text-right tracking-[0.2em] whitespace-nowrap">
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

const CHAMP_ICONS_BASE = `${import.meta.env.BASE_URL}icons/champions`
const ICONS_BASE = `${import.meta.env.BASE_URL}icons/objectives`

const MINIMAP_ICONS = {
  tower: `${ICONS_BASE}/tower.png`,
  baron: `${ICONS_BASE}/baron.png`,
  dragon: `${ICONS_BASE}/dragon.png`,
}

const DRAKE_ICONS: Record<string, string> = {
  infernal: `${ICONS_BASE}/dragon_infernal.png`,
  mountain: `${ICONS_BASE}/dragon_mountain.png`,
  ocean: `${ICONS_BASE}/dragon_ocean.png`,
  cloud: `${ICONS_BASE}/dragon_cloud.png`,
  hextech: `${ICONS_BASE}/dragon_hextech.png`,
  chemtech: `${ICONS_BASE}/dragon_chemtech.png`,
  elder: `${ICONS_BASE}/dragon_elder.png`,
}

function drakeIcon(type: string) {
  return DRAKE_ICONS[type] ?? MINIMAP_ICONS.dragon
}

function GameTeamPanel({
  label,
  team,
  isWinner,
  participants,
  teamFrame,
}: {
  label: string
  team: { name: string; code: string } | null
  isWinner?: boolean
  participants?: Array<{ participantId: number; summonerName: string; championId: string; role: string }>
  teamFrame?: FrameTeam
}) {
  const bgAccent = isWinner ? 'bg-teal/5' : ''

  const playerStats = teamFrame?.participants
  const statsMap = new Map(playerStats?.map((p) => [p.participantId, p]))

  return (
    <div className={`p-5 ${bgAccent}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-text-muted mb-1">{label}</p>
          <p className={`font-bold tracking-[0.1em] ${isWinner ? 'text-teal' : ''}`}>
            {team?.name ?? 'TBD'}
          </p>
        </div>
        {teamFrame && (
          <div className="flex items-center gap-3 text-[11px] font-medium text-text-muted tracking-[0.1em]">
            <span>{teamFrame.totalKills} kills</span>
            <span>{(teamFrame.totalGold / 1000).toFixed(1)}k gold</span>
          </div>
        )}
      </div>

      {teamFrame && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1 bg-surface-muted px-2 py-0.5 rounded">
            <img src={MINIMAP_ICONS.tower} alt="towers" className="w-4 h-4" />
            <span className="text-[10px] font-medium text-text-muted tracking-[0.1em]">{teamFrame.towers}</span>
          </div>
          <div className="flex items-center gap-1 bg-surface-muted px-2 py-0.5 rounded">
            <img src={MINIMAP_ICONS.baron} alt="barons" className="w-4 h-4" />
            <span className="text-[10px] font-medium text-text-muted tracking-[0.1em]">{teamFrame.barons}</span>
          </div>
          {teamFrame.dragons.length > 0 ? (
            teamFrame.dragons.map((drake, i) => {
              const isElder = drake === 'elder'
              const isSoul = i === 3
              const bg = isElder ? 'bg-prismatic' : isSoul ? 'bg-teal/10' : 'bg-surface-muted'
              return (
                <div key={i} className={`flex items-center gap-1 ${bg} px-1.5 py-0.5 rounded`}>
                  <img src={drakeIcon(drake)} alt={drake} className="w-4 h-4" />
                  {isElder && (
                    <span className="text-[10px] font-bold text-text tracking-[0.1em]">elder</span>
                  )}
                  {isSoul && !isElder && (
                    <span className="text-[10px] font-medium text-teal tracking-[0.1em]">soul</span>
                  )}
                </div>
              )
            })
          ) : (
            <div className="flex items-center gap-1 bg-surface-muted px-2 py-0.5 rounded">
              <img src={MINIMAP_ICONS.dragon} alt="drakes" className="w-4 h-4 opacity-40" />
              <span className="text-[10px] font-medium text-text-muted tracking-[0.1em]">0</span>
            </div>
          )}
        </div>
      )}

      {participants && participants.length > 0 ? (
        <ul className="space-y-1.5">
          {participants.map((player) => {
            const stats = statsMap.get(player.participantId)
            return (
              <li
                key={player.summonerName + player.role}
                className="flex items-center text-sm gap-2"
              >
                <img
                  src={`${CHAMP_ICONS_BASE}/${player.championId}.png`}
                  alt={player.championId}
                  className="w-6 h-6 rounded shrink-0"
                />
                <span className="font-medium tracking-[0.1em] w-28 shrink-0 truncate">{player.summonerName}</span>
                <span className="text-text-muted tracking-[0.08em] flex-1 truncate">{player.championId}</span>
                {stats && (
                  <span className="text-text-muted tracking-[0.08em] shrink-0 w-16 text-right">
                    {stats.kills}/{stats.deaths}/{stats.assists}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-text-muted tracking-[0.1em]">Roster unavailable</p>
      )}
    </div>
  )
}
