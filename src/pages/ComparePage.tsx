import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HeadToHeadTable } from '../components/HeadToHeadTable'
import { MatchHistoryList } from '../components/MatchHistoryList'
import { TeamCompareCard } from '../components/TeamCompareCard'
import { TeamSelector } from '../components/TeamSelector'
import {
  useInternationalSchedules,
  useLeagueSchedule,
  useTeamDetails,
  useTeamElos,
  useTeamsIndex,
} from '../hooks/useTeamData'
import { TIER1_LEAGUE_SLUGS } from '../lib/leagues'
import {
  computeRecord,
  filterCompletedEvents,
  filterEventsForTeam,
  getHeadToHead,
} from '../lib/match-utils'

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const index = useTeamsIndex()
  const elos = useTeamElos()

  const [leagueA, setLeagueA] = useState('lck')
  const [leagueB, setLeagueB] = useState('lck')
  const paramA = searchParams.get('teamA') ?? 't1'
  const paramB = searchParams.get('teamB') ?? 'hanwha-life-esports'
  const sameTeam = paramA && paramB && paramA === paramB
  const [teamSlugA, setTeamSlugA] = useState(sameTeam ? 't1' : paramA)
  const [teamSlugB, setTeamSlugB] = useState(sameTeam ? 'hanwha-life-esports' : paramB)

  const teams = index.data?.teams ?? []

  const teamA = useMemo(
    () => teams.find((t) => t.slug === teamSlugA),
    [teams, teamSlugA],
  )
  const teamB = useMemo(
    () => teams.find((t) => t.slug === teamSlugB),
    [teams, teamSlugB],
  )

  const scheduleA = useLeagueSchedule(teamA?.leagueId, teamA?.leagueSlug)
  const scheduleB = useLeagueSchedule(teamB?.leagueId, teamB?.leagueSlug)
  const intlResults = useInternationalSchedules()
  const detailsA = useTeamDetails(teamSlugA || undefined)
  const detailsB = useTeamDetails(teamSlugB || undefined)

  useEffect(() => {
    if (teamA) setLeagueA(teamA.leagueSlug)
  }, [teamA])

  useEffect(() => {
    if (teamB) setLeagueB(teamB.leagueSlug)
  }, [teamB])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (teamSlugA) params.teamA = teamSlugA
    if (teamSlugB) params.teamB = teamSlugB
    setSearchParams(params, { replace: true })
  }, [teamSlugA, teamSlugB, setSearchParams])

  const intlEvents = useMemo(
    () => intlResults.flatMap((q) => q.data ?? []),
    [intlResults],
  )

  const combinedSchedule = useMemo(() => {
    const all = [...(scheduleA.data ?? []), ...(scheduleB.data ?? []), ...intlEvents]
    const seen = new Set<string>()
    return all.filter((e) => {
      if (seen.has(e.match.id)) return false
      seen.add(e.match.id)
      return true
    })
  }, [scheduleA.data, scheduleB.data, intlEvents])

  const recentA = teamA
    ? filterCompletedEvents(filterEventsForTeam(combinedSchedule, teamA)).slice(0, 10)
    : []
  const recentB = teamB
    ? filterCompletedEvents(filterEventsForTeam(combinedSchedule, teamB)).slice(0, 10)
    : []
  const h2h =
    teamA && teamB
      ? filterCompletedEvents(getHeadToHead(combinedSchedule, teamA, teamB))
      : []

  const recordA = teamA ? computeRecord(recentA, teamA) : undefined
  const recordB = teamB ? computeRecord(recentB, teamB) : undefined

  const eloA = teamA ? elos.ranked.get(teamA.code) : undefined
  const eloB = teamB ? elos.ranked.get(teamB.code) : undefined

  const handleLeagueA = (slug: string) => {
    setLeagueA(slug)
    setTeamSlugA('')
  }

  const handleLeagueB = (slug: string) => {
    setLeagueB(slug)
    setTeamSlugB('')
  }

  if (index.isLoading) {
    return <LoadingState message="Loading teams…" />
  }

  if (index.isError) {
    return (
      <ErrorState message="Failed to load team data. Run npm run sync-data to generate cached data." />
    )
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-heading text-4xl text-accent tracking-[0.1em] leading-none">
          Compare Teams
        </h2>
        <p className="text-text-muted text-xs tracking-[0.15em] mt-2 mb-6">
          Pick two teams from major regions to compare stats, recent form, and head-to-head history.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <TeamSelector
            label="Team A"
            leagueSlug={leagueA}
            teamSlug={teamSlugA}
            leagues={[...TIER1_LEAGUE_SLUGS]}
            teams={teams}
            onLeagueChange={handleLeagueA}
            onTeamChange={setTeamSlugA}
            side="left"
            excludeSlug={teamSlugB}
          />
          <TeamSelector
            label="Team B"
            leagueSlug={leagueB}
            teamSlug={teamSlugB}
            leagues={[...TIER1_LEAGUE_SLUGS]}
            teams={teams}
            onLeagueChange={handleLeagueB}
            onTeamChange={setTeamSlugB}
            excludeSlug={teamSlugA}
          />
        </div>
      </section>

      {teamA && teamB && (
        <>
          <section className="grid md:grid-cols-2 gap-6">
            <TeamCompareCard
              team={teamA}
              elo={eloA}
              record={recordA}
              roster={detailsA.data?.players}
              loading={detailsA.isLoading || scheduleA.isLoading}
              side="left"
            />
            <TeamCompareCard
              team={teamB}
              elo={eloB}
              record={recordB}
              roster={detailsB.data?.players}
              loading={detailsB.isLoading || scheduleB.isLoading}
              side="right"
            />
          </section>

          <HeadToHeadTable events={h2h} teamA={teamA} teamB={teamB} />

          <section className="grid md:grid-cols-2 gap-6">
            <MatchHistoryList
              events={recentA}
              team={teamA}
            />
            <MatchHistoryList
              events={recentB}
              team={teamB}
            />
          </section>
        </>
      )}

      {(!teamSlugA || !teamSlugB) && (
        <div className=" border-2 border-dashed border-surface-muted p-12 text-center text-text-muted tracking-[0.15em] text-sm">
          Select two teams above to see comparison stats.
        </div>
      )}
    </div>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-24 text-text-muted tracking-[0.3em] text-xs">
      {message}
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className=" border-2 border-danger/30 bg-danger/5 p-6 text-danger text-sm tracking-[0.1em]">
      {message}
    </div>
  )
}
