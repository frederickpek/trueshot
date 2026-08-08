import { Link, useParams, useNavigate } from 'react-router-dom'
import { MatchHistoryList } from '../components/MatchHistoryList'
import {
  useLeagueSchedule,
  useTeamDetails,
  useTeamGpr,
  useTeamStandings,
  useTeamsIndex,
} from '../hooks/useTeamData'
import { getLeagueLabel } from '../lib/leagues'
import { formatGprRank, formatPowerScore } from '../lib/gpr-utils'
import { computeRecord, filterEventsForTeam, formatRecordWithWinRate } from '../lib/match-utils'
import { pickStarterRoster } from '../lib/roster'

export function TeamPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const index = useTeamsIndex()
  const teamMeta = index.data?.teams.find((t) => t.slug === slug)
  const details = useTeamDetails(slug)
  const gpr = useTeamGpr(slug)
  const standings = useTeamStandings(teamMeta)
  const schedule = useLeagueSchedule(teamMeta?.leagueId, teamMeta?.leagueSlug)

  const events = teamMeta && schedule.data
    ? filterEventsForTeam(schedule.data, teamMeta)
    : []

  const record = teamMeta ? computeRecord(events, teamMeta) : undefined
  const standingRecord = standings.data?.team.record
  const standingLabel = standings.data?.label

  const roster = details.data?.players ? pickStarterRoster(details.data.players) : []

  if (index.isLoading) {
    return <p className="text-text-muted py-12 text-center">Loading…</p>
  }

  if (!teamMeta) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-text-muted">Team not found.</p>
        <Link to="/" className="text-accent hover:underline text-sm">
          Back to compare
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-5">
          <img
            src={teamMeta.image}
            alt={teamMeta.name}
            className="w-20 h-20 object-contain rounded-xl bg-surface-elevated p-2 border border-surface-muted"
          />
          <div>
            <h2 className="text-3xl font-bold">{teamMeta.name}</h2>
            <p className="text-text-muted mt-1">
              {getLeagueLabel(teamMeta.leagueSlug)} · {teamMeta.region}
            </p>
            {gpr.entry && (
              <p className="text-sm mt-2">
                <span className="text-accent font-semibold">
                  {formatGprRank(gpr.entry, getLeagueLabel(teamMeta.leagueSlug))}
                </span>
                <span className="text-text-muted ml-2">{formatPowerScore(gpr.entry)}</span>
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/?teamA=${teamMeta.slug}`)}
          className="rounded-lg border border-accent/40 text-accent px-4 py-2 text-sm hover:bg-accent/10 transition-colors"
        >
          Compare with another team
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          label="Recent Win Rate"
          value={record ? formatRecordWithWinRate(record) ?? '—' : '—'}
        />
        <StatCard
          label={standingLabel ?? 'Official standings'}
          value={
            standingRecord
              ? `${standingRecord.wins}W ${standingRecord.losses}L`
              : standings.isLoading
                ? '…'
                : '—'
          }
        />
        <StatCard
          label="GPR Rank"
          value={
            gpr.entry
              ? formatGprRank(gpr.entry, getLeagueLabel(teamMeta.leagueSlug))
              : '—'
          }
        />
        <StatCard
          label="Power Score"
          value={gpr.entry ? formatPowerScore(gpr.entry) : '—'}
        />
      </div>

      {roster.length > 0 && (
        <section className="rounded-xl border border-surface-muted bg-surface-elevated p-5">
          <h3 className="font-medium mb-4">Roster</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {roster.map((player) => (
              <div
                key={player.id}
                className="flex flex-col rounded-lg bg-surface border border-surface-muted overflow-hidden"
              >
                <div className="aspect-[3/4] bg-surface-muted">
                  <img
                    src={player.image}
                    alt={player.summonerName}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="px-3 py-3 text-center">
                  <p className="font-medium text-sm truncate">{player.summonerName}</p>
                  <p className="text-xs text-text-muted capitalize mt-0.5">{player.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {teamMeta && (
        <MatchHistoryList events={events} team={teamMeta} title="Match History" />
      )}

      {gpr.data && (
        <p className="text-xs text-text-muted text-right">
          GPR updated {new Date(gpr.data.updatedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-muted bg-surface-elevated p-4 text-center">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  )
}
