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
  side?: 'left' | 'right'
}

export function TeamCompareCard({
  team,
  gpr,
  record,
  recordLabel = 'Win Rate',
  roster,
  loading,
  side = 'left',
}: TeamCompareCardProps) {
  const starters = roster ? pickStarterRoster(roster) : []
  const topColor = side === 'left' ? 'bg-teal' : 'bg-accent'

  return (
    <div className="overflow-hidden">
      <div className={`h-1.5 ${topColor} rounded-t-lg`} />
      <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted rounded-b-lg p-5 space-y-4">
        <div className="flex items-start gap-4">
          <img
            src={team.image}
            alt={team.name}
            className="w-14 h-14 object-contain rounded-lg bg-surface p-1 border-2 border-white/80"
          />
          <div className="flex-1 min-w-0">
            <Link
              to={`/team/${team.slug}`}
              className="font-heading text-2xl text-text hover:text-accent transition-colors truncate block leading-none tracking-[0.08em]"
            >
              {team.name}
            </Link>
            <p className="text-xs font-medium text-text-muted tracking-[0.1em] mt-1">
              {getLeagueLabel(team.leagueSlug)} · {team.region}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[3px]">
          <StatBlock
            label="GPR Rank"
            value={gpr ? formatGprRank(gpr, getLeagueLabel(team.leagueSlug)) : '—'}
            color="cream"
            roundLeft
          />
          <StatBlock
            label="Power"
            value={gpr ? formatPowerScore(gpr) : '—'}
            color="accent"
          />
          <StatBlock
            label={recordLabel}
            value={record ? formatRecordWithWinRate(record) ?? '—' : loading ? '…' : '—'}
            color="teal"
            roundRight
          />
        </div>

        {starters.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold tracking-[0.2em] text-text-muted block mb-2">
              Roster
            </span>
            <ul className="space-y-0.5">
              {starters.map((player) => (
                <li
                  key={player.summonerName + player.role}
                  className="flex justify-between text-sm py-1 px-2 rounded hover:bg-surface-muted/50 transition-colors"
                >
                  <span className="text-text-muted tracking-[0.08em]">{player.role}</span>
                  <span className="tracking-[0.08em]">{player.summonerName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function StatBlock({
  label,
  value,
  color,
  roundLeft,
  roundRight,
}: {
  label: string
  value: string
  color: 'cream' | 'accent' | 'teal'
  roundLeft?: boolean
  roundRight?: boolean
}) {
  const borderColor = {
    cream: 'border-cream',
    accent: 'border-accent',
    teal: 'border-teal',
  }[color]

  const textColor = {
    cream: 'text-cream',
    accent: 'text-accent',
    teal: 'text-teal',
  }[color]

  const radius = [
    roundLeft ? 'rounded-l-lg' : '',
    roundRight ? 'rounded-r-lg' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`bg-surface border-t-2 ${borderColor} ${radius} py-2.5 px-3 text-center`}>
      <p className={`${textColor} font-heading text-xl leading-none tracking-wider`}>{value}</p>
      <p className="text-text-muted text-[10px] font-medium tracking-[0.15em] mt-1">{label}</p>
    </div>
  )
}
