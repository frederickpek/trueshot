import type { FrameTeam, GameDetail, GameWindow } from '../api/types'

interface MatchTeamResult {
  id: string
  result: { gameWins: number }
}

export function getGameWinnerTeamId(
  window: GameWindow | undefined,
  game?: GameDetail,
  matchTeams?: MatchTeamResult[],
  allGames?: GameDetail[],
): string | null {
  if (!window?.frames.length) return null

  const blueId = window.gameMetadata.blueTeamMetadata.esportsTeamId
  const redId = window.gameMetadata.redTeamMetadata.esportsTeamId
  const lastFrame = window.frames[window.frames.length - 1]
  const blue = lastFrame.blueTeam
  const red = lastFrame.redTeam

  if (game && matchTeams && allGames) {
    const blueTeam = matchTeams.find((t) => t.id === blueId)
    const redTeam = matchTeams.find((t) => t.id === redId)

    if (game.state === 'completed' && blueTeam && redTeam) {
      const cleanSweep =
        blueTeam.result.gameWins === 0 || redTeam.result.gameWins === 0

      const allDone = allGames.every(
        (g) => g.state === 'completed' || g.state === 'unneeded',
      )
      const blueWonMatch = allDone && blueTeam.result.gameWins > redTeam.result.gameWins
      const redWonMatch = allDone && redTeam.result.gameWins > blueTeam.result.gameWins
      const completedCount = allGames.filter((g) => g.state === 'completed').length
      const isLastCompleted = game.number === completedCount

      if (cleanSweep && blueTeam.result.gameWins > 0) return blueId
      if (cleanSweep && redTeam.result.gameWins > 0) return redId

      if (blue.inhibitors > 0 && red.inhibitors === 0) return blueId
      if (red.inhibitors > 0 && blue.inhibitors === 0) return redId

      if (blueWonMatch && isLastCompleted) return blueId
      if (redWonMatch && isLastCompleted) return redId
    }
  }

  if (lastFrame.gameState !== 'finished') return null

  if (blue.totalGold !== red.totalGold) {
    return blue.totalGold > red.totalGold ? blueId : redId
  }
  if (blue.totalKills !== red.totalKills) {
    return blue.totalKills > red.totalKills ? blueId : redId
  }
  return null
}

export function getGameDuration(
  firstWindow: GameWindow | undefined,
  lastWindow: GameWindow | undefined,
): string | null {
  if (!firstWindow?.frames.length || !lastWindow?.frames.length) return null

  const startTs = firstWindow.frames[0].rfc460Timestamp
  const endTs = lastWindow.frames[lastWindow.frames.length - 1].rfc460Timestamp
  if (!startTs || !endTs) return null

  const ms = new Date(endTs).getTime() - new Date(startTs).getTime()
  if (ms <= 0) return null

  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
}

export function getTeamById<T extends { id: string }>(teams: T[], teamId: string | null) {
  if (!teamId) return null
  return teams.find((team) => team.id === teamId) ?? null
}

export function getLastFrame(window: GameWindow | undefined) {
  if (!window?.frames.length) return null
  return window.frames[window.frames.length - 1]
}

export function getTeamFrameData(
  window: GameWindow | undefined,
  esportsTeamId: string,
): { side: 'blue' | 'red'; teamFrame: FrameTeam } | null {
  if (!window) return null
  const lastFrame = getLastFrame(window)
  if (!lastFrame) return null

  if (window.gameMetadata.blueTeamMetadata.esportsTeamId === esportsTeamId) {
    return { side: 'blue', teamFrame: lastFrame.blueTeam }
  }
  if (window.gameMetadata.redTeamMetadata.esportsTeamId === esportsTeamId) {
    return { side: 'red', teamFrame: lastFrame.redTeam }
  }
  return null
}
