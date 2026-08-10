import { Link, useLocation, useParams } from 'react-router-dom'
import { useMatchDetails, useTeamsIndex } from '../hooks/useTeamData'
import { useGameWindows } from '../hooks/useGameWindows'
import { useGameDetails } from '../hooks/useGameDetails'
import { getGameWinnerTeamId, getTeamFrameData } from '../lib/game-utils'
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
  const index = useTeamsIndex()
  const games = match.data?.match.games ?? []
  const { windowsByGameId, isLoading: windowsLoading } = useGameWindows(games)
  const { detailsByGameId } = useGameDetails(games)

  const findSlug = (code: string) =>
    index.data?.teams.find((t) => t.code.toLowerCase() === code.toLowerCase())?.slug

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
      <div className="flex items-center justify-between">
        <Link
          to={navState?.from ?? '/'}
          className="text-xs text-text-muted hover:text-accent transition-colors tracking-[0.2em]"
        >
          ← Back
        </Link>
        <Link
          to={`/?teamA=${findSlug(teamA.code) ?? ''}&teamB=${findSlug(teamB.code) ?? ''}`}
          className="bg-surface-muted border-2 border-accent/40 text-accent px-5 py-2 text-xs tracking-[0.2em] hover:bg-accent hover:text-white transition-colors"
        >
          Compare {teamA.code} and {teamB.code}
        </Link>
      </div>

      <section>
        <div className="h-1.5 bg-accent " />
        <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted  p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-[3px] text-[0.6875rem] font-medium">
            <span className="bg-accent/20 text-accent px-3 py-1  tracking-[0.15em]">
              {event.league.name}
            </span>
            {navState?.blockName && (
              <span className="bg-surface-muted text-text-muted px-3 py-1  tracking-[0.15em]">
                {navState.blockName}
              </span>
            )}
            <span className="bg-surface-muted text-text-muted px-3 py-1  tracking-[0.15em]">
              Bo{boCount}
            </span>
            {navState?.startTime && (
              <span className="bg-surface-muted text-text-muted px-3 py-1  tracking-[0.15em] whitespace-nowrap">
                {formatDateTime(navState.startTime)}
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-6 items-center">
            <TeamSide team={teamA} highlight={seriesWinner?.id === teamA.id} align="left" slug={findSlug(teamA.code)} />
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
            <TeamSide team={teamB} highlight={seriesWinner?.id === teamB.id} align="right" slug={findSlug(teamB.code)} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <span className="font-heading text-2xl text-accent tracking-[0.1em]">Games</span>
        {games.length === 0 && (
          <p className="text-sm text-text-muted tracking-[0.1em]">No game data available yet.</p>
        )}
        {games.map((game) => {
          const windowState = windowsByGameId.get(game.id)
          const winnerId = getGameWinnerTeamId(windowState?.data)

          const teamAFrameResult = getTeamFrameData(windowState?.data, teamA.id)
          const teamBFrameResult = getTeamFrameData(windowState?.data, teamB.id)

          const teamAParticipants = teamAFrameResult?.side === 'blue'
            ? windowState?.data?.gameMetadata.blueTeamMetadata.participantMetadata
            : teamAFrameResult?.side === 'red'
            ? windowState?.data?.gameMetadata.redTeamMetadata.participantMetadata
            : undefined
          const teamBParticipants = teamBFrameResult?.side === 'blue'
            ? windowState?.data?.gameMetadata.blueTeamMetadata.participantMetadata
            : teamBFrameResult?.side === 'red'
            ? windowState?.data?.gameMetadata.redTeamMetadata.participantMetadata
            : undefined

          const detailsState = detailsByGameId.get(game.id)
          const patchVersion = windowState?.data?.gameMetadata.patchVersion

          return (
            <div key={game.id} className="overflow-hidden">
              <div className="h-1.5 bg-steel/60 " />
              <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted  overflow-hidden">
                <div className={`px-5 py-3 ${game.state === 'completed' ? 'border-b border-surface-muted' : ''} flex flex-wrap items-center justify-between gap-3`}>
                  <div>
                    <span className="font-heading text-lg tracking-[0.1em]">
                      Game {game.number}
                    </span>
                    <span className="text-[0.6875rem] font-medium text-text-muted ml-3 tracking-[0.2em]">
                      {game.state}
                    </span>
                  </div>
                  {game.state === 'completed' && windowsLoading && !windowState?.data && (
                    <span className="text-[0.625rem] text-text-muted tracking-[0.2em]">
                      Loading roster…
                    </span>
                  )}
                </div>

                {game.state === 'completed' && (
                  <>
                    {/* Team summary with objective cards — grid for true centering */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pt-1 pb-0.5 gap-6 overflow-x-auto">
                      {/* Left team objectives — [dragons] [baron] [towers] */}
                      <div className="flex items-center gap-1 justify-end shrink-0">
                        {teamAFrameResult?.teamFrame && (
                          <>
                            {teamAFrameResult.teamFrame.dragons.length > 0 ? (
                              [...teamAFrameResult.teamFrame.dragons].reverse().map((drake, i, arr) => {
                                const origIndex = arr.length - 1 - i
                                const isElder = drake === 'elder'
                                const isSoul = origIndex === 3
                                const bg = isElder ? 'bg-prismatic' : isSoul ? 'bg-teal/10' : 'bg-surface-muted'
                                return (
                                  <div key={i} className={`flex items-center gap-1 ${bg} px-1.5 py-0.5`}>
                                    <img src={drakeIcon(drake)} alt={drake} className="w-4 h-4" />
                                    {isElder && <span className="text-[0.625rem] font-bold text-text tracking-[0.1em]">elder</span>}
                                    {isSoul && !isElder && <span className="text-[0.625rem] font-medium text-teal tracking-[0.1em]">soul</span>}
                                  </div>
                                )
                              })
                            ) : (
                              <div className="flex items-center gap-1 bg-surface-muted px-2 py-0.5">
                                <img src={MINIMAP_ICONS.dragon} alt="drakes" className="w-4 h-4 opacity-40" />
                                <span className="text-[0.625rem] font-medium text-text-muted tracking-[0.1em]">0</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 bg-surface-muted px-2 py-0.5">
                              <img src={MINIMAP_ICONS.baron} alt="barons" className="w-4 h-4" />
                              <span className="text-[0.625rem] font-medium text-text-muted tracking-[0.1em]">{teamAFrameResult.teamFrame.barons}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-surface-muted px-2 py-0.5">
                              <img src={MINIMAP_ICONS.tower} alt="towers" className="w-4 h-4" />
                              <span className="text-[0.625rem] font-medium text-text-muted tracking-[0.1em]">{teamAFrameResult.teamFrame.towers}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Center: team info + kills — sub-grid keeps dash perfectly centered */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center shrink-0">
                        <div className="flex items-center gap-3 justify-end">
                          {teamAFrameResult && (
                            <span className={`text-[0.5rem] tracking-[0.2em] px-1.5 py-0.5 uppercase font-bold ${teamAFrameResult.side === 'blue' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>{teamAFrameResult.side}</span>
                          )}
                          <span className={`font-heading text-2xl tracking-[0.1em] translate-y-0.5 ${winnerId === teamA.id ? 'text-teal' : ''}`}>{teamA.code}</span>
                          {teamAFrameResult?.teamFrame && (
                            <span className="text-sm text-text-muted">{(teamAFrameResult.teamFrame.totalGold / 1000).toFixed(1)}k</span>
                          )}
                          <span className="font-heading text-2xl tracking-[0.1em] w-8 translate-y-0.5 text-right">{teamAFrameResult?.teamFrame?.totalKills ?? '?'}</span>
                        </div>
                        <span className="font-heading text-2xl tracking-[0.1em] mx-2 translate-y-0.5">—</span>
                        <div className="flex items-center gap-3 justify-start">
                          <span className="font-heading text-2xl tracking-[0.1em] w-8 translate-y-0.5">{teamBFrameResult?.teamFrame?.totalKills ?? '?'}</span>
                          {teamBFrameResult?.teamFrame && (
                            <span className="text-sm text-text-muted">{(teamBFrameResult.teamFrame.totalGold / 1000).toFixed(1)}k</span>
                          )}
                          <span className={`font-heading text-2xl tracking-[0.1em] translate-y-0.5 ${winnerId === teamB.id ? 'text-teal' : ''}`}>{teamB.code}</span>
                          {teamBFrameResult && (
                            <span className={`text-[0.5rem] tracking-[0.2em] px-1.5 py-0.5 uppercase font-bold ${teamBFrameResult.side === 'blue' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>{teamBFrameResult.side}</span>
                          )}
                        </div>
                      </div>

                      {/* Right team objectives — left-aligned to sit near center */}
                      <div className="flex items-center gap-1 justify-start shrink-0">
                        {teamBFrameResult?.teamFrame && (
                          <>
                            <div className="flex items-center gap-1 bg-surface-muted px-2 py-0.5">
                              <img src={MINIMAP_ICONS.tower} alt="towers" className="w-4 h-4" />
                              <span className="text-[0.625rem] font-medium text-text-muted tracking-[0.1em]">{teamBFrameResult.teamFrame.towers}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-surface-muted px-2 py-0.5">
                              <img src={MINIMAP_ICONS.baron} alt="barons" className="w-4 h-4" />
                              <span className="text-[0.625rem] font-medium text-text-muted tracking-[0.1em]">{teamBFrameResult.teamFrame.barons}</span>
                            </div>
                            {teamBFrameResult.teamFrame.dragons.length > 0 ? (
                              teamBFrameResult.teamFrame.dragons.map((drake, i) => {
                                const isElder = drake === 'elder'
                                const isSoul = i === 3
                                const bg = isElder ? 'bg-prismatic' : isSoul ? 'bg-teal/10' : 'bg-surface-muted'
                                return (
                                  <div key={i} className={`flex items-center gap-1 ${bg} px-1.5 py-0.5`}>
                                    <img src={drakeIcon(drake)} alt={drake} className="w-4 h-4" />
                                    {isElder && <span className="text-[0.625rem] font-bold text-text tracking-[0.1em]">elder</span>}
                                    {isSoul && !isElder && <span className="text-[0.625rem] font-medium text-teal tracking-[0.1em]">soul</span>}
                                  </div>
                                )
                              })
                            ) : (
                              <div className="flex items-center gap-1 bg-surface-muted px-2 py-0.5">
                                <img src={MINIMAP_ICONS.dragon} alt="drakes" className="w-4 h-4 opacity-40" />
                                <span className="text-[0.625rem] font-medium text-text-muted tracking-[0.1em]">0</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Mirrored player scoreboard */}
                    {teamAParticipants && teamBParticipants ? (
                      <div className="border-t border-surface-muted divide-y divide-surface-muted/30 overflow-x-auto">
                        {ROLE_ORDER.map(role => {
                          const leftP = teamAParticipants.find(p => p.role === role)
                          const rightP = teamBParticipants.find(p => p.role === role)
                          if (!leftP && !rightP) return null
                          const leftStats = leftP ? teamAFrameResult?.teamFrame?.participants.find(s => s.participantId === leftP.participantId) : undefined
                          const rightStats = rightP ? teamBFrameResult?.teamFrame?.participants.find(s => s.participantId === rightP.participantId) : undefined
                          const leftDet = leftP ? detailsState?.participants?.get(leftP.participantId) : undefined
                          const rightDet = rightP ? detailsState?.participants?.get(rightP.participantId) : undefined
                          const leftName = leftP ? stripTeamTag(leftP.summonerName, teamA.code) : ''
                          const rightName = rightP ? stripTeamTag(rightP.summonerName, teamB.code) : ''
                          const goldDiff = leftDet && rightDet ? leftDet.totalGoldEarned - rightDet.totalGoldEarned : null

                          const leftSlots = processPlayerItems(leftDet?.items ?? [], role)
                          const rightSlots = processPlayerItems(rightDet?.items ?? [], role)

                          const leftWon = winnerId === teamA.id
                          const rightWon = winnerId === teamB.id

                          return (
                            <div key={role} className="flex items-center py-1.5 px-2 min-w-[50rem]">
                              {/* Left player */}
                              <div className={`flex-1 flex items-center gap-1 justify-end min-w-0 ${leftWon ? 'bg-gradient-to-l from-teal/10 to-transparent to-50%' : ''}`}>
                                {/* Slot 8: Trinket (outermost) */}
                                <div className="shrink-0 relative">
                                  <img src={itemIconUrl(leftSlots.trinketId, patchVersion)} alt="" className={`w-8 h-8 rounded-sm bg-surface-muted ${leftSlots.trinketPlaceholder ? 'opacity-30' : ''}`} />
                                  {leftSlots.trinketPlaceholder && (
                                    <span className="absolute -bottom-0.5 -right-0.5 text-[0.5rem] font-bold bg-black/80 text-white px-0.5 rounded-sm leading-tight">0</span>
                                  )}
                                </div>
                                {/* Slot 7: Boots (bottom), Control Ward (support), or spacer */}
                                {leftSlots.hasSlot7 ? (
                                  <div className="shrink-0 relative">
                                    <img src={itemIconUrl(leftSlots.slot7, patchVersion)} alt="" className={`w-8 h-8 rounded-sm bg-surface-muted ${leftSlots.slot7Placeholder ? 'opacity-30' : ''}`} />
                                    {leftSlots.showSlot7Count && (
                                      <span className="absolute -bottom-0.5 -right-0.5 text-[0.5rem] font-bold bg-black/80 text-white px-0.5 rounded-sm leading-tight">{leftSlots.slot7Count}</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 shrink-0" />
                                )}
                                {/* Slots 1-6: Regular items (reversed for left) */}
                                <div className="flex gap-0.5 shrink-0 ml-1">
                                  {[...leftSlots.slots].reverse().map((id, i) =>
                                    id !== 0 ? (
                                      <img key={i} src={itemIconUrl(id, patchVersion)} alt="" className="w-8 h-8 rounded-sm bg-surface-muted" />
                                    ) : (
                                      <div key={i} className="w-8 h-8 rounded-sm bg-surface-muted/40" />
                                    )
                                  )}
                                </div>
                                {/* KDA + CS */}
                                <div className="flex items-center shrink-0 text-sm w-36 justify-end">
                                  {leftStats && <span className="font-medium tracking-[0.05em]">{leftStats.kills}/{leftStats.deaths}/{leftStats.assists}</span>}
                                  <span className="text-text-muted w-10 text-right ml-3">{leftDet?.creepScore ?? leftStats?.creepScore ?? ''}</span>
                                </div>
                                {/* Name + champ (near center) */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div className="text-right w-20">
                                    <p className="text-[0.6rem] text-text-muted truncate leading-tight">{leftP?.championId}</p>
                                    <p className="text-[0.75rem] font-medium truncate leading-tight">{leftName}</p>
                                  </div>
                                  <div className="relative">
                                    <img src={`${CHAMP_ICONS_BASE}/${leftP?.championId}.png`} alt="" className="w-9 h-9 rounded-sm" />
                                    {leftStats && (
                                      <span className="absolute -bottom-0.5 -left-1 text-[0.5rem] font-bold bg-black/80 text-white px-0.5 rounded-sm leading-tight">{leftStats.level}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Center gold diff */}
                              <div className="w-16 text-center shrink-0 mx-1">
                                {goldDiff !== null && goldDiff !== 0 ? (
                                  <div className="flex items-center justify-center gap-0.5">
                                    {goldDiff > 0 && <span className={`text-[0.5rem] ${teamAFrameResult?.side === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>◀</span>}
                                    <span className={`text-[0.75rem] font-bold ${(goldDiff >= 0 ? teamAFrameResult?.side : teamBFrameResult?.side) === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                                      {Math.abs(goldDiff) >= 1000 ? `${(Math.abs(goldDiff) / 1000).toFixed(1)}k` : Math.abs(goldDiff)}
                                    </span>
                                    {goldDiff < 0 && <span className={`text-[0.5rem] ${teamBFrameResult?.side === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>▶</span>}
                                  </div>
                                ) : (
                                  <div className="w-px h-8 bg-surface-muted/50 mx-auto" />
                                )}
                              </div>

                              {/* Right player */}
                              <div className={`flex-1 flex items-center gap-1 min-w-0 ${rightWon ? 'bg-gradient-to-r from-teal/10 to-transparent to-50%' : ''}`}>
                                {/* Champ + name (near center) */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div className="relative">
                                    <img src={`${CHAMP_ICONS_BASE}/${rightP?.championId}.png`} alt="" className="w-9 h-9 rounded-sm" />
                                    {rightStats && (
                                      <span className="absolute -bottom-0.5 -right-1 text-[0.5rem] font-bold bg-black/80 text-white px-0.5 rounded-sm leading-tight">{rightStats.level}</span>
                                    )}
                                  </div>
                                  <div className="w-20">
                                    <p className="text-[0.6rem] text-text-muted truncate leading-tight">{rightP?.championId}</p>
                                    <p className="text-[0.75rem] font-medium truncate leading-tight">{rightName}</p>
                                  </div>
                                </div>
                                {/* CS + KDA */}
                                <div className="flex items-center shrink-0 text-sm w-36">
                                  <span className="text-text-muted w-10 mr-3">{rightDet?.creepScore ?? rightStats?.creepScore ?? ''}</span>
                                  {rightStats && <span className="font-medium tracking-[0.05em]">{rightStats.kills}/{rightStats.deaths}/{rightStats.assists}</span>}
                                </div>
                                {/* Slots 1-6: Regular items */}
                                <div className="flex gap-0.5 shrink-0 mr-1">
                                  {rightSlots.slots.map((id, i) =>
                                    id !== 0 ? (
                                      <img key={i} src={itemIconUrl(id, patchVersion)} alt="" className="w-8 h-8 rounded-sm bg-surface-muted" />
                                    ) : (
                                      <div key={i} className="w-8 h-8 rounded-sm bg-surface-muted/40" />
                                    )
                                  )}
                                </div>
                                {/* Slot 7: Boots (bottom), Control Ward (support), or spacer */}
                                {rightSlots.hasSlot7 ? (
                                  <div className="shrink-0 relative">
                                    <img src={itemIconUrl(rightSlots.slot7, patchVersion)} alt="" className={`w-8 h-8 rounded-sm bg-surface-muted ${rightSlots.slot7Placeholder ? 'opacity-30' : ''}`} />
                                    {rightSlots.showSlot7Count && (
                                      <span className="absolute -bottom-0.5 -right-0.5 text-[0.5rem] font-bold bg-black/80 text-white px-0.5 rounded-sm leading-tight">{rightSlots.slot7Count}</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 shrink-0" />
                                )}
                                {/* Slot 8: Trinket (outermost) */}
                                <div className="shrink-0 relative">
                                  <img src={itemIconUrl(rightSlots.trinketId, patchVersion)} alt="" className={`w-8 h-8 rounded-sm bg-surface-muted ${rightSlots.trinketPlaceholder ? 'opacity-30' : ''}`} />
                                  {rightSlots.trinketPlaceholder && (
                                    <span className="absolute -bottom-0.5 -right-0.5 text-[0.5rem] font-bold bg-black/80 text-white px-0.5 rounded-sm leading-tight">0</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="px-4 py-6 text-sm text-text-muted tracking-[0.1em] text-center">Roster unavailable</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </section>

      {navState?.startTime && (
        <p className="text-[0.6875rem] font-medium text-text-muted text-right tracking-[0.2em] whitespace-nowrap">
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
  slug,
}: {
  team: { name: string; code: string; image: string; result: { gameWins: number } }
  highlight?: boolean
  align: 'left' | 'right'
  slug?: string
}) {
  const name = slug ? (
    <Link to={`/team/${slug}`} className="font-heading text-2xl tracking-[0.1em] hover:text-accent transition-colors underline decoration-text-muted/30 underline-offset-2">
      {team.name}
    </Link>
  ) : (
    <p className="font-heading text-2xl tracking-[0.1em]">{team.name}</p>
  )

  return (
    <div
      className={`flex items-center gap-4 ${align === 'right' ? 'sm:flex-row-reverse sm:text-right' : ''}`}
    >
      <img
        src={team.image}
        alt={team.name}
        className={`w-16 h-16 object-contain  bg-surface p-1 border-2 ${highlight ? 'border-teal' : 'border-white/80'}`}
      />
      <div>
        {name}
        <p className="text-xs font-medium text-text-muted tracking-[0.2em]">{team.code}</p>
      </div>
    </div>
  )
}

const CHAMP_ICONS_BASE = `${import.meta.env.BASE_URL}icons/champions`
const ICONS_BASE = `${import.meta.env.BASE_URL}icons/objectives`

function ddragonVersion(patchVersion?: string): string {
  if (!patchVersion) return '14.24.1'
  const parts = patchVersion.split('.')
  return `${parts[0]}.${parts[1]}.1`
}

function itemIconUrl(itemId: number, patchVersion?: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion(patchVersion)}/img/item/${itemId}.png`
}

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

const ROLE_ORDER = ['top', 'jungle', 'mid', 'bottom', 'support'] as const

const ELIXIR_IDS = new Set([2138, 2139, 2140])
const TRINKET_IDS = new Set([3340, 3364, 3363])
const CONTROL_WARD_ID = 2055
const BOOT_IDS = new Set([1001, 3006, 3009, 3020, 3047, 3111, 3117, 3158])
const DEFAULT_BOOTS = 1001
const DEFAULT_TRINKET = 3364

function stripTeamTag(name: string, teamCode: string): string {
  if (name.toLowerCase().startsWith(teamCode.toLowerCase())) {
    return name.slice(teamCode.length)
  }
  return name
}

function processPlayerItems(rawItems: number[], role: string) {
  const filtered = rawItems.filter(id => id !== 0 && !ELIXIR_IDS.has(id))
  const trinket = filtered.find(id => TRINKET_IDS.has(id))

  let regular: number[]
  let slot7: number
  let slot7Count: number
  let hasSlot7 = false
  let slot7Placeholder = false

  if (role === 'support') {
    hasSlot7 = true
    const pinkCount = filtered.filter(id => id === CONTROL_WARD_ID).length
    regular = filtered.filter(id => !TRINKET_IDS.has(id) && id !== CONTROL_WARD_ID)
    slot7 = CONTROL_WARD_ID
    slot7Count = pinkCount
    slot7Placeholder = pinkCount === 0
  } else if (role === 'bottom') {
    hasSlot7 = true
    const boots = filtered.find(id => BOOT_IDS.has(id))
    regular = filtered.filter(id => !TRINKET_IDS.has(id) && !BOOT_IDS.has(id) && id !== CONTROL_WARD_ID)
    slot7 = boots ?? DEFAULT_BOOTS
    slot7Count = boots ? 1 : 0
    slot7Placeholder = !boots
  } else {
    regular = filtered.filter(id => !TRINKET_IDS.has(id) && id !== CONTROL_WARD_ID)
    slot7 = 0
    slot7Count = 0
  }

  const padded = regular.slice(0, 6)
  while (padded.length < 6) padded.push(0)

  const trinketId = trinket ?? DEFAULT_TRINKET
  const trinketPlaceholder = !trinket

  const showSlot7Count = role === 'support'

  return { slots: padded, slot7, slot7Count, slot7Placeholder, hasSlot7, showSlot7Count, trinketId, trinketPlaceholder }
}

