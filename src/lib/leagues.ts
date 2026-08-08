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

/** e.g. lck_split_3_2026 → "Split 3 2026" */
export function formatTournamentSlug(slug: string): string {
  const match = slug.match(/^[a-z-]+_split_(\d+)_(\d{4})$/i)
  if (match) return `Split ${match[1]} ${match[2]}`
  return slug.replace(/_/g, ' ')
}

export function formatStandingLabel(tournamentSlug: string, sectionName?: string): string {
  const split = formatTournamentSlug(tournamentSlug)
  return sectionName ? `${split} · ${sectionName}` : split
}
