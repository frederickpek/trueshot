import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-surface-muted/50 bg-surface-elevated/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
              <span className="text-accent font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight group-hover:text-accent transition-colors">
                Trueshot
              </h1>
              <p className="text-xs text-text-muted">LoL Team Stats</p>
            </div>
          </Link>
          <nav className="text-sm text-text-muted">
            <Link to="/" className="hover:text-accent transition-colors">
              Compare Teams
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-surface-muted/50 py-6 text-center text-xs text-text-muted">
        <p>Unofficial fan project — not affiliated with Riot Games.</p>
        <p className="mt-1">Data from LoL Esports API &amp; Global Power Rankings.</p>
      </footer>
    </div>
  )
}
