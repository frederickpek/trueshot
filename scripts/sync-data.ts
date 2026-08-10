import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const API_BASE = 'https://esports-api.lolesports.com/persisted/gw'
const API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z'
const LIVESTATS_BASE = 'https://feed.lolesports.com/livestats/v1/window'
const GPR_URL = 'https://lolesports.com/en-US/gpr/2026/current'
const GAME_FETCH_DELAY_MS = 500

const TIER1_SLUGS = ['lck', 'lpl', 'lec', 'lcs', 'lcp', 'cblol-brazil'] as const

const INTERNATIONAL_SLUGS = [
  'msi', 'worlds', 'ewc_lol', 'first_stand',
  'kespa_cup', 'americas_cup', 'lta_cross',
] as const

const ALL_SCHEDULE_SLUGS: readonly string[] = [...TIER1_SLUGS, ...INTERNATIONAL_SLUGS]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface League {
  id: string
  slug: string
  name: string
  region: string
  image: string
}

interface GprEntry {
  rank: number
  gprScore: number
  elo: number
  slug: string
  name: string
  code: string
  leagueSlug: string
  leagueName: string
  image: string
}

interface TeamIndexEntry {
  slug: string
  name: string
  code: string
  leagueSlug: string
  leagueName: string
  leagueId: string
  region: string
  image: string
  gprRank?: number
  gprScore?: number
}

interface ScheduleEvent {
  startTime: string
  state: string
  type: string
  blockName?: string
  league: { name: string; slug: string }
  match: {
    id: string
    teams: Array<{
      name: string
      code: string
      image: string
      result?: { outcome?: string; gameWins: number }
    }>
    strategy: { type: string; count: number }
  }
}

