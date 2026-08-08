import { Link } from 'react-router-dom'
import type { Player, TeamIndexEntry } from '../api/types'
import { getLeagueLabel } from '../lib/leagues'
import type { GprEntryWithRegional } from '../lib/gpr-utils'
import { formatGprRank, formatPowerScore } from '../lib/gpr-utils'
import { formatRecordWithWinRate } from '../lib/match-utils'
import { pickStarterRoster } from '../lib/roster'

interface TeamCompareCardProps {
  team: TeamIndexEntry
  gpr?: GprEntryWithRegional
  record?: { wins: number; losses: number }
  recordLabel?: string
  roster?: Player[]
  loading?: boolean
}

export function TeamCompareCard({
  team,
  gpr,
  record,
  recordLabel = 'Recent Win Rate',
  roster,
  loading,
}: TeamCompareCardProps) {
  const starters = roster ? pickStarterRoster(roster) : []

  return (
    <div className="rounded-xl border border-surface-muted bg-surface-elevated p-5 space-y-4">
      <div className="flex items-start gap-4">
        <img
          src={team.image}
          alt={team.name}
          className="w-16 h-16 object-contain rounded-lg bg-surface p-1"
        />
        <div className="flex-1 min-w-0">
          <Link
            to={`/team/${team.slug}`}
            className="text-xl font-semibold hover:text-accent transition-colors truncate block"
          >
            {team.name}
          </Link>
          <p className="text-sm text-text-muted">{getLeagueLabel(team.leagueSlug)} · {team.region}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatBox
          label="GPR Rank"
          value={gpr ? formatGprRank(gpr, getLeagueLabel(team.leagueSlug)) : '—'}
          highlight={gpr?.rank != null && gpr.rank <= 10}
        />
        <StatBox
          label="Power Score"
          value={gpr ? formatPowerScore(gpr) : '—'}
        />
        <StatBox
          label={recordLabel}
          value={record ? formatRecordWithWinRate(record) ?? '—' : loading ? '…' : '—'}
        />
      </div>

      {starters.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Roster</h4>
          <ul className="space-y-1">
            {starters.map((player) => (
              <li key={player.summonerName + player.role} className="flex justify-between text-sm">
                <span className="capitalize">{player.role}</span>
                <span className="text-text-muted">{player.summonerName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function StatBox({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg bg-surface p-3 text-center">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? 'text-accent' : ''}`}>{value}</p>
    </div>
  )
}
