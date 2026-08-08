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
  side?: 'left' | 'right'
}

export function TeamSelector({
  label,
  leagueSlug,
  teamSlug,
  leagues,
  teams,
  onLeagueChange,
  onTeamChange,
  side = 'right',
}: TeamSelectorProps) {
  const activeClass = side === 'left'
    ? 'bg-teal text-surface'
    : 'bg-accent text-white'
  const hoverClass = side === 'left'
    ? 'bg-surface-muted text-text-muted hover:bg-teal/20 hover:text-teal'
    : 'bg-surface-muted text-text-muted hover:bg-accent/20 hover:text-accent'
  const filteredTeams = teams.filter((t) => t.leagueSlug === leagueSlug)

  return (
    <div className="space-y-3">
      <span className="text-[11px] font-semibold tracking-[0.25em] text-text-muted block">
        {label}
      </span>
      <div className="flex flex-wrap gap-[3px]">
        {leagues.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => onLeagueChange(slug)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-[0.1em] transition-colors ${
              leagueSlug === slug ? activeClass : hoverClass
            }`}
          >
            {getLeagueLabel(slug)}
          </button>
        ))}
      </div>
      <div className="relative">
        <select
          value={teamSlug}
          onChange={(e) => onTeamChange(e.target.value)}
          className="w-full rounded-full bg-surface-elevated border-2 border-surface-muted px-5 py-2.5 text-sm tracking-[0.08em] appearance-none cursor-pointer focus:border-accent transition-colors"
        >
          <option value="">Select team…</option>
          {filteredTeams.map((team) => (
            <option key={team.slug} value={team.slug}>
              {team.name}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none text-xs">
          ▾
        </div>
      </div>
    </div>
  )
}
