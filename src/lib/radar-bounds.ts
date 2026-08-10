export type RadarKey = 'kda' | 'cs' | 'gold' | 'kills' | 'wr'

export const RADAR_AXES: readonly { key: RadarKey; label: string }[] = [
  { key: 'kda', label: 'KDA' },
  { key: 'cs', label: 'CS' },
  { key: 'gold', label: 'GOLD' },
  { key: 'kills', label: 'KILLS' },
  { key: 'wr', label: 'WINRATE' },
]

interface PercentileBucket {
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  p95: number
  min: number
  max: number
}

interface RolePercentiles {
  kda: PercentileBucket
  winRate: PercentileBucket
  csPerGame: PercentileBucket
  goldPerGame: PercentileBucket
  killsPerGame: PercentileBucket
  deathsPerGame: PercentileBucket
  assistsPerGame: PercentileBucket
}

export interface PercentilesData {
  updatedAt: string
  minGames: number
  sampleSize: number
  percentiles: Record<string, RolePercentiles>
}

export function boundsFromPercentiles(
  percentiles: RolePercentiles,
): Record<RadarKey, [number, number]> {
  return {
    kda: [percentiles.kda.p10, percentiles.kda.p95],
    cs: [percentiles.csPerGame.p10, percentiles.csPerGame.p95],
    gold: [percentiles.goldPerGame.p10, percentiles.goldPerGame.p95],
    kills: [percentiles.killsPerGame.p10, percentiles.killsPerGame.p95],
    wr: [percentiles.winRate.p10, percentiles.winRate.p95],
  }
}

const FALLBACK_BOUNDS: Record<RadarKey, [number, number]> = {
  kda: [2, 5],
  cs: [40, 310],
  gold: [8000, 15000],
  kills: [1, 5],
  wr: [35, 65],
}

export function getBoundsForRole(
  role: string,
  data: PercentilesData | null,
): Record<RadarKey, [number, number]> {
  if (!data) return FALLBACK_BOUNDS
  const key = role.toLowerCase()
  const bucket = data.percentiles[key] ?? data.percentiles['all']
  if (!bucket) return FALLBACK_BOUNDS
  return boundsFromPercentiles(bucket)
}
