import { useParams, Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTeamsIndex } from '../hooks/useTeamData'
import { RADAR_AXES, getBoundsForRole } from '../lib/radar-bounds'

export interface PlayerGameStats {
  champion: string
  kills: number
  deaths: number
  assists: number
  cs: number
  gold: number
  damage: number
  vision: number
  win: boolean
  date: string
}

export interface ChampionStats {
  name: string
  games: number
  wins: number
  winRate: number
  avgKda: number
}

export interface PlayerAggregateStats {
  name: string
  team: string
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
  avgDamage: number
  avgVision: number
  champions: ChampionStats[]
  recentGames: PlayerGameStats[]
}

const CHART_SIZE = 300
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
  if (r === 'adc' || r === 'bot' || r === 'bottom') return 'Bot'
  if (r === 'sup' || r === 'support') return 'Support'
  if (r === 'jng' || r === 'jungle' || r === 'jg') return 'Jungle'
  if (r === 'mid' || r === 'middle') return 'Mid'
  if (r === 'top') return 'Top'
  return role
}

function normalize(value: number, [min, max]: [number, number]): number {
  return Math.max(0.08, Math.min(1, (value - min) / (max - min)))
}

function polar(i: number, r: number): [number, number] {
  const angle = (i * 2 * Math.PI) / 6
  return [CX + r * Math.sin(angle), CY - r * Math.cos(angle)]
}

