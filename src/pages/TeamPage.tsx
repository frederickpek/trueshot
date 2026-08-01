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
import { computeRecord, filterEventsForTeam } from '../lib/match-utils'

const ROLE_ORDER = ['top', 'jungle', 'mid', 'bottom', 'support']

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
    ? filterEventsForTeam(schedule.data, teamMeta).slice(0, 15)
    : []

  const record = teamMeta ? computeRecord(events, teamMeta) : undefined
  const standingRecord = standings.data?.record

  const roster = details.data?.players
    ? [...details.data.players]
        .filter((p) => ROLE_ORDER.includes(p.role))
        .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
        .slice(0, 5)
    : []

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
                <span className="text-accent font-semibold">#{gpr.entry.rank}</span>
                <span className="text-text-muted ml-2">GPR · {gpr.entry.gprScore} pts</span>
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
          label="Recent Record"
          value={record ? `${record.wins}W ${record.losses}L` : '—'}
        />
        <StatCard
          label="Split Standings"
          value={
            standingRecord
              ? `${standingRecord.wins}W ${standingRecord.losses}L`
              : standings.isLoading
                ? '…'
                : '—'
          }
        />
        <StatCard
          label="Power Score"
          value={gpr.entry ? `${gpr.entry.gprScore} pts` : '—'}
        />
      </div>

      {roster.length > 0 && (
        <section className="rounded-xl border border-surface-muted bg-surface-elevated p-5">
          <h3 className="font-medium mb-4">Roster</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {roster.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-lg bg-surface p-3"
              >
                <img
                  src={player.image}
                  alt={player.summonerName}
                  className="w-10 h-10 rounded-full object-cover bg-surface-muted"
                />
                <div>
                  <p className="font-medium text-sm">{player.summonerName}</p>
                  <p className="text-xs text-text-muted capitalize">{player.role}</p>
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
