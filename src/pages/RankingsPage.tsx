import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAllLeagueStandings, useGprData } from '../hooks/useTeamData'
import { getLeagueLabel, TIER1_LEAGUE_SLUGS, formatTournamentSlug } from '../lib/leagues'
import type { GprEntry, StandingTeam } from '../api/types'

export function RankingsPage() {
  const { standings, isLoading } = useAllLeagueStandings()
  const gpr = useGprData()
  const [leagueFilter, setLeagueFilter] = useState<string>('all')

  const filtered = leagueFilter === 'all'
    ? standings
    : standings.filter((s) => s.leagueSlug === leagueFilter)

  const gprMap = new Map<string, GprEntry>()
  if (gpr.data) {
    for (const entry of gpr.data.teams) {
      gprMap.set(entry.slug, entry)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted tracking-[0.3em] text-xs">
        Loading rankings…
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-4xl text-accent tracking-[0.1em] leading-none">
          Standings
        </h2>
        <p className="text-text-muted text-xs tracking-[0.15em] mt-2 mb-4">
          Current split standings across all tier-1 regions.
        </p>
        <div className="flex flex-wrap gap-[3px]">
          <button
            type="button"
            onClick={() => setLeagueFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold tracking-[0.1em] transition-colors ${
              leagueFilter === 'all'
                ? 'bg-accent text-white'
                : 'bg-surface-muted text-text-muted hover:bg-accent/20 hover:text-accent'
            }`}
          >
            All
          </button>
          {TIER1_LEAGUE_SLUGS.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => setLeagueFilter(slug)}
              className={`px-3 py-1.5 text-xs font-semibold tracking-[0.1em] transition-colors ${
                leagueFilter === slug
                  ? 'bg-accent text-white'
                  : 'bg-surface-muted text-text-muted hover:bg-accent/20 hover:text-accent'
              }`}
            >
              {getLeagueLabel(slug)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-text-muted tracking-[0.15em] text-sm">
          No standings available.
        </div>
      ) : (
        <div className={`grid gap-6 ${leagueFilter === 'all' ? 'md:grid-cols-2' : ''}`}>
          {filtered.map((league) => (
            <LeagueStandingsCard
              key={league.leagueSlug}
              leagueSlug={league.leagueSlug}
              tournamentSlug={league.tournamentSlug}
              sections={league.sections}
              gprMap={gprMap}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LeagueStandingsCard({
  leagueSlug,
  tournamentSlug,
  sections,
  gprMap,
}: {
  leagueSlug: string
  tournamentSlug: string
  sections: Array<{ stageName: string; name?: string; teams: StandingTeam[] }>
  gprMap: Map<string, GprEntry>
}) {
  return (
    <div className="overflow-hidden">
      <div className="h-1.5 bg-accent" />
      <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-muted flex items-center justify-between">
          <span className="font-heading text-xl text-text tracking-[0.08em]">
            {getLeagueLabel(leagueSlug)}
          </span>
          <span className="text-[0.6875rem] font-medium text-text-muted tracking-[0.15em]">
            {formatTournamentSlug(tournamentSlug)}
          </span>
        </div>

        {sections.map((section, si) => {
          const label = section.name && section.name !== section.stageName
            ? `${section.stageName} — ${section.name}`
            : section.stageName
          return (
          <div key={si}>
            <div className="px-5 py-2 bg-surface-muted/30 border-b border-surface-muted">
              <span className="text-[0.6875rem] font-semibold text-text-muted tracking-[0.15em]">
                {label}
              </span>
            </div>
            <div className="px-5 py-1.5 flex items-center text-[0.625rem] font-semibold text-text-muted tracking-[0.2em] border-b border-surface-muted">
              <span className="w-8 text-center shrink-0">#</span>
              <span className="flex-1 ml-3">Team</span>
              <span className="w-8 text-center shrink-0">W</span>
              <span className="w-8 text-center shrink-0">L</span>
              <span className="w-12 text-center shrink-0">WR</span>
              <span className="w-12 text-center shrink-0">GPR</span>
            </div>
            <ul className="divide-y divide-surface-muted">
              {section.teams.map((team, rank) => {
                const gprEntry = gprMap.get(team.slug)
                const total = team.record.wins + team.record.losses
                const wr = total > 0 ? Math.round((team.record.wins / total) * 100) : 0
                return (
                  <li key={team.id}>
                    <Link
                      to={`/team/${team.slug}`}
                      className="flex items-center px-5 py-2.5 hover:bg-surface-muted/30 transition-colors group"
                    >
                      <span className="w-8 text-center shrink-0 text-xs font-heading text-text-muted">
                        {rank + 1}
                      </span>
                      <img
                        src={team.image}
                        alt={team.code}
                        className="w-7 h-7 object-contain shrink-0 ml-3"
                      />
                      <span className="ml-3 flex-1 min-w-0 truncate text-sm font-semibold tracking-[0.08em] group-hover:text-accent transition-colors">
                        {team.name}
                      </span>
                      <span className="w-8 text-center shrink-0 text-sm font-medium text-teal">
                        {team.record.wins}
                      </span>
                      <span className="w-8 text-center shrink-0 text-sm font-medium text-accent">
                        {team.record.losses}
                      </span>
                      <span className="w-12 text-center shrink-0 text-xs font-medium text-text-muted">
                        {wr}%
                      </span>
                      <span className="w-12 text-center shrink-0 text-xs font-medium text-text-muted">
                        {gprEntry ? `#${gprEntry.rank}` : '—'}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
          )
        })}
      </div>
    </div>
  )
}
