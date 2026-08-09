export type RadarKey = 'kda' | 'cs' | 'dmg' | 'gold' | 'vision' | 'wr'

export const RADAR_AXES: readonly { key: RadarKey; label: string }[] = [
  { key: 'kda', label: 'KDA' },
  { key: 'cs', label: 'CS' },
  { key: 'dmg', label: 'DMG' },
  { key: 'gold', label: 'GOLD' },
  { key: 'vision', label: 'VIS' },
  { key: 'wr', label: 'WIN%' },
]

export const ROLE_BOUNDS: Record<string, Record<RadarKey, [number, number]>> = {
  Top: {
    kda: [1, 6], cs: [150, 280], dmg: [10000, 24000],
    gold: [10000, 17000], vision: [8, 30], wr: [25, 75],
  },
  Jungle: {
    kda: [1, 6], cs: [100, 220], dmg: [6000, 18000],
    gold: [8000, 15000], vision: [15, 50], wr: [25, 75],
  },
  Mid: {
    kda: [1, 6], cs: [160, 300], dmg: [12000, 28000],
    gold: [10000, 18000], vision: [8, 30], wr: [25, 75],
  },
  Bot: {
    kda: [1, 7], cs: [200, 340], dmg: [14000, 30000],
    gold: [11000, 18000], vision: [8, 28], wr: [25, 75],
  },
  Support: {
    kda: [1, 8], cs: [15, 60], dmg: [3000, 12000],
    gold: [5000, 11000], vision: [30, 80], wr: [25, 75],
  },
}

export const DEFAULT_BOUNDS: Record<RadarKey, [number, number]> = {
  kda: [1, 6], cs: [100, 300], dmg: [8000, 25000],
  gold: [8000, 17000], vision: [10, 50], wr: [25, 75],
}

export function getBoundsForRole(role: string): Record<RadarKey, [number, number]> {
  return ROLE_BOUNDS[role] ?? DEFAULT_BOUNDS
}