async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`)
  url.searchParams.set('hl', 'en-US')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), {
    headers: { 'x-api-key': API_KEY },
  })

  if (!response.ok) {
    throw new Error(`API error ${response.status} for ${path}`)
  }

  return response.json() as Promise<T>
}

async function getLeagues(): Promise<League[]> {
  const data = await apiFetch<{ data: { leagues: League[] } }>('getLeagues')
  return data.data.leagues
}

function getTier1Leagues(leagues: League[]): League[] {
  return leagues.filter((l) => TIER1_SLUGS.includes(l.slug as (typeof TIER1_SLUGS)[number]))
}

function getScheduleLeagues(leagues: League[]): League[] {
  return leagues.filter((l) => ALL_SCHEDULE_SLUGS.includes(l.slug))
}

async function getSchedulePage(leagueId: string, pageToken?: string): Promise<{
  events: ScheduleEvent[]
  older?: string
}> {
  const params: Record<string, string> = { leagueId }
  if (pageToken) params.pageToken = pageToken

  const data = await apiFetch<{
    data: {
      schedule: {
        events: ScheduleEvent[]
        pages: { older?: string }
      }
    }
  }>('getSchedule', params)

  return {
    events: data.data.schedule.events.filter((e) => e.type === 'match'),
    older: data.data.schedule.pages.older,
  }
}

async function loadExistingSchedule(path: string): Promise<Map<string, ScheduleEvent>> {
  try {
    const raw = await readFile(path, 'utf-8')
    const data = JSON.parse(raw)
    const map = new Map<string, ScheduleEvent>()
    for (const event of data.events ?? []) {
      map.set(event.match.id, event)
    }
    return map
  } catch {
    return new Map()
  }
}

function hasRealOutcome(event: ScheduleEvent): boolean {
  return event.match.teams.some((t) => t.result?.outcome != null)
}

function isNewlyCompleted(prev: ScheduleEvent | undefined, curr: ScheduleEvent): boolean {
  if (curr.state !== 'completed') return false
  if (!hasRealOutcome(curr)) return false
  if (!prev) return true
  if (prev.state !== 'completed') return true
  if (!hasRealOutcome(prev) && hasRealOutcome(curr)) return true
  return false
}

async function syncLeagueSchedule(
  league: { id: string; slug: string },
  schedulesDir: string,
): Promise<{ total: number; added: number; updated: number; newlyCompleted: ScheduleEvent[] }> {
  const filePath = join(schedulesDir, `${league.slug}.json`)
  const existing = await loadExistingSchedule(filePath)
  let added = 0
  let updated = 0
  const newlyCompleted: ScheduleEvent[] = []

  const page = await getSchedulePage(league.id)
  let allNew = true

  for (const event of page.events) {
    const prev = existing.get(event.match.id)
    if (isNewlyCompleted(prev, event)) {
      newlyCompleted.push(event)
    }
    if (!prev) {
      existing.set(event.match.id, event)
      added++
    } else if (prev.state !== event.state || (!hasRealOutcome(prev) && hasRealOutcome(event))) {
      existing.set(event.match.id, event)
      updated++
    }
    if (prev) allNew = false
  }

  if (allNew && page.older) {
    const page2 = await getSchedulePage(league.id, page.older)
    for (const event of page2.events) {
      const prev = existing.get(event.match.id)
      if (isNewlyCompleted(prev, event)) {
        newlyCompleted.push(event)
      }
      if (!prev) {
        existing.set(event.match.id, event)
        added++
      } else if (prev.state !== event.state || (!hasRealOutcome(prev) && hasRealOutcome(event))) {
        existing.set(event.match.id, event)
        updated++
      }
    }
  }

  const allEvents = [...existing.values()]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  await writeJson(filePath, {
    updatedAt: new Date().toISOString(),
    leagueId: league.id,
    leagueSlug: league.slug,
    events: allEvents,
  })

  return { total: allEvents.length, added, updated, newlyCompleted }
}

async function fetchGpr(): Promise<GprEntry[]> {
  const response = await fetch(GPR_URL, {
    headers: {
      'User-Agent': 'Trueshot/1.0 (GitHub Actions data sync)',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch GPR page: ${response.status}`)
  }

  const html = await response.text()

  const pattern =
    /"elo":(\d+),"gprScore":(\d+),"rank":(\d+)\},"team":\{"__typename":"Team","code":"([^"]+)","homeLeague":\{"__typename":"HomeLeague","id":"[^"]+","image":"[^"]+","name":"([^"]+)","slug":"([^"]+)"\},"id":"[^"]+","image":"([^"]+)","name":"([^"]+)","slug":"([^"]+)"/g

  const teams: GprEntry[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html)) !== null) {
    teams.push({
      elo: Number(match[1]),
      gprScore: Number(match[2]),
      rank: Number(match[3]),
      code: match[4],
      leagueName: match[5],
      leagueSlug: match[6],
      image: match[7],
      name: match[8],
      slug: match[9],
    })
  }

  if (teams.length === 0) {
    throw new Error('No GPR teams parsed — page structure may have changed')
  }

  teams.sort((a, b) => a.rank - b.rank)
  return teams
}

function buildTeamsIndex(leagues: League[], gprTeams: GprEntry[]): TeamIndexEntry[] {
  const leagueBySlug = new Map(leagues.map((l) => [l.slug, l]))
  const entries: TeamIndexEntry[] = []

  for (const gpr of gprTeams) {
    if (!TIER1_SLUGS.includes(gpr.leagueSlug as (typeof TIER1_SLUGS)[number])) continue

    const league = leagueBySlug.get(gpr.leagueSlug)
    if (!league) continue

    entries.push({
      slug: gpr.slug,
      name: gpr.name,
      code: gpr.code,
      leagueSlug: gpr.leagueSlug,
      leagueName: gpr.leagueName,
      leagueId: league.id,
      region: league.region,
      image: gpr.image,
      gprRank: gpr.rank,
      gprScore: gpr.gprScore,
    })
  }

  entries.sort((a, b) => {
    const leagueCmp = a.leagueSlug.localeCompare(b.leagueSlug)
    if (leagueCmp !== 0) return leagueCmp
    return a.name.localeCompare(b.name)
  })

  return entries
}

