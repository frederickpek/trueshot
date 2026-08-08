import type { GprEntry } from '../api/types'
import { findGprEntry } from './match-utils'

export type GprEntryWithRegional = GprEntry & { regionalRank: number }

export function computeRegionalRank(
  teams: GprEntry[],
  entry: Pick<GprEntry, 'slug' | 'leagueSlug'>,
): number | undefined {
  const leagueTeams = teams
    .filter((t) => t.leagueSlug === entry.leagueSlug)
    .sort((a, b) => a.rank - b.rank)

  const index = leagueTeams.findIndex((t) => t.slug === entry.slug)
  return index >= 0 ? index + 1 : undefined
}

export function findGprEntryWithRegional(
  gprTeams: GprEntry[],
  slug: string,
): GprEntryWithRegional | undefined {
  const entry = findGprEntry(gprTeams, slug)
  if (!entry) return undefined

  const regionalRank = computeRegionalRank(gprTeams, entry)
  if (regionalRank == null) return undefined

  return { ...entry, regionalRank }
}

export function formatGprRank(entry: GprEntryWithRegional, leagueLabel: string): string {
  const nbsp = '\u00A0'
  return `#${entry.regionalRank}${nbsp}${leagueLabel}\n#${entry.rank}${nbsp}Global`
}

export function formatPowerScore(entry: GprEntry): string {
  return `${entry.gprScore} pts`
}
