import React from 'react'
import { Link } from 'react-router-dom'
import type { Player, TeamIndexEntry } from '../api/types'
import { getLeagueLabel } from '../lib/leagues'
import { formatRecordWithWinRate } from '../lib/match-utils'
import { pickStarterRoster } from '../lib/roster'
import type { TeamEloRanked } from '../hooks/useTeamData'

interface TeamCompareCardProps {
  team: TeamIndexEntry
  elo?: TeamEloRanked
  record?: { wins: number; losses: number }
  recordLabel?: string
  roster?: Player[]
  loading?: boolean
  side?: 'left' | 'right'
}

function formatTrueshotRank(elo: TeamEloRanked, leagueLabel: string): React.ReactNode {
  return <><span className="whitespace-nowrap">#{elo.regionalRank} {leagueLabel}</span><span className="mx-1">·</span><span className="whitespace-nowrap">#{elo.globalRank} Global</span></>
}

export function TeamCompareCard({
  team,
  elo,
  record,
  recordLabel = 'Win Rate',
  roster,
  loading,
  side = 'left',
}: TeamCompareCardProps) {
  const starters = roster ? pickStarterRoster(roster) : []
  const topColor = side === 'left' ? 'bg-teal' : 'bg-accent'

  return (
    <div className="overflow-hidden flex flex-col">
      <div className={`h-1.5 ${topColor} `} />
      <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted  p-5 space-y-4 flex-1 flex flex-col">
        <div className="flex items-start gap-4">
          <img
            src={team.image}
            alt={team.name}
            className="w-14 h-14 object-contain  bg-surface p-1 border-2 border-white/80"
          />
          <div className="flex-1 min-w-0">
            <Link
              to={`/team/${team.slug}`}
              className="font-heading text-2xl text-text hover:text-accent transition-colors truncate block leading-none tracking-[0.08em] underline decoration-text-muted/30 underline-offset-2"
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
            label="Trueshot Rank"
            value={elo ? formatTrueshotRank(elo, getLeagueLabel(team.leagueSlug)) : '—'}
            color="cream"
            roundLeft
          />
          <StatBlock
            label="Trueshot Elo"
            value={elo ? String(elo.elo) : '—'}
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
          <div className="mt-auto">
            <span className="text-[0.6875rem] font-semibold tracking-[0.2em] text-text-muted block mb-2">
              Roster
            </span>
            <div className="grid grid-cols-5 gap-[3px]">
              {starters.map((player) => (
                <Link
                  key={player.id}
                  to={`/player/${player.id}`}
                  state={{ image: player.image, teamSlug: team.slug, teamName: team.name }}
                  className="overflow-hidden group"
                >
                  <div className="h-1 bg-surface-muted group-hover:bg-accent transition-colors" />
                  <div className="bg-surface border border-t-0 border-surface-muted">
                    <div className="aspect-[3/4] bg-surface-muted">
                      <img
                        src={player.image}
                        alt={player.summonerName}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div className="px-2 py-1.5 text-center">
                      <p className="font-semibold text-xs truncate tracking-[0.1em] group-hover:text-accent transition-colors">
                        {player.summonerName}
                      </p>
                      <p className="text-[0.5625rem] font-medium text-text-muted tracking-[0.2em] mt-0.5">
                        {player.role}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
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
  value: React.ReactNode
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
    roundLeft ? '' : '',
    roundRight ? '' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`bg-surface border-t-2 ${borderColor} ${radius} py-2.5 px-3 text-center flex flex-col`}>
      <p className={`${textColor} font-heading text-xl leading-tight tracking-wider min-h-[2.5rem] flex items-center justify-center flex-wrap flex-1`}>{value}</p>
      <p className="text-text-muted text-[0.625rem] font-medium tracking-[0.15em] mt-1">{label}</p>
    </div>
  )
}