async function writeJson(path: string, data: unknown) {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, JSON.stringify(data, null, 2) + '\n')
}

// ---------------------------------------------------------------------------
// Game data fetching (LiveStats)
// ---------------------------------------------------------------------------

interface GameDetail {
  number: number
  id: string
  state: string
}

interface FrameTeam {
  totalGold: number
  totalKills: number
  towers: number
  participants: Array<{
    participantId: number
    totalGold: number
    level: number
    kills: number
    deaths: number
    assists: number
    creepScore: number
  }>
}

interface GameFrame {
  rfc460Timestamp?: string
  gameState: string
  blueTeam: FrameTeam
  redTeam: FrameTeam
}

interface FetchedGame {
  gameId: string
  gameNumber: number
  metadata: unknown
  lastFrame: GameFrame | null
  error?: string
}

interface FetchedMatch {
  matchId: string
  league: { name: string; slug: string }
  teams: Array<{ name: string; code: string; image: string }>
  startTime: string
  strategy: { type: string; count: number }
  games: FetchedGame[]
}

async function getEventDetails(matchId: string): Promise<GameDetail[]> {
  const data = await apiFetch<{
    data: {
      event: {
        match: {
          games: GameDetail[]
        }
      }
    }
  }>('getEventDetails', { id: matchId })
  return data.data.event.match.games
}

async function getGameWindow(gameId: string, startingTime: string, retries = 2): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const url = `${LIVESTATS_BASE}/${gameId}?startingTime=${startingTime}`
    const response = await fetch(url)
    if (response.status === 204 || response.status === 400 || response.status === 404) {
      return null
    }
    if (!response.ok) {
      throw new Error(`LiveStats error ${response.status}`)
    }
    const text = await response.text()
    if (!text || text.trim().length === 0) {
      if (attempt < retries) { await sleep(1000); continue }
      return null
    }
    try {
      return JSON.parse(text)
    } catch {
      if (attempt < retries) { await sleep(1000); continue }
      return null
    }
  }
  return null
}

const GAME_OFFSET_MINUTES = [90, 120, 150, 180, 240, 60, 45, 30, 15, 0]

function offsetTimestamp(matchStartTime: string, gameNumber: number, offsetMin: number): string {
  const start = new Date(matchStartTime)
  start.setMinutes(start.getMinutes() + (gameNumber - 1) * 90 + offsetMin)
  return start.toISOString()
}

function frameHasReasonableStats(frame: GameFrame): boolean {
  const totalKills = frame.blueTeam.totalKills + frame.redTeam.totalKills
  const totalGold = frame.blueTeam.totalGold + frame.redTeam.totalGold
  return totalKills > 0 && totalGold > 20000
}

function frameTotalGold(frame: GameFrame): number {
  return frame.blueTeam.totalGold + frame.redTeam.totalGold
}

function framesMatch(a: GameFrame, b: GameFrame): boolean {
  return a.blueTeam.totalKills === b.blueTeam.totalKills &&
    a.redTeam.totalKills === b.redTeam.totalKills &&
    a.blueTeam.totalGold === b.blueTeam.totalGold &&
    a.redTeam.totalGold === b.redTeam.totalGold
}

