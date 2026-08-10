import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ELO_K = 32
const ELO_START = 1200

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchFile {
  matchId: string
  league: { name: string; slug: string }
  teams: Array<{
    name: string
    code: string
    image: string
    result?: { outcome?: string; gameWins: number }
  }>
  startTime: string
  strategy: { type: string; count: number }
  games: GameEntry[]
}

interface GameEntry {
  gameId: string
  gameNumber: number
  metadata?: {
    blueTeamMetadata?: TeamMeta
    redTeamMetadata?: TeamMeta
  }
  lastFrame?: GameFrame
  error?: string
  noData?: boolean
}

interface TeamMeta {
  esportsTeamId: string
  participantMetadata: Array<{
    participantId: number
    esportsPlayerId: string
    summonerName: string
    championId: string
    role: string
  }>
}

interface GameFrame {
  gameState: string
  blueTeam: FrameTeam
  redTeam: FrameTeam
}

interface FrameTeam {
  totalGold: number
  totalKills: number
  towers: number
  inhibitors: number
  barons: number
  dragons: string[] | number
  participants: Array<{
    participantId: number
    totalGold: number
    kills: number
    deaths: number
    assists: number
    creepScore: number
  }>
}

// ---------------------------------------------------------------------------
// Elo
// ---------------------------------------------------------------------------

interface EloSnapshot {
  date: string
  elo: number
}

interface TeamElo {
  code: string
  name: string
  elo: number
  games: number
  wins: number
  blueSideWins: number
  blueSideGames: number
  redSideWins: number
  redSideGames: number
  history: EloSnapshot[]
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
}

function updateElo(winner: TeamElo, loser: TeamElo): void {
  const expected = expectedScore(winner.elo, loser.elo)
  winner.elo += ELO_K * (1 - expected)
  loser.elo += ELO_K * (0 - (1 - expected))
}

// ---------------------------------------------------------------------------
// Player profiles
// ---------------------------------------------------------------------------

interface ChampionStats {
  id: string
  games: number
  wins: number
  kills: number
  deaths: number
  assists: number
  cs: number
  gold: number
}

interface PlayerProfile {
  playerId: string
  name: string
  role: string
  games: number
  wins: number
  kills: number
  deaths: number
  assists: number
  cs: number
  gold: number
  champions: Record<string, ChampionStats>
}

// ---------------------------------------------------------------------------
// Per-game winner determination
// ---------------------------------------------------------------------------

interface GameAssignment {
  gameId: string
  winningSide: 'blue' | 'red'
  winId: string
  goldDiff: number
}

interface GameWinnerResult {
  winnerTeamId: string
  loserTeamId: string
  perGame: Map<string, string>
  skippedGames: Set<string>
}

