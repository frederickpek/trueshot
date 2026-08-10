import { useParams, Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTeamDetails, useTeamsIndex } from '../hooks/useTeamData'
import { RADAR_AXES, getBoundsForRole, type PercentilesData, type RadarKey } from '../lib/radar-bounds'

interface RawChampionStats {
  id: string
  games: number
  wins: number
  kills: number
  deaths: number
  assists: number
  cs: number
  gold: number
}

interface RawPlayerData {
  playerId: string
  name: string
  role: string
  games: number
  wins: number
  kills: number
  deaths: number
  assists: number
  cs: number
  gold: number
  champions: Record<string, RawChampionStats>
}

interface ComputedStats {
  name: string
  role: string
  games: number
  wins: number
  winRate: number
  kda: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgCs: number
  avgGold: number
  champions: ChampionDisplay[]
}

interface ChampionDisplay {
  name: string
  games: number
  wins: number
  winRate: number
  kda: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgCs: number
  avgGold: number
}

function computeStats(raw: RawPlayerData): ComputedStats {
  const g = raw.games || 1
  const avgKills = raw.kills / g
  const avgDeaths = raw.deaths / g
  const avgAssists = raw.assists / g
  const kda = raw.deaths === 0 ? avgKills + avgAssists : (raw.kills + raw.assists) / raw.deaths

  const champions: ChampionDisplay[] = Object.entries(raw.champions)
    .map(([name, c]) => {
      const cg = c.games || 1
      const cDeaths = c.deaths || 1
      return {
        name,
        games: c.games,
        wins: c.wins,
        winRate: Math.round((c.wins / cg) * 100),
        kda: +((c.kills + c.assists) / cDeaths).toFixed(2),
        avgKills: +(c.kills / cg).toFixed(1),
        avgDeaths: +(c.deaths / cg).toFixed(1),
        avgAssists: +(c.assists / cg).toFixed(1),
        avgCs: Math.round(c.cs / cg),
        avgGold: Math.round(c.gold / cg),
      }
    })
    .sort((a, b) => b.games - a.games)

  return {
    name: raw.name,
    role: raw.role,
    games: raw.games,
    wins: raw.wins,
    winRate: Math.round((raw.wins / g) * 100 * 10) / 10,
    kda,
    avgKills: +avgKills.toFixed(1),
    avgDeaths: +avgDeaths.toFixed(1),
    avgAssists: +avgAssists.toFixed(1),
    avgCs: Math.round(raw.cs / g),
    avgGold: Math.round(raw.gold / g),
    champions,
  }
}

const AXIS_COUNT = RADAR_AXES.length
const CHART_SIZE = 340
const CX = CHART_SIZE / 2
const CY = CHART_SIZE / 2
const CHART_R = 92
const LABEL_R = 134

const CHAMP_KEY_OVERRIDES: Record<string, string> = {
  'Wukong': 'MonkeyKing',
  'Nunu & Willump': 'Nunu',
  'Renata Glasc': 'Renata',
}