async function fetchSingleGame(
  gameId: string,
  gameNumber: number,
  matchStartTime: string,
): Promise<FetchedGame> {
  let bestFrame: GameFrame | null = null
  let bestMeta: unknown = null
  let prevFrame: GameFrame | null = null
  let stableFrame: GameFrame | null = null
  let stableMeta: unknown = null
  let allNoFrames = true

  for (const offset of GAME_OFFSET_MINUTES) {
    const ts = offsetTimestamp(matchStartTime, gameNumber, offset)
    await sleep(GAME_FETCH_DELAY_MS)

    const window = await getGameWindow(gameId, ts) as {
      gameMetadata?: unknown
      frames?: GameFrame[]
    } | null

    if (!window?.frames?.length) {
      prevFrame = null
      continue
    }

    allNoFrames = false
    const lastFrame = window.frames[window.frames.length - 1]

    if (lastFrame.gameState === 'finished' && frameHasReasonableStats(lastFrame)) {
      return {
        gameId,
        gameNumber,
        metadata: window.gameMetadata,
        lastFrame,
      }
    }

    if (prevFrame && framesMatch(prevFrame, lastFrame) && frameHasReasonableStats(lastFrame)) {
      stableFrame = lastFrame
      stableMeta = window.gameMetadata
    }

    if (!bestFrame || frameTotalGold(lastFrame) > frameTotalGold(bestFrame)) {
      bestFrame = lastFrame
      bestMeta = window.gameMetadata
    }

    prevFrame = lastFrame
  }

  const acceptFrame = stableFrame ?? (bestFrame && frameHasReasonableStats(bestFrame) ? bestFrame : null)
  const acceptMeta = stableFrame ? stableMeta : bestMeta

  if (acceptFrame) {
    acceptFrame.gameState = 'finished'
    return {
      gameId,
      gameNumber,
      metadata: acceptMeta,
      lastFrame: acceptFrame,
    }
  }

  if (allNoFrames) {
    return { gameId, gameNumber, metadata: null, lastFrame: null, error: 'no LiveStats data available' }
  }

  return {
    gameId,
    gameNumber,
    metadata: bestMeta,
    lastFrame: bestFrame,
    error: `unfinished (gameState: ${bestFrame?.gameState ?? 'unknown'})`,
  }
}

async function fetchGameData(
  event: ScheduleEvent,
): Promise<FetchedMatch | null> {
  const matchId = event.match.id
  const [teamA, teamB] = event.match.teams
  const label = `${teamA?.code ?? '?'} vs ${teamB?.code ?? '?'}`

  let gameDetails: GameDetail[]
  try {
    gameDetails = await getEventDetails(matchId)
  } catch (err) {
    console.warn(`    ✗ ${label} — failed to get details: ${err}`)
    return null
  }

  const completedGames = gameDetails.filter((g) => g.state === 'completed')
  if (completedGames.length === 0) {
    console.log(`    ${label} — no completed games, skipping`)
    return null
  }

  const games: FetchedGame[] = []

  for (const game of completedGames) {
    const result = await fetchSingleGame(game.id, game.number, event.startTime)
    games.push(result)
  }

  const successCount = games.filter((g) => !g.error).length
  console.log(`    ${label} — ${successCount}/${completedGames.length} games OK`)

  return {
    matchId,
    league: event.league,
    teams: event.match.teams.map((t) => ({ name: t.name, code: t.code, image: t.image })),
    startTime: event.startTime,
    strategy: event.match.strategy,
    games,
  }
}

// ---------------------------------------------------------------------------
// Elo & player stats (incremental processing)
// ---------------------------------------------------------------------------

const ELO_K = 32
const ELO_START = 1200

interface EloSnapshot { date: string; elo: number }