function resolveGameWinners(match: MatchFile): GameWinnerResult | null {
  const winnerIdx = match.teams[0]?.result?.outcome === 'win' ? 0 : 1
  const expectedWinnerWins = match.teams[winnerIdx].result!.gameWins
  const expectedLoserWins = match.teams[1 - winnerIdx].result!.gameWins
  const totalExpected = expectedWinnerWins + expectedLoserWins

  const validGames = match.games.filter(
    (g) =>
      g.metadata?.blueTeamMetadata &&
      g.metadata?.redTeamMetadata &&
      g.lastFrame &&
      !g.noData &&
      !g.error &&
      g.lastFrame.blueTeam.totalGold > 0,
  )

  if (validGames.length === 0) return null

  const uniqueIds = new Set<string>()
  for (const g of validGames) {
    uniqueIds.add(g.metadata!.blueTeamMetadata!.esportsTeamId)
    uniqueIds.add(g.metadata!.redTeamMetadata!.esportsTeamId)
  }
  if (uniqueIds.size !== 2) return null
  const [idA, idB] = [...uniqueIds]

  const assignments: GameAssignment[] = []
  const tiedGames = new Set<string>()

  for (const game of validGames) {
    const frame = game.lastFrame!
    const blueGold = frame.blueTeam.totalGold
    const redGold = frame.redTeam.totalGold
    const blueKills = frame.blueTeam.totalKills
    const redKills = frame.redTeam.totalKills

    let side: 'blue' | 'red' | null = null
    let goldDiff = 0

    if (blueGold !== redGold) {
      side = blueGold > redGold ? 'blue' : 'red'
      goldDiff = Math.abs(blueGold - redGold)
    } else if (blueKills !== redKills) {
      side = blueKills > redKills ? 'blue' : 'red'
      goldDiff = 0
    }

    if (!side) {
      tiedGames.add(game.gameId)
      continue
    }

    const winId =
      side === 'blue'
        ? game.metadata!.blueTeamMetadata!.esportsTeamId
        : game.metadata!.redTeamMetadata!.esportsTeamId

    assignments.push({ gameId: game.gameId, winningSide: side, winId, goldDiff })
  }

  function tryValidate(
    assigned: GameAssignment[],
    skipped: Set<string>,
  ): GameWinnerResult | null {
    const wins = new Map<string, number>()
    wins.set(idA, 0)
    wins.set(idB, 0)
    for (const a of assigned) {
      wins.set(a.winId, (wins.get(a.winId) ?? 0) + 1)
    }

    const aW = wins.get(idA) ?? 0
    const bW = wins.get(idB) ?? 0
    const missingGames = totalExpected - validGames.length

    for (const [candidateWinner, candidateLoser] of [
      [idA, idB],
      [idB, idA],
    ] as const) {
      const assignedWW = wins.get(candidateWinner) ?? 0
      const assignedLW = wins.get(candidateLoser) ?? 0
      const needWW = expectedWinnerWins - assignedWW
      const needLW = expectedLoserWins - assignedLW
      if (
        needWW >= 0 &&
        needLW >= 0 &&
        needWW + needLW === missingGames + skipped.size
      ) {
        const perGame = new Map<string, string>()
        for (const a of assigned) perGame.set(a.gameId, a.winId)
        return {
          winnerTeamId: candidateWinner,
          loserTeamId: candidateLoser,
          perGame,
          skippedGames: skipped,
        }
      }
    }

    return null
  }

  // Pass 1: try with all gold/kills assignments
  const result = tryValidate(assignments, tiedGames)
  if (result) return result

  // Pass 2: peel off the smallest gold-diff games one at a time
  // Sort by goldDiff ascending — least confident first
  const sorted = [...assignments].sort((a, b) => a.goldDiff - b.goldDiff)
  const remaining = [...assignments]
  const skipped = new Set(tiedGames)

  for (const weakest of sorted) {
    const idx = remaining.findIndex((a) => a.gameId === weakest.gameId)
    if (idx === -1) continue
    remaining.splice(idx, 1)
    skipped.add(weakest.gameId)

    const retry = tryValidate(remaining, skipped)
    if (retry) return retry
  }

  return null
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const root = join(import.meta.dirname, '..')
  const gamesDir = join(root, 'data', 'games')
  const outputDir = join(root, 'public', 'data')
  const playersDir = join(outputDir, 'players')
  await mkdir(playersDir, { recursive: true })

  console.log('Loading match files…')
  const files = (await readdir(gamesDir)).filter((f) => f.endsWith('.json'))
  const matches: MatchFile[] = []
  for (const file of files) {
    const raw = await readFile(join(gamesDir, file), 'utf-8')
    matches.push(JSON.parse(raw))
  }

  matches.sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  )
  console.log(
    `Loaded ${matches.length} matches (${matches[0].startTime.slice(0, 10)} → ${matches[matches.length - 1].startTime.slice(0, 10)})`,
  )

  const teamElos = new Map<string, TeamElo>()
  const players = new Map<string, PlayerProfile>()
  let processedMatches = 0
  let processedGames = 0
  let skippedMatches = 0
  let resolvedMatches = 0
  let unresolvedMatches = 0
  let skippedGamesCount = 0

  function getOrCreateTeam(code: string, name: string): TeamElo {
    let team = teamElos.get(code)
    if (!team) {
      team = {
        code,
        name,
        elo: ELO_START,
        games: 0,
        wins: 0,
        blueSideWins: 0,
        blueSideGames: 0,
        redSideWins: 0,
        redSideGames: 0,
        history: [],
      }
      teamElos.set(code, team)
    }
    team.name = name
    return team
  }

  function getOrCreatePlayer(
    playerId: string,
    name: string,
    role: string,
  ): PlayerProfile {
    let player = players.get(playerId)
    if (!player) {
      player = {
        playerId,
        name,
        role,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        cs: 0,
        gold: 0,
        champions: {},
      }
      players.set(playerId, player)
    }
    if (name) player.name = name
    if (role) player.role = role
    return player
  }

  function updatePlayerStats(
    player: PlayerProfile,
    championId: string,
    won: boolean,
    stats: {
      kills: number
      deaths: number
      assists: number
      creepScore: number
      totalGold: number
    },
  ): void {
    player.games++
    if (won) player.wins++
    player.kills += stats.kills
    player.deaths += stats.deaths
    player.assists += stats.assists
    player.cs += stats.creepScore
    player.gold += stats.totalGold

    let champ = player.champions[championId]
    if (!champ) {
      champ = {
        id: championId,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        cs: 0,
        gold: 0,
      }
      player.champions[championId] = champ
    }
    champ.games++
    if (won) champ.wins++
    champ.kills += stats.kills
    champ.deaths += stats.deaths
    champ.assists += stats.assists
    champ.cs += stats.creepScore
    champ.gold += stats.totalGold
  }

  for (const match of matches) {
    const t0 = match.teams[0]
    const t1 = match.teams[1]
    if (!t0?.result?.outcome || !t1?.result?.outcome) {
      skippedMatches++
      continue
    }

    const winnerIdx = t0.result.outcome === 'win' ? 0 : 1
    const winner = match.teams[winnerIdx]
    const loser = match.teams[1 - winnerIdx]

    // Elo update (match level)
    const winnerElo = getOrCreateTeam(winner.code, winner.name)
    const loserElo = getOrCreateTeam(loser.code, loser.name)
    updateElo(winnerElo, loserElo)
    const matchDate = match.startTime.slice(0, 10)
    winnerElo.history.push({ date: matchDate, elo: Math.round(winnerElo.elo) })
    loserElo.history.push({ date: matchDate, elo: Math.round(loserElo.elo) })
    winnerElo.games++
    winnerElo.wins++
    loserElo.games++
    processedMatches++

    // Resolve per-game winners
    const resolution = resolveGameWinners(match)
    if (resolution) {
      resolvedMatches++
    } else {
      unresolvedMatches++
    }

    for (const game of match.games) {
      if (!game.metadata?.blueTeamMetadata || !game.metadata?.redTeamMetadata)
        continue
      if (!game.lastFrame || game.noData || game.error) continue
      if (
        game.lastFrame.blueTeam.totalGold === 0 &&
        game.lastFrame.blueTeam.totalKills === 0
      )
        continue

      const blueMeta = game.metadata.blueTeamMetadata
      const redMeta = game.metadata.redTeamMetadata
      const frame = game.lastFrame

      // Track blue/red side stats
      if (resolution) {
        const blueIsMatchWinner =
          blueMeta.esportsTeamId === resolution.winnerTeamId
        const blueTeamElo = blueIsMatchWinner ? winnerElo : loserElo
        const redTeamElo = blueIsMatchWinner ? loserElo : winnerElo
        blueTeamElo.blueSideGames++
        redTeamElo.redSideGames++

        const gameWinnerId = resolution.perGame.get(game.gameId)
        if (gameWinnerId) {
          if (gameWinnerId === blueMeta.esportsTeamId) {
            blueTeamElo.blueSideWins++
          } else {
            redTeamElo.redSideWins++
          }
        }
      }

      // Determine per-game win for player stats
      if (resolution && resolution.skippedGames.has(game.gameId)) {
        // Too ambiguous — skip this game entirely for player stats
        skippedGamesCount++
        processedGames++
        continue
      }

      const gameWinnerId = resolution?.perGame.get(game.gameId) ?? null

      if (!gameWinnerId) {
        // No resolution or game not in perGame map — skip for player win/loss
        skippedGamesCount++
        processedGames++
        continue
      }

      const blueWon = gameWinnerId === blueMeta.esportsTeamId

      for (const pm of blueMeta.participantMetadata) {
        const participant = frame.blueTeam.participants.find(
          (p) => p.participantId === pm.participantId,
        )
        if (!participant) continue
        const player = getOrCreatePlayer(
          pm.esportsPlayerId,
          pm.summonerName,
          pm.role,
        )
        updatePlayerStats(player, pm.championId, blueWon, participant)
      }

      for (const pm of redMeta.participantMetadata) {
        const participant = frame.redTeam.participants.find(
          (p) => p.participantId === pm.participantId,
        )
        if (!participant) continue
        const player = getOrCreatePlayer(
          pm.esportsPlayerId,
          pm.summonerName,
          pm.role,
        )
        updatePlayerStats(player, pm.championId, !blueWon, participant)
      }

      processedGames++
    }
  }

  console.log(`\nProcessed: ${processedMatches} matches, ${processedGames} games`)
  console.log(`Skipped (no result): ${skippedMatches}`)
  console.log(`Per-game winners resolved: ${resolvedMatches} matches`)
  console.log(`Per-game winners unresolved: ${unresolvedMatches} matches (fallback to skip)`)
  console.log(`Skipped games (ambiguous): ${skippedGamesCount}`)
  console.log(`Teams: ${teamElos.size}`)
  console.log(`Players: ${players.size}`)

  // ---------------------------------------------------------------------------
  // Write outputs
  // ---------------------------------------------------------------------------
  console.log('\nWriting outputs…')

  const teamsArray = [...teamElos.values()]
    .map((t) => ({ ...t, elo: Math.round(t.elo) }))
    .sort((a, b) => b.elo - a.elo)

  await writeFile(
    join(outputDir, 'team-elos.json'),
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        k: ELO_K,
        startElo: ELO_START,
        teams: teamsArray,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(`  team-elos.json — ${teamsArray.length} teams`)

  console.log('\n  Top 15 teams by elo:')
  for (const t of teamsArray.slice(0, 15)) {
    console.log(
      `    ${t.code.padEnd(6)} ${String(t.elo).padStart(4)} (${t.wins}W/${t.games - t.wins}L)`,
    )
  }

  let playerCount = 0
  for (const player of players.values()) {
    await writeFile(
      join(playersDir, `${player.playerId}.json`),
      JSON.stringify(player, null, 2) + '\n',
    )
    playerCount++
  }
  console.log(`\n  players/ — ${playerCount} profiles`)

  const playerIndex = [...players.values()]
    .map((p) => ({
      id: p.playerId,
      name: p.name,
      role: p.role,
      games: p.games,
    }))
    .sort((a, b) => b.games - a.games)

  await writeFile(
    join(outputDir, 'player-index.json'),
    JSON.stringify(
      { updatedAt: new Date().toISOString(), players: playerIndex },
      null,
      2,
    ) + '\n',
  )
  console.log(`  player-index.json — ${playerIndex.length} entries`)

  // ---------------------------------------------------------------------------
  // Player percentile distributions (100+ games only)
  // ---------------------------------------------------------------------------
  const qualified = [...players.values()].filter((p) => p.games >= 50)

  function percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b)
    const idx = (p / 100) * (sorted.length - 1)
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    if (lo === hi) return sorted[lo]
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
  }

  function computePercentiles(values: number[]): Record<string, number> {
    const pcts: Record<string, number> = {}
    for (const p of [10, 25, 50, 75, 90, 95]) {
      pcts[`p${p}`] = Math.round(percentile(values, p) * 100) / 100
    }
    pcts.min = Math.round(Math.min(...values) * 100) / 100
    pcts.max = Math.round(Math.max(...values) * 100) / 100
    return pcts
  }

  const roles = ['top', 'jungle', 'mid', 'bottom', 'support']
  const percentiles: Record<string, Record<string, Record<string, number>>> = {}

  for (const role of ['all', ...roles]) {
    const pool = role === 'all' ? qualified : qualified.filter((p) => p.role === role)
    if (pool.length < 5) continue

    percentiles[role] = {
      kda: computePercentiles(pool.map((p) => (p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists))),
      winRate: computePercentiles(pool.map((p) => (p.wins / p.games) * 100)),
      csPerGame: computePercentiles(pool.map((p) => p.cs / p.games)),
      goldPerGame: computePercentiles(pool.map((p) => p.gold / p.games)),
      killsPerGame: computePercentiles(pool.map((p) => p.kills / p.games)),
      deathsPerGame: computePercentiles(pool.map((p) => p.deaths / p.games)),
      assistsPerGame: computePercentiles(pool.map((p) => p.assists / p.games)),
    }
  }

  await writeFile(
    join(outputDir, 'player-percentiles.json'),
    JSON.stringify(
      { updatedAt: new Date().toISOString(), minGames: 50, sampleSize: qualified.length, percentiles },
      null,
      2,
    ) + '\n',
  )
  console.log(`  player-percentiles.json — ${qualified.length} qualified players, ${Object.keys(percentiles).length} role groups`)

  console.log('\nBootstrap complete.')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