function champIconUrl(name: string): string {
  const key = CHAMP_KEY_OVERRIDES[name] ?? name.replace(/['\s]/g, '')
  return `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${key}.png`
}

function normalizeRole(role: string): string {
  const r = role.toLowerCase()
  if (r === 'adc' || r === 'bot' || r === 'bottom') return 'bot'
  if (r === 'sup') return 'support'
  if (r === 'jng' || r === 'jg') return 'jungle'
  return r
}

function normalizeRaw(value: number, [min, max]: [number, number]): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

function normalize(value: number, bounds: [number, number]): number {
  return Math.max(0.08, normalizeRaw(value, bounds))
}

function computeOverallScore(stats: ComputedStats, percentiles: PercentilesData | null): number {
  const role = normalizeRole(stats.role)
  const bounds = getBoundsForRole(role, percentiles)
  const values: Record<RadarKey, number> = {
    kda: stats.kda,
    cs: stats.avgCs,
    gold: stats.avgGold,
    kills: stats.avgKills,
    wr: stats.winRate,
  }
  const sum = RADAR_AXES.reduce((acc, a) => acc + normalizeRaw(values[a.key], bounds[a.key]), 0)
  return Math.round(sum * 20)
}

function polar(i: number, r: number): [number, number] {
  const angle = (i * 2 * Math.PI) / AXIS_COUNT
  return [CX + r * Math.sin(angle), CY - r * Math.cos(angle)]
}

function polyPoints(r: number): string {
  return Array.from({ length: AXIS_COUNT }, (_, i) => polar(i, r).join(',')).join(' ')
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function RadarChart({
  stats,
  percentiles,
}: {
  stats: ComputedStats
  percentiles: PercentilesData | null
}) {
  const role = normalizeRole(stats.role)
  const bounds = getBoundsForRole(role, percentiles)

  const radarValues: Record<RadarKey, number> = {
    kda: stats.kda,
    cs: stats.avgCs,
    gold: stats.avgGold,
    kills: stats.avgKills,
    wr: stats.winRate,
  }
  const rawLabels: Record<RadarKey, string> = {
    kda: stats.kda.toFixed(1),
    cs: String(stats.avgCs),
    gold: formatNum(stats.avgGold),
    kills: String(stats.avgKills),
    wr: `${stats.winRate}%`,
  }

  const values = RADAR_AXES.map((a) => normalize(radarValues[a.key], bounds[a.key]))
  const labels = RADAR_AXES.map((a) => rawLabels[a.key])

  const dataPoints = values.map((v, i) => polar(i, CHART_R * v))
  const dataPath = dataPoints.map((p) => p.join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`} className="w-full max-w-[300px]">
      <defs>
        <filter id="radar-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {[0.25, 0.5, 0.75, 1].map((level) => (
        <polygon
          key={level}
          points={polyPoints(CHART_R * level)}
          fill="none"
          stroke="#2D3843"
          strokeWidth={level === 1 ? 1.5 : 0.5}
        />
      ))}

      {Array.from({ length: AXIS_COUNT }, (_, i) => {
        const [x, y] = polar(i, CHART_R)
        return (
          <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#2D3843" strokeWidth={0.5} />
        )
      })}

      <polygon
        points={dataPath}
        fill="rgba(255, 70, 85, 0.15)"
        stroke="#FF4655"
        strokeWidth={2}
        filter="url(#radar-glow)"
      />

      {RADAR_AXES.map((axis, i) => {
        const [x, y] = polar(i, LABEL_R)
        return (
          <g key={axis.key}>
            <text
              x={x}
              y={y - 7}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#8B9DA8"
              fontSize="0.75rem"
              fontWeight={600}
              letterSpacing="0.12em"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}
            >
              {axis.label}
            </text>
            <text
              x={x}
              y={y + 7}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ECE8E1"
              fontSize="1rem"
              fontWeight={700}
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {labels[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

async function loadPlayerData(id: string): Promise<RawPlayerData | null> {
  const url = `${import.meta.env.BASE_URL}data/players/${id}.json`
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

async function loadPercentiles(): Promise<PercentilesData | null> {
  const url = `${import.meta.env.BASE_URL}data/player-percentiles.json`
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

export function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navState = location.state as {
    image?: string
    teamSlug?: string
    teamName?: string
  } | null

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['player-data', id],
    queryFn: () => loadPlayerData(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 30,
  })

  const { data: percentiles } = useQuery({
    queryKey: ['player-percentiles'],
    queryFn: loadPercentiles,
    staleTime: 1000 * 60 * 60,
  })

  const stats = rawData ? computeStats(rawData) : null

  const index = useTeamsIndex()
  const teamName = navState?.teamName ?? (stats ? stats.name.split(' ')[0] : undefined)
  const teamEntry = teamName
    ? index.data?.teams.find(
        (t) =>
          t.name.toLowerCase() === teamName.toLowerCase() ||
          t.code.toLowerCase() === teamName.toLowerCase(),
      )
    : undefined
  const teamSlug = navState?.teamSlug ?? teamEntry?.slug
  const teamDetails = useTeamDetails(navState?.image ? undefined : teamSlug)
  const playerImage = navState?.image ?? teamDetails.data?.players?.find(
    (p) => p.id === id,
  )?.image

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted tracking-[0.3em] text-xs">
        Loading player data&hellip;
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-text-muted tracking-[0.15em]">Player not found.</p>
        <Link to="/" className="text-accent hover:text-teal transition-colors text-sm tracking-[0.15em]">
          Back to compare
        </Link>
      </div>
    )
  }

  const displayRole = normalizeRole(stats.role)
    .replace(/^\w/, (c) => c.toUpperCase())
  const overallScore = computeOverallScore(stats, percentiles ?? null)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-5">
        {playerImage && (
          <div className="w-24 bg-surface-elevated border-2 border-white/80 overflow-hidden shrink-0">
            <div className="aspect-[3/4] bg-surface-muted">
              <img
                src={playerImage}
                alt={stats.name}
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        )}
        <div>
          <h2 className="font-heading text-5xl text-text leading-none tracking-[0.1em]">
            {stats.name}
          </h2>
          <p className="text-text-muted mt-2 text-xs font-medium tracking-[0.2em]">
            {teamSlug ? (
              <Link to={`/team/${teamSlug}`} className="hover:text-accent transition-colors">
                {teamName}
              </Link>
            ) : (
              teamName ?? '—'
            )}
            {' · '}
            {displayRole} · {stats.games} games
          </p>
          <div className="flex gap-[3px] mt-3">
            <span className="bg-surface-elevated border-t-2 border-accent px-3 py-2 flex items-baseline gap-2">
              <span className="text-accent font-heading text-xl leading-none">
                {stats.kda.toFixed(1)}
              </span>
              <span className="text-text-muted text-[0.625rem] tracking-[0.2em]">KDA</span>
            </span>
            <span className="bg-surface-elevated border-t-2 border-teal px-3 py-2 flex items-baseline gap-2">
              <span className="text-teal font-heading text-xl leading-none">
                {stats.winRate}%
              </span>
              <span className="text-text-muted text-[0.625rem] tracking-[0.2em]">WIN RATE</span>
            </span>
            <span className="bg-surface-elevated border-t-2 border-text px-3 py-2 flex items-baseline gap-2">
              <span className="text-text font-heading text-xl leading-none">
                {stats.avgKills}/{stats.avgDeaths}/{stats.avgAssists}
              </span>
              <span className="text-text-muted text-[0.625rem] tracking-[0.2em]">AVG</span>
            </span>
          </div>
        </div>
      </div>

      {/* Performance — Radar + Stats */}
      <section>
        <div className="h-1.5 bg-accent" />
        <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted p-5">
          <span className="font-heading text-2xl text-text tracking-[0.1em]">Performance — {overallScore}</span>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div className="flex items-center justify-center">
              <RadarChart stats={stats} percentiles={percentiles ?? null} />
            </div>
            <div className="space-y-1">
              <StatRow label="AVG KILLS" value={String(stats.avgKills)} />
              <StatRow label="AVG DEATHS" value={String(stats.avgDeaths)} />
              <StatRow label="AVG ASSISTS" value={String(stats.avgAssists)} />
              <StatRow label="AVG CS" value={String(stats.avgCs)} />
              <StatRow label="AVG GOLD" value={formatNum(stats.avgGold)} />
              <StatRow label="KDA RATIO" value={stats.kda.toFixed(2)} />
              <StatRow label="WIN RATE" value={`${stats.winRate}%`} />
            </div>
          </div>
        </div>
      </section>

      {/* Champion Pool */}
      <section>
        <div className="h-1.5 bg-teal" />
        <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-muted">
            <span className="font-heading text-xl text-text tracking-[0.1em]">
              Champion Pool
            </span>
          </div>
          {stats.champions.length > 0 ? (
            <>
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_1.5fr_1fr_1fr] gap-x-2 px-5 py-1.5 items-center text-[0.625rem] font-semibold text-text-muted tracking-[0.2em] border-b border-surface-muted">
                <span>CHAMPION</span>
                <span className="text-center">GAMES</span>
                <span className="text-center">W/L</span>
                <span className="text-center">WR%</span>
                <span className="text-center">KDA</span>
                <span className="text-center">K / D / A</span>
                <span className="text-center">AVG CS</span>
                <span className="text-center">AVG GOLD</span>
              </div>
              <ul className="divide-y divide-surface-muted">
                {stats.champions.map((champ) => (
                  <li
                    key={champ.name}
                    className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_1.5fr_1fr_1fr] gap-x-2 items-center px-5 py-2 hover:bg-surface-muted/20 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={champIconUrl(champ.name)}
                        alt=""
                        className="w-7 h-7 rounded-sm shrink-0"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <span className="text-xs font-semibold tracking-[0.08em] truncate">
                        {champ.name}
                      </span>
                    </span>
                    <span className="text-center text-xs text-text-muted">
                      {champ.games}
                    </span>
                    <span className="text-center text-xs text-text-muted">
                      {champ.wins}/{champ.games - champ.wins}
                    </span>
                    <span className="relative flex h-6 overflow-hidden mx-2">
                      <span
                        style={{ width: `${champ.winRate}%`, backgroundColor: '#2D8B5E' }}
                      />
                      <span
                        style={{ width: `${100 - champ.winRate}%`, backgroundColor: '#8B3040' }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[0.6875rem] font-medium text-white">
                        {champ.winRate}%
                      </span>
                    </span>
                    <span className="text-center text-xs font-semibold text-text">
                      {champ.kda.toFixed(2)}
                    </span>
                    <span className="text-center text-xs tracking-[0.05em]">
                      <span className="text-teal">{champ.avgKills}</span>
                      <span className="text-text-muted"> / </span>
                      <span className="text-accent">{champ.avgDeaths}</span>
                      <span className="text-text-muted"> / </span>
                      <span className="text-text">{champ.avgAssists}</span>
                    </span>
                    <span className="text-center text-xs text-text-muted">
                      {champ.avgCs}
                    </span>
                    <span className="text-center text-xs text-text-muted">
                      {formatNum(champ.avgGold)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-text-muted tracking-[0.1em] px-5 py-4">No champion data.</p>
          )}
        </div>
      </section>

      <p className="text-[0.6875rem] font-medium text-text-muted text-right tracking-[0.2em]">
        {stats.games} games tracked
      </p>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 bg-surface/50 border-l-2 border-surface-muted hover:border-accent transition-colors">
      <span className="text-xs text-text-muted tracking-[0.2em]">{label}</span>
      <span className="text-text font-heading text-xl leading-none">{value}</span>
    </div>
  )
}
