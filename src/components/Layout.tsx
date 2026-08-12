import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { SearchBar } from './SearchBar'

const NAV_ITEMS = [
  { to: '/', label: 'Compare' },
  { to: '/upcoming', label: 'Upcoming' },
  { to: '/standings', label: 'Standings' },
  { to: '/elo', label: 'Elo' },
]

export function Layout() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-surface" ref={menuRef}>
        <div className="relative flex h-12 gap-[3px]">
          <div className="bg-accent w-7 shrink-0" />
          <Link
            to="/"
            className="bg-cream flex items-center px-5 shrink-0 hover:brightness-110 transition-all"
          >
            <span className="font-heading text-surface text-[1.75rem] leading-none tracking-[0.15em]">
              TRUESHOT
            </span>
          </Link>
          <div className="bg-steel w-12 shrink-0 hidden lg:block" />

          {/* Desktop: nav + centered search */}
          <div className="hidden lg:flex flex-1 bg-cream/10 min-w-4 items-center justify-end px-4">
            <div className="flex gap-[3px] shrink-0">
              {NAV_ITEMS.map(({ to, label }) => {
                const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`px-4 py-1.5 text-xs font-semibold tracking-[0.15em] transition-colors ${
                      active
                        ? 'bg-accent text-white'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="hidden lg:block bg-teal w-12 shrink-0" />
          <div className="hidden lg:flex absolute inset-0 items-center justify-center pointer-events-none z-10">
            <div className="pointer-events-auto">
              <SearchBar />
            </div>
          </div>

          {/* Mobile: hamburger */}
          <div className="flex lg:hidden flex-1 bg-cream/10 items-center justify-end px-3">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1.5 text-text-muted hover:text-text transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4L16 16M16 4L4 16" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 5H17M3 10H17M3 15H17" />
                </svg>
              )}
            </button>
          </div>
          <div className="block lg:hidden bg-teal w-7 shrink-0" />
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div className="lg:hidden bg-surface-elevated border-t border-surface-muted">
            <div className="px-4 py-3">
              <SearchBar fullWidth />
            </div>
            <div className="border-t border-surface-muted">
              {NAV_ITEMS.map(({ to, label }) => {
                const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-4 py-3 text-xs font-semibold tracking-[0.15em] transition-colors border-b border-surface-muted/50 ${
                      active
                        ? 'text-accent bg-accent/10'
                        : 'text-text-muted hover:text-text hover:bg-surface-muted/20'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-[3px]">
          <div className="w-24 h-5 bg-accent" />
          <div className="w-24 h-5 bg-teal" />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="mt-auto pt-[3px]">
        <div className="flex justify-between mb-[3px]">
          <div className="w-24 h-4 bg-cream" />
          <div className="w-24 h-4 bg-steel" />
        </div>
        <div className="flex h-8 gap-[3px]">
          <div className="bg-cream w-7 shrink-0" />
          <div className="bg-cream/10 flex items-center px-4 flex-1">
            <span className="text-[0.625rem] text-text-muted tracking-[0.15em]">
              UNOFFICIAL · NOT AFFILIATED WITH RIOT GAMES
            </span>
          </div>
          <div className="bg-steel flex items-center px-4 shrink-0">
            <span className="text-[0.625rem] text-surface/60 tracking-[0.15em]">
              DATA · LOL ESPORTS API
            </span>
          </div>
          <div className="bg-steel w-7 shrink-0" />
        </div>
      </footer>
    </div>
  )
}
