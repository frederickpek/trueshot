export const TIER1_LEAGUE_SLUGS = [
  'lck',
  'lpl',
  'lec',
  'lcs',
  'lcp',
  'cblol-brazil',
] as const

export type Tier1LeagueSlug = (typeof TIER1_LEAGUE_SLUGS)[number]

export const LEAGUE_LABELS: Record<string, string> = {
  lck: 'LCK',
  lpl: 'LPL',
  lec: 'LEC',
  lcs: 'LCS',
  lcp: 'LCP',
  'cblol-brazil': 'CBLOL',
}

export function getLeagueLabel(slug: string): string {
  return LEAGUE_LABELS[slug] ?? slug.toUpperCase()
}

export function isTier1League(slug: string): boolean {
  return TIER1_LEAGUE_SLUGS.includes(slug as Tier1LeagueSlug)
}

export function filterTier1Leagues<T extends { slug: string }>(leagues: T[]): T[] {
  return leagues.filter((l) => isTier1League(l.slug))
}