interface TeamEloData {
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

function expectedScore(rA: number, rB: number): number {
  return 1 / (1 + 10 ** ((rB - rA) / 400))
}

function updateElo(winner: TeamEloData, loser: TeamEloData): void {
  const e = expectedScore(winner.elo, loser.elo)
  winner.elo += ELO_K * (1 - e)
  loser.elo += ELO_K * (0 - (1 - e))
}

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

function resolveGameWinners(match: FetchedMatch & { teams: Array<{ result?: { outcome?: string; gameWins: number } }> }): GameWinnerResult | null {
  const winnerIdx = match.teams[0]?.result?.outcome === 'win' ? 0 : 1
  const expectedWinnerWins = match.teams[winnerIdx].result!.gameWins
  const expectedLoserWins = match.teams[1 - winnerIdx].result!.gameWins
  const totalExpected = expectedWinnerWins + expectedLoserWins

  const validGames = match.games.filter(
    (g: FetchedGame) =>
      g.metadata &&
      (g.metadata as Record<string, unknown>).blueTeamMetadata &&
      (g.metadata as Record<string, unknown>).redTeamMetadata &&
      g.lastFrame &&
      !g.error &&
      g.lastFrame.blueTeam.totalGold > 0,
  )

  if (validGames.length === 0) return null

  const getMeta = (g: FetchedGame) => g.metadata as {
    blueTeamMetadata: { esportsTeamId: string; participantMetadata: Array<{ participantId: number; esportsPlayerId: string; summonerName: string; championId: string; role: string }> }
    redTeamMetadata: { esportsTeamId: string; participantMetadata: Array<{ participantId: number; esportsPlayerId: string; summonerName: string; championId: string; role: string }> }
  }

  const uniqueIds = new Set<string>()
  for (const g of validGames) {
    const m = getMeta(g)
    uniqueIds.add(m.blueTeamMetadata.esportsTeamId)
    uniqueIds.add(m.redTeamMetadata.esportsTeamId)
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
    }
    if (!side) { tiedGames.add(game.gameId); continue }
    const m = getMeta(game)
    const winId = side === 'blue' ? m.blueTeamMetadata.esportsTeamId : m.redTeamMetadata.esportsTeamId
    assignments.push({ gameId: game.gameId, winningSide: side, winId, goldDiff })
  }

  function tryValidate(assigned: GameAssignment[], skipped: Set<string>): GameWinnerResult | null {
    const wins = new Map<string, number>([[idA, 0], [idB, 0]])
    for (const a of assigned) wins.set(a.winId, (wins.get(a.winId) ?? 0) + 1)
    const missingGames = totalExpected - validGames.length
    for (const [cW, cL] of [[idA, idB], [idB, idA]] as const) {
      const nWW = expectedWinnerWins - (wins.get(cW) ?? 0)
      const nLW = expectedLoserWins - (wins.get(cL) ?? 0)
      if (nWW >= 0 && nLW >= 0 && nWW + nLW === missingGames + skipped.size) {
        const perGame = new Map<string, string>()
        for (const a of assigned) perGame.set(a.gameId, a.winId)
        return { winnerTeamId: cW, loserTeamId: cL, perGame, skippedGames: skipped }
      }
    }
    return null
  }

