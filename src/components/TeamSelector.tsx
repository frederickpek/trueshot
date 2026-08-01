import type { TeamIndexEntry } from '../api/types'
import { getLeagueLabel } from '../lib/leagues'

interface TeamSelectorProps {
  label: string
  leagueSlug: string
  teamSlug: string
  leagues: string[]
  teams: TeamIndexEntry[]
  onLeagueChange: (slug: string) => void
  onTeamChange: (slug: string) => void
}

export function TeamSelector({
  label,
  leagueSlug,
  teamSlug,
  leagues,
  teams,
  onLeagueChange,
  onTeamChange,
}: TeamSelectorProps) {
  const filteredTeams = teams.filter((t) => t.leagueSlug === leagueSlug)

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-text-muted">{label}</label>
      <select
        value={leagueSlug}
        onChange={(e) => onLeagueChange(e.target.value)}
        className="w-full rounded-lg bg-surface-elevated border border-surface-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
      >
        {leagues.map((slug) => (
          <option key={slug} value={slug}>
            {getLeagueLabel(slug)}
          </option>
        ))}
      </select>
      <select
        value={teamSlug}
        onChange={(e) => onTeamChange(e.target.value)}
        className="w-full rounded-lg bg-surface-elevated border border-surface-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
      >
        <option value="">Select team…</option>
        {filteredTeams.map((team) => (
          <option key={team.slug} value={team.slug}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  )
}
