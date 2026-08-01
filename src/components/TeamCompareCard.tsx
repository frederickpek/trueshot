import { Link } from 'react-router-dom'
import type { GprEntry, TeamIndexEntry } from '../api/types'
import { getLeagueLabel } from '../lib/leagues'

interface TeamCompareCardProps {
  team: TeamIndexEntry
  gpr?: GprEntry
  record?: { wins: number; losses: number }
  roster?: Array<{ summonerName: string; role: string }>
  loading?: boolean
}

const ROLE_ORDER = ['top', 'jungle', 'mid', 'bottom', 'support']

export function TeamCompareCard({ team, gpr, record, roster, loading }: TeamCompareCardProps) {
  const sortedRoster = roster
    ? [...roster].sort(
        (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
      )
    : []

  const starters = sortedRoster.filter((p) => ROLE_ORDER.includes(p.role)).slice(0, 5)

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
        <StatBox label="GPR Rank" value={gpr ? `#${gpr.rank}` : '—'} highlight={gpr?.rank != null && gpr.rank <= 10} />
        <StatBox label="Power Score" value={gpr ? `${gpr.gprScore}` : '—'} />
        <StatBox
          label="Record"
          value={record ? `${record.wins}W ${record.losses}L` : loading ? '…' : '—'}
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
