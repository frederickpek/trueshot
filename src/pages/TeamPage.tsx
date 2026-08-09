import { Link, useParams, useNavigate } from 'react-router-dom'
import { MatchHistoryList } from '../components/MatchHistoryList'
import {
  useTeamDetails,
  useTeamGpr,
  useTeamSchedule,
  useTeamStandings,
  useTeamsIndex,
} from '../hooks/useTeamData'
import { getLeagueLabel } from '../lib/leagues'
import { formatGprRank, formatPowerScore } from '../lib/gpr-utils'
import { computeRecord, filterCompletedEvents, filterUpcomingEvents, formatRecordWithWinRate } from '../lib/match-utils'
import { pickStarterRoster } from '../lib/roster'

export function TeamPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const index = useTeamsIndex()
  const teamMeta = index.data?.teams.find((t) => t.slug === slug)
  const details = useTeamDetails(slug)
  const gpr = useTeamGpr(slug)
  const standings = useTeamStandings(teamMeta)
  const { events } = useTeamSchedule(teamMeta)

  const upcoming = filterUpcomingEvents(events)
  const completed = filterCompletedEvents(events)
  const record = teamMeta ? computeRecord(events, teamMeta) : undefined
  const standingRecord = standings.data?.team.record
  const standingLabel = standings.data?.label
  const roster = details.data?.players ? pickStarterRoster(details.data.players) : []

  if (index.isLoading) {
    return (
      <p className="text-text-muted py-12 text-center tracking-[0.3em] text-xs">Loading…</p>
    )
  }

  if (!teamMeta) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-text-muted tracking-[0.15em]">Team not found.</p>
        <Link to="/" className="text-accent hover:text-teal transition-colors text-sm tracking-[0.15em]">
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
            className="w-20 h-20 object-contain  bg-surface-elevated p-2 border-2 border-white/80"
          />
          <div>
            <h2 className="font-heading text-5xl text-text leading-none tracking-[0.1em]">
              {teamMeta.name}
            </h2>
            <p className="text-text-muted mt-2 text-xs font-medium tracking-[0.2em]">
              {getLeagueLabel(teamMeta.leagueSlug)} · {teamMeta.region}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/?teamA=${teamMeta.slug}`)}
          className=" bg-surface-muted border-2 border-accent/40 text-accent px-5 py-2 text-xs tracking-[0.2em] hover:bg-accent hover:text-white transition-colors"
        >
          Compare with another team
        </button>
      </div>

      <div className="flex gap-[3px]">
        <StatPill
          label="GPR Rank"
          value={
            gpr.entry
              ? formatGprRank(gpr.entry, getLeagueLabel(teamMeta.leagueSlug))
              : '—'
          }
          borderColor="border-text"
          textColor="text-text"
          roundLeft
        />
        <StatPill
          label="Power Score"
          value={gpr.entry ? formatPowerScore(gpr.entry) : '—'}
          borderColor="border-accent"
          textColor="text-accent"
        />
        <StatPill
          label={standingLabel ?? 'Official standings'}
          value={
            standingRecord
              ? `${standingRecord.wins}W ${standingRecord.losses}L`
              : standings.isLoading
                ? '…'
                : '—'
          }
          borderColor="border-text"
          textColor="text-text"
        />
        <StatPill
          label="Recent Win Rate"
          value={record ? formatRecordWithWinRate(record) ?? '—' : '—'}
          borderColor="border-teal"
          textColor="text-teal"
          roundRight
        />
      </div>

      {roster.length > 0 && (
        <section>
          <div className="h-1.5 bg-text " />
          <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted  p-5">
            <span className="font-heading text-xl text-text tracking-[0.1em]">Roster</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[3px] mt-4">
              {roster.map((player) => (
                <Link
                  key={player.id}
                  to={`/player/${encodeURIComponent(player.summonerName)}`}
                  state={{ image: player.image, teamSlug: slug, teamName: teamMeta.name }}
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
                    <div className="px-3 py-2 text-center">
                      <p className="font-semibold text-sm truncate tracking-[0.1em] group-hover:text-accent transition-colors">
                        {player.summonerName}
                      </p>
                      <p className="text-[0.625rem] font-medium text-text-muted tracking-[0.2em] mt-0.5">
                        {player.role}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {teamMeta && (
        <MatchHistoryList events={upcoming} team={teamMeta} title="Upcoming" showTeamName={false} upcoming />
      )}

      {teamMeta && (
        <MatchHistoryList events={completed} team={teamMeta} title="Match History" showTeamName={false} />
      )}

      {gpr.data && (
        <p className="text-[0.6875rem] font-medium text-text-muted text-right tracking-[0.2em]">
          GPR updated {new Date(gpr.data.updatedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

function StatPill({
  label,
  value,
  borderColor,
  textColor,
  roundLeft,
  roundRight,
}: {
  label: string
  value: string
  borderColor: string
  textColor: string
  roundLeft?: boolean
  roundRight?: boolean
}) {
  const radius = [
    roundLeft ? '' : '',
    roundRight ? '' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`bg-surface-elevated border-t-2 ${borderColor} ${radius} flex-1 py-3 px-3 text-center min-w-0`}>
      <p className={`${textColor} font-heading text-2xl leading-none tracking-wider truncate`}>
        {value}
      </p>
      <p className="text-text-muted text-[0.625rem] font-medium tracking-[0.2em] mt-1 truncate">{label}</p>
    </div>
  )
}
