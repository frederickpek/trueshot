import { Link, Outlet, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Compare' },
  { to: '/upcoming', label: 'Upcoming' },
  { to: '/standings', label: 'Standings' },
  { to: '/elo', label: 'Elo' },
]

export function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-surface">
        <div className="flex h-12 gap-[3px]">
          <div className="bg-accent w-7 shrink-0" />
          <Link
            to="/"
            className="bg-cream flex items-center px-5 shrink-0 hover:brightness-110 transition-all"
          >
            <span className="font-heading text-surface text-[1.75rem] leading-none tracking-[0.15em]">
              TRUESHOT
            </span>
          </Link>
          <div className="bg-steel w-12 shrink-0" />
          <div className="flex-1 bg-cream/10 min-w-4 flex items-center justify-end px-4 gap-[3px]">
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
          <div className="bg-teal w-12 shrink-0" />
        </div>
        <div className="flex justify-between mt-[3px]">
          <div className="w-24 h-5 bg-accent" />
          <div className="w-24 h-5 bg-teal" />
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
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
