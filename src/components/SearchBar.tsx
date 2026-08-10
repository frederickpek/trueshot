import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { loadPlayerIndex, loadTeamsIndex } from '../api/lolesports'
import { getLeagueLabel } from '../lib/leagues'

export function SearchBar({ fullWidth }: { fullWidth?: boolean } = {}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const teamsQuery = useQuery({ queryKey: ['teams-index'], queryFn: loadTeamsIndex, staleTime: 1000 * 60 * 60 })
  const playersQuery = useQuery({ queryKey: ['player-index'], queryFn: loadPlayerIndex, staleTime: 1000 * 60 * 60 })

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const teams = (teamsQuery.data?.teams ?? [])
      .filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({
        type: 'team' as const,
        id: t.slug,
        label: t.name,
        sub: `${getLeagueLabel(t.leagueSlug)} · ${t.region}`,
        image: t.image,
        path: `/team/${t.slug}`,
      }))

    const players = (playersQuery.data?.players ?? [])
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({
        type: 'player' as const,
        id: p.id,
        label: p.name,
        sub: p.role.toUpperCase(),
        image: undefined as string | undefined,
        path: `/player/${p.id}`,
      }))

    return [...teams, ...players]
  }, [query, teamsQuery.data, playersQuery.data])

  const selectResult = useCallback(
    (path: string) => {
      navigate(path)
      setQuery('')
      setOpen(false)
      inputRef.current?.blur()
    },
    [navigate],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
      } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault()
        selectResult(results[activeIndex].path)
      } else if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    },
    [activeIndex, results, selectResult],
  )

  useEffect(() => {
    setActiveIndex(-1)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        className={`bg-surface border border-surface-muted px-3 py-1.5 text-xs tracking-[0.1em] text-text placeholder:text-text-muted/50 outline-none focus:border-accent transition-all ${
          fullWidth ? 'w-full' : 'w-40 focus:w-56'
        }`}
      />

      {open && results.length > 0 && (
        <div className={`absolute top-full left-0 mt-1 bg-surface-elevated border border-surface-muted z-50 shadow-lg max-h-80 overflow-y-auto ${fullWidth ? 'w-full' : 'w-72'}`}>
          {results.map((r, i) => {
            const isTeamBoundary = i === 0 && r.type === 'team'
            const isPlayerBoundary = r.type === 'player' && (i === 0 || results[i - 1].type === 'team')
            return (
              <div key={`${r.type}-${r.id}`}>
                {isTeamBoundary && (
                  <div className="px-3 py-1.5 text-[0.5625rem] font-semibold tracking-[0.2em] text-text-muted bg-surface-muted/30 border-b border-surface-muted">
                    Teams
                  </div>
                )}
                {isPlayerBoundary && (
                  <div className="px-3 py-1.5 text-[0.5625rem] font-semibold tracking-[0.2em] text-text-muted bg-surface-muted/30 border-b border-surface-muted">
                    Players
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => selectResult(r.path)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    i === activeIndex ? 'bg-surface-muted/50' : 'hover:bg-surface-muted/30'
                  }`}
                >
                  {r.image && (
                    <img src={r.image} alt="" className="w-5 h-5 object-contain shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-[0.08em] text-text truncate">{r.label}</p>
                    <p className="text-[0.5625rem] font-medium tracking-[0.15em] text-text-muted">{r.sub}</p>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
