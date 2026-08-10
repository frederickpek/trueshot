import type { FrameTeam, GameWindow } from '../api/types'

export function getGameWinnerTeamId(window: GameWindow | undefined): string | null {
  if (!window?.frames.length) return null

  const lastFrame = window.frames[window.frames.length - 1]
  if (lastFrame.gameState !== 'finished') return null

  const blue = lastFrame.blueTeam
  const red = lastFrame.redTeam
  const blueId = window.gameMetadata.blueTeamMetadata.esportsTeamId
  const redId = window.gameMetadata.redTeamMetadata.esportsTeamId

  if (blue.totalGold !== red.totalGold) {
    return blue.totalGold > red.totalGold ? blueId : redId
  }
  if (blue.totalKills !== red.totalKills) {
    return blue.totalKills > red.totalKills ? blueId : redId
  }
  return null
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