function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => polar(i, r).join(',')).join(' ')
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function RadarChart({ stats }: { stats: PlayerAggregateStats }) {
  const role = normalizeRole(stats.role)
  const bounds = getBoundsForRole(role)
  const values = [
    normalize(stats.kda, bounds.kda),
    normalize(stats.avgCs, bounds.cs),
    normalize(stats.avgDamage, bounds.dmg),
    normalize(stats.avgGold, bounds.gold),
    normalize(stats.avgVision, bounds.vision),
    normalize(stats.winRate, bounds.wr),
  ]
  const rawValues = [
    stats.kda.toFixed(1),
    String(stats.avgCs),
    formatNum(stats.avgDamage),
    formatNum(stats.avgGold),
    String(stats.avgVision),
    `${stats.winRate}%`,
  ]

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
          points={hexPoints(CHART_R * level)}
          fill="none"
          stroke="#2D3843"
          strokeWidth={level === 1 ? 1.5 : 0.5}
        />
      ))}

      {Array.from({ length: 6 }, (_, i) => {
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
              {rawValues[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

async function loadPlayerStats(name: string): Promise<PlayerAggregateStats | null> {
  const url = `${import.meta.env.BASE_URL}data/players/${encodeURIComponent(name.toLowerCase())}.json`
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

export function PlayerPage() {
  const { name } = useParams<{ name: string }>()
  const location = useLocation()
  const navState = location.state as {
    image?: string
    teamSlug?: string
    teamName?: string
  } | null

  const playerName = decodeURIComponent(name ?? '')

  const {
    data: stats,
    isLoading,
  } = useQuery({
    queryKey: ['player-stats', playerName],
    queryFn: () => loadPlayerStats(playerName),
    enabled: Boolean(playerName),
    staleTime: 1000 * 60 * 30,
  })

  const EMPTY_STATS: PlayerAggregateStats = {
    name: playerName,
    team: navState?.teamName ?? '—',
    role: '—',
    games: 0,
    wins: 0,
    winRate: 0,
    kda: 0,
    avgKills: 0,
    avgDeaths: 0,
    avgAssists: 0,
    avgCs: 0,
    avgGold: 0,
    avgDamage: 0,
    avgVision: 0,
    champions: [],
    recentGames: [],
  }

  const hasData = Boolean(stats)
  const display = stats ?? EMPTY_STATS

  const index = useTeamsIndex()
  const teamEntry = display.team !== '—'
    ? index.data?.teams.find(
        (t) =>
          t.name.toLowerCase() === display.team.toLowerCase() ||
          t.code.toLowerCase() === display.team.toLowerCase(),
      )
    : undefined
  const teamSlug = navState?.teamSlug ?? teamEntry?.slug

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted tracking-[0.3em] text-xs">
        Loading player data&hellip;
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {!hasData && (
        <div className="bg-accent/10 border border-accent/30 px-4 py-3 text-xs text-text-muted tracking-[0.15em]">
          Player stats not available — no cached data found. Showing empty layout.
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start gap-5">
        {navState?.image && (
          <div className="w-24 bg-surface-elevated border-2 border-white/80 overflow-hidden shrink-0">
            <div className="aspect-[3/4] bg-surface-muted">
              <img
                src={navState.image}
                alt={playerName}
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        )}
        <div>
          <h2 className="font-heading text-5xl text-text leading-none tracking-[0.1em]">
            {display.name}
          </h2>
          <p className="text-text-muted mt-2 text-xs font-medium tracking-[0.2em]">
            {teamSlug ? (
              <Link to={`/team/${teamSlug}`} className="hover:text-accent transition-colors">
                {display.team}
              </Link>
            ) : (
              display.team
            )}
            {' · '}
            {display.role} · {display.games} games
          </p>
          <div className="flex gap-[3px] mt-3">
            <span className="bg-surface-elevated border-t-2 border-accent px-3 py-2 flex items-baseline gap-2">
              <span className="text-accent font-heading text-xl leading-none">
                {display.kda.toFixed(1)}
              </span>
              <span className="text-text-muted text-[0.625rem] tracking-[0.2em]">KDA</span>
            </span>
            <span className="bg-surface-elevated border-t-2 border-teal px-3 py-2 flex items-baseline gap-2">
              <span className="text-teal font-heading text-xl leading-none">
                {display.winRate}%
              </span>
              <span className="text-text-muted text-[0.625rem] tracking-[0.2em]">WIN RATE</span>
            </span>
            <span className="bg-surface-elevated border-t-2 border-text px-3 py-2 flex items-baseline gap-2">
              <span className="text-text font-heading text-xl leading-none">
                {display.avgKills}/{display.avgDeaths}/{display.avgAssists}
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
          <span className="font-heading text-2xl text-text tracking-[0.1em]">Performance</span>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div className="flex items-center justify-center">
              <RadarChart stats={display} />
            </div>
            <div className="space-y-1">
              <StatRow label="AVG KILLS" value={String(display.avgKills)} />
              <StatRow label="AVG DEATHS" value={String(display.avgDeaths)} />
              <StatRow label="AVG ASSISTS" value={String(display.avgAssists)} />
              <StatRow label="AVG CS" value={String(display.avgCs)} />
              <StatRow label="AVG GOLD" value={formatNum(display.avgGold)} />
              <StatRow label="AVG DAMAGE" value={formatNum(display.avgDamage)} />
              <StatRow label="AVG VISION" value={String(display.avgVision)} />
              <StatRow label="KDA RATIO" value={display.kda.toFixed(2)} />
            </div>
          </div>
        </div>
      </section>

      {/* Champion Pool */}
      <section>
        <div className="h-1.5 bg-teal" />
        <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted p-5">
          <span className="font-heading text-xl text-text tracking-[0.1em]">
            Champion Pool
          </span>
          {display.champions.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[3px] mt-4">
              {display.champions.slice(0, 10).map((champ) => (
                <div
                  key={champ.name}
                  className="bg-surface border border-surface-muted overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 p-2.5">
                    <img
                      src={champIconUrl(champ.name)}
                      alt=""
                      className="w-8 h-8 rounded-sm shrink-0"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-[0.08em] truncate">
                        {champ.name}
                      </p>
                      <p className="text-[0.625rem] text-text-muted tracking-[0.15em]">
                        {champ.games}G ·{' '}
                        <span className={champ.winRate >= 50 ? 'text-teal' : 'text-accent'}>
                          {champ.winRate}%
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted tracking-[0.1em] mt-4">No champion data.</p>
          )}
        </div>
      </section>

      {/* Recent Games */}
      <section>
        <div className="h-1.5 bg-steel" />
        <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-muted">
            <span className="font-heading text-xl text-text tracking-[0.1em]">
              Recent Games
            </span>
          </div>
          {display.recentGames.length > 0 ? (
            <>
              <div className="hidden sm:flex px-5 py-1.5 items-center text-[0.625rem] font-semibold text-text-muted tracking-[0.2em] border-b border-surface-muted">
                <span className="w-8 text-center shrink-0">W/L</span>
                <span className="w-28 ml-3 shrink-0">Champion</span>
                <span className="flex-1">KDA</span>
                <span className="w-12 text-center shrink-0">CS</span>
                <span className="w-14 text-center shrink-0">Gold</span>
                <span className="w-14 text-center shrink-0">DMG</span>
              </div>
              <ul className="divide-y divide-surface-muted">
                {display.recentGames.slice(0, 15).map((game, i) => (
                  <li
                    key={i}
                    className="flex items-center px-5 py-2.5 hover:bg-surface-muted/20 transition-colors"
                  >
                    <span
                      className={`w-8 text-center shrink-0 text-xs font-bold ${game.win ? 'text-teal' : 'text-accent'}`}
                    >
                      {game.win ? 'W' : 'L'}
                    </span>
                    <span className="w-28 ml-3 shrink-0 flex items-center gap-2">
                      <img
                        src={champIconUrl(game.champion)}
                        alt=""
                        className="w-6 h-6 rounded-sm shrink-0"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <span className="text-xs font-semibold tracking-[0.08em] truncate">
                        {game.champion}
                      </span>
                    </span>
                    <span className="flex-1 text-xs tracking-[0.1em]">
                      <span className="text-teal">{game.kills}</span>
                      <span className="text-text-muted">/</span>
                      <span className="text-accent">{game.deaths}</span>
                      <span className="text-text-muted">/</span>
                      <span className="text-text">{game.assists}</span>
                    </span>
                    <span className="w-12 text-center shrink-0 text-xs text-text-muted hidden sm:block">
                      {game.cs}
                    </span>
                    <span className="w-14 text-center shrink-0 text-xs text-text-muted hidden sm:block">
                      {formatNum(game.gold)}
                    </span>
                    <span className="w-14 text-center shrink-0 text-xs text-text-muted hidden sm:block">
                      {formatNum(game.damage)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-text-muted tracking-[0.1em] px-5 py-4">No game data.</p>
          )}
        </div>
      </section>

      {hasData && (
        <p className="text-[0.6875rem] font-medium text-text-muted text-right tracking-[0.2em]">
          Last {display.games} games
        </p>
      )}
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
