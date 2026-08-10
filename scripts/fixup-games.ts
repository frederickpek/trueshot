import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const LIVESTATS_BASE = 'https://feed.lolesports.com/livestats/v1/window'
const DELAY_MS = 1500

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getGameWindow(gameId: string, startingTime: string) {
  const url = `${LIVESTATS_BASE}/${gameId}?startingTime=${startingTime}`
  const response = await fetch(url)
  if (response.status === 400 || response.status === 404) {
    return null
  }
  if (!response.ok) {
    return null
  }
  const text = await response.text()
  if (!text || text.trim().length === 0) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

interface FrameTeam {
  totalGold: number
  totalKills: number
  towers: number
  participants: Array<{ kills: number; deaths: number; assists: number; creepScore: number; totalGold: number }>
}

interface Frame {
  gameState: string
  blueTeam: FrameTeam
  redTeam: FrameTeam
}

interface GameEntry {
  gameId: string
  gameNumber: number
  metadata?: unknown
  lastFrame?: Frame
  error?: string
  noData?: boolean
}

interface MatchFile {
  matchId: string
  league: { name: string; slug: string }
  teams: Array<{ name: string; code: string }>
  startTime: string
  strategy: { type: string; count: number }
  games: GameEntry[]
}

function frameTotalGold(frame: Frame): number {
  return frame.blueTeam.totalGold + frame.redTeam.totalGold
}

function frameHasReasonableStats(frame: Frame): boolean {
  const totalKills = frame.blueTeam.totalKills + frame.redTeam.totalKills
  const totalGold = frameTotalGold(frame)
  return totalKills > 0 && totalGold > 20000
}

function framesMatch(a: Frame, b: Frame): boolean {
  return a.blueTeam.totalKills === b.blueTeam.totalKills &&
    a.redTeam.totalKills === b.redTeam.totalKills &&
    a.blueTeam.totalGold === b.blueTeam.totalGold &&
    a.redTeam.totalGold === b.redTeam.totalGold
}

function needsFixup(g: GameEntry): boolean {
  if (g.noData) return false
  if (g.error != null) return true
  if (!g.lastFrame) return true
  if (g.lastFrame.gameState !== 'finished') return true
  if (g.lastFrame.blueTeam.totalKills === 0 && g.lastFrame.redTeam.totalKills === 0) return true
  return false
}

async function main() {
  const root = join(import.meta.dirname, '..')
  const gamesDir = join(root, 'data', 'games')

  console.log('Scanning for games needing fixup…\n')

  const files = (await readdir(gamesDir)).filter((f) => f.endsWith('.json'))
  const toFix: Array<{ file: string; match: MatchFile; gameIndices: number[] }> = []

  for (const file of files) {
    const raw = await readFile(join(gamesDir, file), 'utf-8')
    const match: MatchFile = JSON.parse(raw)

    const badIndices: number[] = []
    for (let i = 0; i < match.games.length; i++) {
      if (needsFixup(match.games[i])) {
        badIndices.push(i)
      }
    }

    if (badIndices.length > 0) {
      toFix.push({ file, match, gameIndices: badIndices })
    }
  }

  const totalBadGames = toFix.reduce((sum, f) => sum + f.gameIndices.length, 0)
  console.log(`Found ${toFix.length} matches with ${totalBadGames} games to fix\n`)

  if (toFix.length === 0) {
    console.log('Nothing to fix.')
    return
  }

  const OFFSET_MINUTES = [0, 15, 30, 45, 60, 75, 90, 120, 150, 180, 240]

  let fixed = 0
  let accepted = 0
  let markedNoData = 0

  for (let mi = 0; mi < toFix.length; mi++) {
    const { file, match, gameIndices } = toFix[mi]
    const label = `${match.teams[0]?.code ?? '?'} vs ${match.teams[1]?.code ?? '?'}`
    let matchChanged = false

    for (const gi of gameIndices) {
      const game = match.games[gi]
      const gameNum = game.gameNumber ?? (gi + 1)

      const triedOffsets: string[] = []
      let bestFrame: Frame | null = null
      let bestMeta: unknown = null
      let prevFrame: Frame | null = null
      let stableFrame: Frame | null = null
      let stableMeta: unknown = null
      let allNoFrames = true
      let fixedExact = false

      for (const baseOffset of OFFSET_MINUTES) {
        const start = new Date(match.startTime)
        start.setMinutes(start.getMinutes() + baseOffset + (gameNum - 1) * 90)
        const ts = start.toISOString()

        await sleep(DELAY_MS)
        const window = await getGameWindow(game.gameId, ts)

        if (!window?.frames?.length) {
          triedOffsets.push(`${baseOffset}min=no frames`)
          prevFrame = null
          continue
        }

        allNoFrames = false
        const lastFrame = window.frames[window.frames.length - 1] as Frame

        if (lastFrame.gameState === 'finished' && frameHasReasonableStats(lastFrame)) {
          match.games[gi] = {
            gameId: game.gameId,
            gameNumber: gameNum,
            metadata: window.gameMetadata,
            lastFrame,
          }
          fixed++
          matchChanged = true
          fixedExact = true
          console.log(`  [${mi + 1}/${toFix.length}] ${label} G${gameNum} — fixed (offset=${baseOffset}min) | ${file}`)
          break
        }

        triedOffsets.push(`${baseOffset}min=state:${lastFrame.gameState}`)

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

      if (fixedExact) continue

      // Two consecutive offsets returned identical data with reasonable stats — treat as finished
      const acceptFrame = stableFrame ?? (bestFrame && frameHasReasonableStats(bestFrame) ? bestFrame : null)
      const acceptMeta = stableFrame ? stableMeta : bestMeta

      if (acceptFrame) {
        acceptFrame.gameState = 'finished'
        match.games[gi] = {
          gameId: game.gameId,
          gameNumber: gameNum,
          metadata: acceptMeta,
          lastFrame: acceptFrame,
        }
        accepted++
        matchChanged = true
        const method = stableFrame ? 'stable across offsets' : 'best available frame'
        console.log(`  [${mi + 1}/${toFix.length}] ${label} G${gameNum} — accepted (${method}) | ${file}`)
      } else if (allNoFrames) {
        match.games[gi] = {
          gameId: game.gameId,
          gameNumber: gameNum,
          error: 'no LiveStats data available',
          noData: true,
        }
        markedNoData++
        matchChanged = true
        console.log(`  [${mi + 1}/${toFix.length}] ${label} G${gameNum} — no data (marked, won't retry) | ${file}`)
      } else {
        match.games[gi] = {
          gameId: game.gameId,
          gameNumber: gameNum,
          error: 'incomplete LiveStats data',
          noData: true,
        }
        markedNoData++
        matchChanged = true
        console.log(`  [${mi + 1}/${toFix.length}] ${label} G${gameNum} — incomplete data (marked, won't retry) | ${file}`)
        console.log(`    tried: ${triedOffsets.join(', ')}`)
      }
    }

    if (matchChanged) {
      await writeFile(join(gamesDir, file), JSON.stringify(match, null, 2) + '\n')
    }
  }

  console.log(`\n=== Fixup complete ===`)
  console.log(`Fixed (exact):    ${fixed}`)
  console.log(`Accepted (best):  ${accepted}`)
  console.log(`No data (marked): ${markedNoData}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
