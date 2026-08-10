import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTeamElos, useTeamsIndex } from '../hooks/useTeamData'
import { getLeagueLabel, TIER1_LEAGUE_SLUGS } from '../lib/leagues'
import type { EloSnapshot } from '../api/lolesports'

const LINE_COLORS = [
  '#FF4655',
  '#15E5A8',
  '#ECE8E1',
  '#768A9D',
  '#FF8C42',
  '#B07DEB',
  '#4DA6FF',
  '#FF6B9D',
  '#FFD93D',
  '#00D4AA',
]

const DATE_PRESETS = [
  { label: '2025', value: '2025' },
  { label: '2026', value: '2026' },
  { label: '2027', value: '2027' },
]

interface ChartTeam {
  code: string
  name: string
  elo: number
  leagueSlug: string
  image: string
  slug: string
  history: EloSnapshot[]
  globalRank: number
  regionalRank: number
}

export function EloPage() {
  const index = useTeamsIndex()
  const elos = useTeamElos()
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('2025')
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)
  const initializedRef = useRef(false)

  const chartTeams = useMemo(() => {
    if (!index.data || !elos.data) return []
    const eloMap = new Map(elos.data.teams.map((t) => [t.code, t]))
    return index.data.teams
      .map((t) => {
        const eloEntry = eloMap.get(t.code)
        const ranked = elos.ranked.get(t.code)
        if (!eloEntry || !ranked) return null
        const history = eloEntry.history.filter((h) => h.date >= '2024')
        if (history.length === 0) return null
        return {
          code: t.code,
          name: t.name,
          elo: ranked.elo,
          leagueSlug: t.leagueSlug,
          image: t.image,
          slug: t.slug,
          history,
          globalRank: ranked.globalRank,
          regionalRank: ranked.regionalRank,
        } as ChartTeam
      })
      .filter((t): t is ChartTeam => t !== null)
      .sort((a, b) => a.globalRank - b.globalRank)
  }, [index.data, elos.data, elos.ranked])

  useEffect(() => {
    if (!initializedRef.current && chartTeams.length > 0) {
      setSelectedCodes(new Set(chartTeams.slice(0, 5).map((t) => t.code)))
      initializedRef.current = true
    }
  }, [chartTeams])

  const filteredTeams = useMemo(() => {
    if (leagueFilter === 'all') return chartTeams
    return chartTeams.filter((t) => t.leagueSlug === leagueFilter)
  }, [chartTeams, leagueFilter])

  const toggleTeam = useCallback((code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  const dateCutoff = `${dateRange}-01-01`

  const colorMap = useMemo(() => {
    const map = new Map<string, string>()
    chartTeams.forEach((team, i) => {
      map.set(team.code, LINE_COLORS[i % LINE_COLORS.length])
    })
    return map
  }, [chartTeams])

  if (index.isLoading || elos.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted tracking-[0.3em] text-xs">
        Loading elo data…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-4xl text-accent tracking-[0.1em] leading-none">
          Elo Rankings
        </h2>
        <p className="text-text-muted text-xs tracking-[0.15em] mt-2 mb-4">
          Trueshot Elo ratings and historical performance across all tracked teams.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex flex-wrap gap-[3px]">
            <FilterButton
              label="All"
              active={leagueFilter === 'all'}
              onClick={() => setLeagueFilter('all')}
            />
            {TIER1_LEAGUE_SLUGS.map((slug) => (
              <FilterButton
                key={slug}
                label={getLeagueLabel(slug)}
                active={leagueFilter === slug}
                onClick={() => setLeagueFilter(slug)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-[3px]">
            {DATE_PRESETS
              .filter((p) => chartTeams.some((t) => t.history.some((h) => h.date >= `${p.value}-01-01`)))
              .map((p) => (
                <FilterButton
                  key={p.value}
                  label={p.label}
                  active={dateRange === p.value}
                  onClick={() => setDateRange(p.value)}
                />
              ))}
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row lg:items-stretch">
        <div className="lg:flex-[4] min-w-0">
          <div className="h-1.5 bg-accent" />
          <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted p-4">
            <EloChart
              teams={filteredTeams}
              selectedCodes={selectedCodes}
              colorMap={colorMap}
              dateCutoff={dateCutoff}
              onHover={setHoveredCode}
              onToggle={toggleTeam}
            />
          </div>
        </div>

        <div className="lg:flex-[2] min-w-0 flex flex-col">
          <div className="h-1.5 bg-teal" />
          <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted overflow-hidden flex flex-col flex-1">
            <EloTable
              teams={filteredTeams}
              selectedCodes={selectedCodes}
              colorMap={colorMap}
              leagueFilter={leagueFilter}
              onToggle={toggleTeam}
              onHover={setHoveredCode}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold tracking-[0.1em] transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'bg-surface-muted text-text-muted hover:bg-accent/20 hover:text-accent'
      }`}
    >
      {label}
    </button>
  )
}

const MARGIN = { top: 15, right: 20, bottom: 32, left: 50 }
const VB_W = 1000
const VB_H = 600
const CHART_W = VB_W - MARGIN.left - MARGIN.right
const CHART_H = VB_H - MARGIN.top - MARGIN.bottom

function EloChart({
  teams,
  selectedCodes,
  colorMap,
  dateCutoff,
  onHover,
  onToggle,
}: {
  teams: ChartTeam[]
  selectedCodes: Set<string>
  colorMap: Map<string, string>
  dateCutoff: string
  onHover: (code: string | null) => void
  onToggle: (code: string) => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ code: string; elo: number; x: number; y: number } | null>(null)

  const dateFilteredTeams = useMemo(() => {
    return teams.map((t) => ({
      ...t,
      history: t.history.filter((h) => h.date >= dateCutoff),
    })).filter((t) => t.history.length > 0)
  }, [teams, dateCutoff])

  const scaleTeams = useMemo(() => {
    const selected = dateFilteredTeams.filter((t) => selectedCodes.has(t.code))
    return selected.length > 0 ? selected : dateFilteredTeams
  }, [dateFilteredTeams, selectedCodes])

  const { minElo, maxElo, minDate, maxDate, yTicks, xTicks } = useMemo(() => {
    if (scaleTeams.length === 0) {
      return {
        minElo: 1000,
        maxElo: 1600,
        minDate: new Date('2025-01-01').getTime(),
        maxDate: Date.now(),
        yTicks: [] as number[],
        xTicks: [] as { ts: number; label: string }[],
      }
    }

    let minE = Infinity
    let maxE = -Infinity
    let minD = Infinity
    let maxD = -Infinity
    for (const t of scaleTeams) {
      for (const h of t.history) {
        const d = new Date(h.date).getTime()
        if (h.elo < minE) minE = h.elo
        if (h.elo > maxE) maxE = h.elo
        if (d < minD) minD = d
        if (d > maxD) maxD = d
      }
    }

    const padBottom = minE * 0.05
    const padTop = maxE * 0.05
    minE = Math.floor(minE - padBottom)
    maxE = Math.ceil(maxE + padTop)

    const yt: number[] = []
    for (let e = Math.ceil(minE / 100) * 100; e <= maxE; e += 100) yt.push(e)

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    const rangeDays = (maxD - minD) / 86400000
    const monthStep = rangeDays <= 365 ? 1 : rangeDays <= 730 ? 2 : 3
    const xt: { ts: number; label: string }[] = []
    const startDate = new Date(minD)
    const endDate = new Date(maxD)
    for (let y = startDate.getFullYear(); y <= endDate.getFullYear() + 1; y++) {
      for (let m = 0; m < 12; m += monthStep) {
        const d = new Date(y, m, 1)
        const ts = d.getTime()
        if (ts >= minD - 15 * 86400000 && ts <= maxD + 15 * 86400000) {
          xt.push({ ts, label: `${months[m]} ${y}` })
        }
      }
    }

    return { minElo: minE, maxElo: maxE, minDate: minD, maxDate: maxD, yTicks: yt, xTicks: xt }
  }, [scaleTeams])

  const xScale = useCallback(
    (ts: number) => MARGIN.left + ((ts - minDate) / (maxDate - minDate)) * CHART_W,
    [minDate, maxDate],
  )

  const yScale = useCallback(
    (elo: number) => MARGIN.top + CHART_H - ((elo - minElo) / (maxElo - minElo)) * CHART_H,
    [minElo, maxElo],
  )

  const pathForTeam = useCallback(
    (team: ChartTeam) =>
      team.history
        .map((h, i) => `${i === 0 ? 'M' : 'L'}${xScale(new Date(h.date).getTime())},${yScale(h.elo)}`)
        .join(' '),
    [xScale, yScale],
  )

  const fgTeams = dateFilteredTeams.filter((t) => selectedCodes.has(t.code))

  const handlePathHover = useCallback(
    (code: string, elo: number, e: React.MouseEvent) => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (rect) {
        setTooltip({ code, elo, x: e.clientX - rect.left, y: e.clientY - rect.top })
      }
      onHover(code)
    },
    [onHover],
  )

  const handlePathLeave = useCallback(() => {
    setTooltip(null)
    onHover(null)
  }, [onHover])

  if (teams.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted tracking-[0.15em] text-sm">
        No teams in this region.
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Horizontal grid + y-axis labels */}
        {yTicks.map((elo) => (
          <g key={elo}>
            <line
              x1={MARGIN.left}
              y1={yScale(elo)}
              x2={VB_W - MARGIN.right}
              y2={yScale(elo)}
              stroke="#2D3843"
              strokeWidth={0.5}
            />
            <text
              x={MARGIN.left - 8}
              y={yScale(elo)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#768A9D"
              fontSize={11}
              fontFamily="'Barlow Condensed', sans-serif"
              letterSpacing="0.05em"
            >
              {elo}
            </text>
          </g>
        ))}

        {/* Vertical grid + x-axis labels */}
        {xTicks.map((tick) => {
          const x = xScale(tick.ts)
          if (x < MARGIN.left || x > VB_W - MARGIN.right) return null
          return (
            <g key={tick.label}>
              <line x1={x} y1={MARGIN.top} x2={x} y2={MARGIN.top + CHART_H} stroke="#2D3843" strokeWidth={0.5} />
              <text
                x={x}
                y={MARGIN.top + CHART_H + 18}
                textAnchor="middle"
                fill="#768A9D"
                fontSize={10}
                fontFamily="'Barlow Condensed', sans-serif"
                letterSpacing="0.08em"
              >
                {tick.label}
              </text>
            </g>
          )
        })}

        {/* Selected lines */}
        {fgTeams.map((team) => (
          <path
            key={team.code}
            d={pathForTeam(team)}
            fill="none"
            stroke={colorMap.get(team.code) || '#ECE8E1'}
            strokeWidth={2}
          />
        ))}

        {/* Endpoint dots for selected teams */}
        {fgTeams.map((team) => {
          const last = team.history[team.history.length - 1]
          const cx = xScale(new Date(last.date).getTime())
          const cy = yScale(last.elo)
          const color = colorMap.get(team.code) || '#ECE8E1'
          return <circle key={`dot-${team.code}`} cx={cx} cy={cy} r={3} fill={color} />
        })}

        {/* Invisible hover targets for selected teams */}
        {fgTeams.map((team) => (
          <path
            key={`hit-${team.code}`}
            d={pathForTeam(team)}
            fill="none"
            stroke="transparent"
            strokeWidth={10}
            pointerEvents="stroke"
            className="cursor-pointer"
            onMouseMove={(e) => handlePathHover(team.code, team.elo, e)}
            onMouseLeave={handlePathLeave}
            onClick={() => onToggle(team.code)}
          />
        ))}

        {/* Axes */}
        <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + CHART_H} stroke="#2D3843" strokeWidth={1} />
        <line x1={MARGIN.left} y1={MARGIN.top + CHART_H} x2={VB_W - MARGIN.right} y2={MARGIN.top + CHART_H} stroke="#2D3843" strokeWidth={1} />
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-surface border border-surface-muted px-2.5 py-1.5 z-10"
          style={{ left: tooltip.x + 14, top: tooltip.y - 28 }}
        >
          <span className="text-xs font-semibold tracking-wider text-text">{tooltip.code}</span>
          <span className="text-xs font-medium tracking-wider text-text-muted ml-2">{tooltip.elo}</span>
        </div>
      )}
    </div>
  )
}

function EloTable({
  teams,
  selectedCodes,
  colorMap,
  leagueFilter,
  onToggle,
  onHover,
}: {
  teams: ChartTeam[]
  selectedCodes: Set<string>
  colorMap: Map<string, string>
  leagueFilter: string
  onToggle: (code: string) => void
  onHover: (code: string | null) => void
}) {
  return (
    <>
      <div className="px-4 py-2 flex items-center text-[0.625rem] font-semibold text-text-muted tracking-[0.2em] border-b border-surface-muted shrink-0">
        <span className="w-8 text-center shrink-0">#</span>
        <span className="flex-1 ml-3">Team</span>
        <span className="w-14 text-center shrink-0">League</span>
        <span className="w-14 text-right shrink-0 pr-1">Elo</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {teams.map((team) => {
          const isSelected = selectedCodes.has(team.code)
          const color = colorMap.get(team.code)
          const rank = leagueFilter === 'all' ? team.globalRank : team.regionalRank
          return (
            <button
              key={team.code}
              type="button"
              onClick={() => onToggle(team.code)}
              onMouseEnter={() => onHover(team.code)}
              onMouseLeave={() => onHover(null)}
              className={`w-full flex items-center px-4 py-2 transition-colors text-left border-b border-surface-muted/50 ${
                isSelected ? 'bg-surface-muted/30' : 'hover:bg-surface-muted/20'
              }`}
              style={{ borderLeft: isSelected && color ? `3px solid ${color}` : '3px solid transparent' }}
            >
              <span className="w-8 text-center shrink-0 text-xs font-heading text-text-muted">{rank}</span>
              <img src={team.image} alt={team.code} className="w-6 h-6 object-contain shrink-0 ml-3" />
              <span
                className={`ml-2 flex-1 min-w-0 truncate text-sm font-semibold tracking-[0.08em] transition-colors ${
                  isSelected ? 'text-text' : 'text-text-muted'
                }`}
              >
                {team.name}
              </span>
              <span className="w-14 text-center shrink-0 text-[0.6875rem] font-medium text-text-muted">
                {getLeagueLabel(team.leagueSlug)}
              </span>
              <span
                className="w-14 text-right shrink-0 text-sm font-heading tracking-wider pr-1"
                style={{ color: isSelected && color ? color : '#8B9DA8' }}
              >
                {team.elo}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