  const result = tryValidate(assignments, tiedGames)
  if (result) return result

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

async function loadTeamElos(path: string): Promise<Map<string, TeamEloData>> {
  try {
    const raw = await readFile(path, 'utf-8')
    const data = JSON.parse(raw)
    const map = new Map<string, TeamEloData>()
    for (const t of data.teams ?? []) map.set(t.code, t)
    return map
  } catch {
    return new Map()
  }
}

async function loadPlayerProfile(path: string): Promise<PlayerProfile | null> {
  try {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function getOrCreateTeam(teams: Map<string, TeamEloData>, code: string, name: string): TeamEloData {
  let team = teams.get(code)
  if (!team) {
    team = { code, name, elo: ELO_START, games: 0, wins: 0, blueSideWins: 0, blueSideGames: 0, redSideWins: 0, redSideGames: 0, history: [] }
    teams.set(code, team)
  }
  team.name = name
  return team
}

function getOrCreatePlayer(players: Map<string, PlayerProfile>, id: string, name: string, role: string): PlayerProfile {
  let p = players.get(id)
  if (!p) {
    p = { playerId: id, name, role, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, gold: 0, champions: {} }
    players.set(id, p)
  }
  if (name) p.name = name
  if (role) p.role = role
  return p
}

function updatePlayerStats(
  player: PlayerProfile,
  championId: string,
  won: boolean,
  stats: { kills: number; deaths: number; assists: number; creepScore: number; totalGold: number },
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
    champ = { id: championId, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, gold: 0 }
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

async function processNewMatches(
  fetchedMatches: FetchedMatch[],
  dataDir: string,
): Promise<void> {
  if (fetchedMatches.length === 0) return

  const elosPath = join(dataDir, 'team-elos.json')
  const playersDir = join(dataDir, 'players')
  await mkdir(playersDir, { recursive: true })

  const teamElos = await loadTeamElos(elosPath)
  const touchedPlayers = new Map<string, PlayerProfile>()

  const matches = [...fetchedMatches].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  )

  let processed = 0

  for (const match of matches) {
    const t0 = match.teams[0] as { name: string; code: string; result?: { outcome?: string; gameWins: number } }
    const t1 = match.teams[1] as { name: string; code: string; result?: { outcome?: string; gameWins: number } }
    if (!t0?.result?.outcome || !t1?.result?.outcome) continue

    const winnerIdx = t0.result.outcome === 'win' ? 0 : 1
    const winner = match.teams[winnerIdx]
    const loser = match.teams[1 - winnerIdx]

    const winnerElo = getOrCreateTeam(teamElos, winner.code, winner.name)
    const loserElo = getOrCreateTeam(teamElos, loser.code, loser.name)
    updateElo(winnerElo, loserElo)
    const matchDate = match.startTime.slice(0, 10)
    winnerElo.history.push({ date: matchDate, elo: Math.round(winnerElo.elo) })
    loserElo.history.push({ date: matchDate, elo: Math.round(loserElo.elo) })
    winnerElo.games++
    winnerElo.wins++
    loserElo.games++

    const resolution = resolveGameWinners(match as FetchedMatch & { teams: Array<{ result?: { outcome?: string; gameWins: number } }> })

    const getMeta = (g: FetchedGame) => g.metadata as {
      blueTeamMetadata: { esportsTeamId: string; participantMetadata: Array<{ participantId: number; esportsPlayerId: string; summonerName: string; championId: string; role: string }> }
      redTeamMetadata: { esportsTeamId: string; participantMetadata: Array<{ participantId: number; esportsPlayerId: string; summonerName: string; championId: string; role: string }> }
    }

    for (const game of match.games) {
      if (!game.metadata || !game.lastFrame || game.error) continue
      const meta = getMeta(game)
      if (!meta.blueTeamMetadata || !meta.redTeamMetadata) continue
      if (game.lastFrame.blueTeam.totalGold === 0 && game.lastFrame.blueTeam.totalKills === 0) continue

      if (resolution) {
        const blueIsMatchWinner = meta.blueTeamMetadata.esportsTeamId === resolution.winnerTeamId
        const blueTeamElo = blueIsMatchWinner ? winnerElo : loserElo
        const redTeamElo = blueIsMatchWinner ? loserElo : winnerElo
        blueTeamElo.blueSideGames++
        redTeamElo.redSideGames++
        const gameWinnerId = resolution.perGame.get(game.gameId)
        if (gameWinnerId) {
          if (gameWinnerId === meta.blueTeamMetadata.esportsTeamId) blueTeamElo.blueSideWins++
          else redTeamElo.redSideWins++
        }
      }

      if (!resolution || resolution.skippedGames.has(game.gameId)) continue
      const gameWinnerId = resolution.perGame.get(game.gameId)
      if (!gameWinnerId) continue

      const blueWon = gameWinnerId === meta.blueTeamMetadata.esportsTeamId
      const frame = game.lastFrame

      async function ensurePlayer(id: string, name: string, role: string): Promise<PlayerProfile> {
        let p = touchedPlayers.get(id)
        if (p) return p
        p = await loadPlayerProfile(join(playersDir, `${id}.json`))
        if (!p) p = getOrCreatePlayer(touchedPlayers, id, name, role)
        touchedPlayers.set(id, p)
        if (name) p.name = name
        if (role) p.role = role
        return p
      }

      for (const pm of meta.blueTeamMetadata.participantMetadata) {
        const part = frame.blueTeam.participants.find((p) => p.participantId === pm.participantId)
        if (!part) continue
        const player = await ensurePlayer(pm.esportsPlayerId, pm.summonerName, pm.role)
        updatePlayerStats(player, pm.championId, blueWon, part)
      }

      for (const pm of meta.redTeamMetadata.participantMetadata) {
        const part = frame.redTeam.participants.find((p) => p.participantId === pm.participantId)
        if (!part) continue
        const player = await ensurePlayer(pm.esportsPlayerId, pm.summonerName, pm.role)
        updatePlayerStats(player, pm.championId, !blueWon, part)
      }
    }

    processed++
  }

  // Save team elos
  const teamsArray = [...teamElos.values()]
    .map((t) => ({ ...t, elo: Math.round(t.elo) }))
    .sort((a, b) => b.elo - a.elo)

  await writeJson(elosPath, {
    updatedAt: new Date().toISOString(),
    k: ELO_K,
    startElo: ELO_START,
    teams: teamsArray,
  })

  // Save touched player profiles
  for (const player of touchedPlayers.values()) {
    await writeFile(
      join(playersDir, `${player.playerId}.json`),
      JSON.stringify(player, null, 2) + '\n',
    )
  }

  // Update player index + percentiles
  const allPlayerFiles = (await readdir(playersDir)).filter((f) => f.endsWith('.json'))
  const allPlayers: PlayerProfile[] = []
  const playerIndex: Array<{ id: string; name: string; role: string; games: number }> = []
  for (const f of allPlayerFiles) {
    const p = JSON.parse(await readFile(join(playersDir, f), 'utf-8')) as PlayerProfile
    allPlayers.push(p)
    playerIndex.push({ id: p.playerId, name: p.name, role: p.role, games: p.games })
  }
  playerIndex.sort((a, b) => b.games - a.games)
  await writeJson(join(dataDir, 'player-index.json'), {
    updatedAt: new Date().toISOString(),
    players: playerIndex,
  })

  // Recompute percentile distributions
  const qualified = allPlayers.filter((p) => p.games >= 50)
  if (qualified.length >= 5) {
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

    await writeJson(join(dataDir, 'player-percentiles.json'), {
      updatedAt: new Date().toISOString(),
      minGames: 50,
      sampleSize: qualified.length,
      percentiles,
    })
    console.log(`  Percentiles updated (${qualified.length} qualified players)`)
  }

  console.log(`\nStats updated: ${processed} matches → ${teamElos.size} teams, ${touchedPlayers.size} players touched`)
}

async function main() {
  const root = join(import.meta.dirname, '..')
  const dataDir = join(root, 'public', 'data')
  const schedulesDir = join(dataDir, 'schedules')

  console.log('Fetching leagues…')
  const allLeagues = await getLeagues()
  const tier1Leagues = getTier1Leagues(allLeagues)
  const scheduleLeagues = getScheduleLeagues(allLeagues)

  console.log('Fetching GPR rankings…')
  const gprTeams = await fetchGpr()

  const teamsIndex = buildTeamsIndex(tier1Leagues, gprTeams)

  console.log(`Writing ${teamsIndex.length} teams to teams-index.json`)
  await writeJson(join(dataDir, 'teams-index.json'), {
    updatedAt: new Date().toISOString(),
    leagues: tier1Leagues,
    teams: teamsIndex,
  })

  await writeJson(join(dataDir, 'gpr.json'), {
    updatedAt: new Date().toISOString(),
    source: GPR_URL,
    teams: gprTeams,
  })

  await mkdir(schedulesDir, { recursive: true })

  const allNewlyCompleted: ScheduleEvent[] = []

  for (const league of scheduleLeagues) {
    console.log(`Syncing schedule for ${league.slug}…`)
    try {
      const result = await syncLeagueSchedule(league, schedulesDir)
      console.log(`  ${result.total} total (${result.added} new, ${result.updated} updated)`)
      if (result.newlyCompleted.length > 0) {
        console.log(`  ${result.newlyCompleted.length} newly completed match(es)`)
        allNewlyCompleted.push(...result.newlyCompleted)
      }
    } catch (err) {
      console.warn(`  Failed to sync ${league.slug}:`, err)
    }
  }

  // -------------------------------------------------------------------------
  // Fetch game data for newly completed matches
  // -------------------------------------------------------------------------
  const gamesDir = join(root, 'data', 'games')
  await mkdir(gamesDir, { recursive: true })

  const existingGameFiles = new Set(
    (await readdir(gamesDir)).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')),
  )

  const toFetch = allNewlyCompleted.filter((e) => !existingGameFiles.has(e.match.id))

  if (toFetch.length > 0) {
    console.log(`\nFetching game data for ${toFetch.length} new match(es)…`)
    if (toFetch.length < allNewlyCompleted.length) {
      console.log(`  (${allNewlyCompleted.length - toFetch.length} already downloaded, skipped)`)
    }

    const fetchedMatches: FetchedMatch[] = []
    let saved = 0

    for (const event of toFetch) {
      const result = await fetchGameData(event)
      if (result) {
        await writeFile(
          join(gamesDir, `${result.matchId}.json`),
          JSON.stringify(result, null, 2) + '\n',
        )
        // Attach match result from schedule event for elo processing
        const withResult = {
          ...result,
          teams: result.teams.map((t, i) => ({ ...t, result: event.match.teams[i]?.result })),
        }
        fetchedMatches.push(withResult as FetchedMatch)
        saved++
      }
    }

    console.log(`\nGame data: ${saved} match(es) saved to data/games/`)

    await processNewMatches(fetchedMatches, dataDir)
  } else if (allNewlyCompleted.length > 0) {
    console.log(`\nAll ${allNewlyCompleted.length} newly completed match(es) already downloaded — skipping fetch.`)
  } else {
    console.log('\nNo newly completed matches — skipping game data fetch.')
  }

  console.log('\nSyncing champion icons…')
  await syncChampionIcons(root)

  console.log('Sync complete.')
}

async function syncChampionIcons(root: string) {
  const iconsDir = join(root, 'public', 'icons', 'champions')
  await mkdir(iconsDir, { recursive: true })

  const existing = new Set(
    (await readdir(iconsDir)).filter((f) => f.endsWith('.png')).map((f) => f.replace('.png', '')),
  )

  const versions = (await fetch('https://ddragon.leagueoflegends.com/api/versions.json').then(
    (r) => r.json(),
  )) as string[]
  const latest = versions[0]

  const champData = (await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${latest}/data/en_US/champion.json`,
  ).then((r) => r.json())) as { data: Record<string, unknown> }

  const allChamps: string[] = Object.keys(champData.data)
  const missing = allChamps.filter((c) => !existing.has(c))

  if (missing.length === 0) {
    console.log(`  All ${allChamps.length} champion icons up to date`)
    return
  }

  console.log(`  Downloading ${missing.length} new champion icon(s)…`)
  for (let i = 0; i < missing.length; i += 20) {
    const batch = missing.slice(i, i + 20)
    await Promise.all(
      batch.map(async (c) => {
        const url = `https://ddragon.leagueoflegends.com/cdn/${latest}/img/champion/${c}.png`
        const res = await fetch(url)
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer())
          await writeFile(join(iconsDir, `${c}.png`), buf)
        } else {
          console.warn(`  Failed to download ${c}: ${res.status}`)
        }
      }),
    )
  }
  console.log(`  ${missing.length} champion icon(s) added`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
