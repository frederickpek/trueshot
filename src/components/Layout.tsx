import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-surface">
        <div className="flex h-12 gap-[3px]">
          <div className="bg-accent w-7 rounded-l-full shrink-0" />
          <Link
            to="/"
            className="bg-cream flex items-center px-5 shrink-0 hover:brightness-110 transition-all"
          >
            <span className="font-heading text-surface text-[28px] leading-none tracking-[0.15em]">
              TRUESHOT
            </span>
          </Link>
          <div className="bg-steel flex items-center px-4 shrink-0 hidden sm:flex">
            <span className="text-[11px] text-surface/70 tracking-[0.2em]">
              LOL TEAM STATS
            </span>
          </div>
          <div className="flex-1 bg-cream/10 min-w-4" />
          <div className="bg-teal flex items-center px-5 rounded-r-full shrink-0">
            <span className="text-surface text-xs font-bold tracking-[0.2em]">TS·01</span>
          </div>
        </div>
        <div className="flex justify-between mt-[3px]">
          <div className="w-24 h-5 bg-accent rounded-br-[16px]" />
          <div className="w-24 h-5 bg-teal rounded-bl-[16px]" />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="mt-auto pt-[3px]">
        <div className="flex justify-between mb-[3px]">
          <div className="w-24 h-4 bg-cream rounded-tr-[12px]" />
          <div className="w-24 h-4 bg-steel rounded-tl-[12px]" />
        </div>
        <div className="flex h-8 gap-[3px]">
          <div className="bg-cream w-7 rounded-l-full shrink-0" />
          <div className="bg-cream flex items-center px-4 flex-1">
            <span className="text-[10px] text-surface/50 tracking-[0.15em]">
              UNOFFICIAL · NOT AFFILIATED WITH RIOT GAMES
            </span>
          </div>
          <div className="bg-steel flex items-center px-4 shrink-0">
            <span className="text-[10px] text-surface/60 tracking-[0.15em]">
              DATA · LOL ESPORTS API · GPR
            </span>
          </div>
          <div className="bg-steel w-7 rounded-r-full shrink-0" />
        </div>
      </footer>
    </div>
  )
}
