export const TIER1_LEAGUE_SLUGS = [
  'lck',
  'lpl',
  'lec',
  'lcs',
  'lcp',
  'cblol-brazil',
] as const

export type Tier1LeagueSlug = (typeof TIER1_LEAGUE_SLUGS)[number]

export const INTERNATIONAL_LEAGUE_SLUGS = [
  'msi',
  'worlds',
  'ewc_lol',
  'first_stand',
  'kespa_cup',
  'americas_cup',
  'lta_cross',
] as const

export type InternationalLeagueSlug = (typeof INTERNATIONAL_LEAGUE_SLUGS)[number]

export const ALL_SCHEDULE_SLUGS = [
  ...TIER1_LEAGUE_SLUGS,
  ...INTERNATIONAL_LEAGUE_SLUGS,
] as const

export const LEAGUE_IDS: Record<string, string> = {
  lck: '98767991310872058',
  lpl: '98767991314006698',
  lec: '98767991302996019',
  lcs: '98767991299243165',
  lcp: '113476371197627891',
  'cblol-brazil': '98767991332355509',
  msi: '98767991325878492',
  worlds: '98767975604431411',
  ewc_lol: '116838530616006090',
  first_stand: '113464388705111224',
  kespa_cup: '116929044967296666',
  americas_cup: '116096325848746167',
  lta_cross: '113475149040947852',
}

export const LEAGUE_LABELS: Record<string, string> = {
  lck: 'LCK',
  lpl: 'LPL',
  lec: 'LEC',
  lcs: 'LCS',
  lcp: 'LCP',
  'cblol-brazil': 'CBLOL',
  msi: 'MSI',
  worlds: 'Worlds',
  ewc_lol: 'EWC',
  first_stand: 'First Stand',
  kespa_cup: 'KeSPA Cup',
  americas_cup: 'Americas Cup',
  lta_cross: 'LTA Cross',
}

export function getLeagueLabel(slug: string): string {
  return LEAGUE_LABELS[slug] ?? slug.toUpperCase()
}

export function isTier1League(slug: string): boolean {
  return TIER1_LEAGUE_SLUGS.includes(slug as Tier1LeagueSlug)
}

export function isInternationalLeague(slug: string): boolean {
  return INTERNATIONAL_LEAGUE_SLUGS.includes(slug as InternationalLeagueSlug)
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
