export const ROLE_ORDER = ['top', 'jungle', 'mid', 'bottom', 'support'] as const

export type StarterRole = (typeof ROLE_ORDER)[number]

function isStarterRole(role: string): role is StarterRole {
  return (ROLE_ORDER as readonly string[]).includes(role)
}

/**
 * Score how likely a player is the main roster starter for their role.
 * Starters use official headshots; subs use default or generic uploads.
 */
export function starterLikelihoodScore(player: { role: string; image: string }): number {
  if (!isStarterRole(player.role)) return -1000

  const img = player.image
  if (img.includes('default-headshot')) return 0
  if (/_F\.PNG/i.test(img)) return 100
  if (/-01\.png/i.test(img)) return 80
  if (img.includes('image6-')) return 10
  return 50
}

/** Pick one starter per role using headshot signals from the LoL Esports API. */
export function pickStarterRoster<T extends { role: string; image: string }>(players: T[]): T[] {
  return ROLE_ORDER.flatMap((role) => {
    const candidates = players.filter((p) => p.role === role)
    if (candidates.length === 0) return []

    let best = candidates[0]
    let bestScore = starterLikelihoodScore(best)
    let bestIndex = players.indexOf(best)

    for (const candidate of candidates.slice(1)) {
      const score = starterLikelihoodScore(candidate)
      const index = players.indexOf(candidate)
      if (score > bestScore || (score === bestScore && index > bestIndex)) {
        best = candidate
        bestScore = score
        bestIndex = index
      }
    }

    return bestScore >= 0 ? [best] : []
  })
}
