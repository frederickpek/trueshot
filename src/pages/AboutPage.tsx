import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const FEATURES = [
  {
    title: 'Compare',
    description: 'Side-by-side team comparison with head-to-head records, win rates, and global power rankings across all tier-1 regions.',
    image: 'screenshots/compare.png',
    link: '/',
  },
  {
    title: 'Compare — Head to Head',
    description: 'Detailed match history between two teams with series scores, champion picks, and historical performance trends.',
    image: 'screenshots/compare-2.png',
    link: '/',
  },
  {
    title: 'Upcoming',
    description: 'Live and upcoming match schedule across all leagues with real-time scores, countdowns, and quick-compare access.',
    image: 'screenshots/upcoming.png',
    link: '/upcoming',
  },
  {
    title: 'Standings',
    description: 'League standings for every tier-1 region with win-loss records, streaks, and tournament stage breakdowns.',
    image: 'screenshots/standings.png',
    link: '/standings',
  },
  {
    title: 'Elo Rankings',
    description: 'Cross-region power rankings using an Elo rating system to compare team strength across different leagues.',
    image: 'screenshots/elo.png',
    link: '/elo',
  },
  {
    title: 'Team Profile',
    description: 'Detailed team pages with roster, recent form, match history, and performance stats across the current split.',
    image: 'screenshots/team.png',
    link: '/team/t1',
  },
  {
    title: 'Match Detail',
    description: 'Per-game breakdowns of completed series with champion draft, side selection, and game-by-game results.',
    image: 'screenshots/match.png',
    link: '/match/115548147900487905',
  },
  {
    title: 'Player Profile',
    description: 'Individual player stats with champion pools, game counts, and performance metrics across the season.',
    image: 'screenshots/player.png',
    link: '/player/107492068702410338',
  },
]

function CarouselDot({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-2 h-2 transition-all ${
        active ? 'bg-accent w-6' : 'bg-surface-muted hover:bg-steel'
      }`}
    />
  )
}

export function AboutPage() {
  const [offset, setOffset] = useState(1)
  const [animate, setAnimate] = useState(true)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const trackRef = useRef<HTMLDivElement>(null)

  const slides = [FEATURES[FEATURES.length - 1], ...FEATURES, FEATURES[0]]

  const current = ((offset - 1) % FEATURES.length + FEATURES.length) % FEATURES.length

  useEffect(() => {
    if (!animate) return
    const handle = () => {
      if (offset === 0) {
        setAnimate(false)
        setOffset(FEATURES.length)
      } else if (offset === slides.length - 1) {
        setAnimate(false)
        setOffset(1)
      }
    }
    const el = trackRef.current
    el?.addEventListener('transitionend', handle)
    return () => el?.removeEventListener('transitionend', handle)
  }, [offset, animate, slides.length])

  useEffect(() => {
    if (!animate) {
      requestAnimationFrame(() => setAnimate(true))
    }
  }, [animate])

  useEffect(() => {
    if (!isAutoPlaying) return
    intervalRef.current = setInterval(() => {
      setOffset((o) => o + 1)
      setAnimate(true)
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [isAutoPlaying])

  const goTo = (index: number) => {
    setOffset(index + 1)
    setAnimate(true)
    setIsAutoPlaying(false)
  }

  const prev = () => {
    setOffset((o) => o - 1)
    setAnimate(true)
    setIsAutoPlaying(false)
  }

  const next = () => {
    setOffset((o) => o + 1)
    setAnimate(true)
    setIsAutoPlaying(false)
  }

  const feature = FEATURES[current]

  return (
    <div className="space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="font-heading text-5xl md:text-7xl text-accent tracking-[0.1em] leading-none">
          Trueshot
        </h1>
        <p className="text-text text-sm tracking-[0.12em] mt-4 leading-relaxed normal-case">
          A League of Legends esports intelligence tool built for quick cross-region team comparison.
          Trueshot combines official match data with Elo ratings calculated from historical results
          since 2023 to give you a fast read on any two teams' relative strength, recent form,
          and head-to-head history.
        </p>
        <div className="flex items-center justify-center gap-[3px] mt-6">
          <div className="h-0.5 w-16 bg-accent" />
          <div className="h-0.5 w-4 bg-teal" />
          <div className="h-0.5 w-16 bg-accent" />
        </div>
      </div>

      <div>
        <div className="relative group">
          <div className="h-1.5 bg-accent" />
          <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted overflow-hidden">
            <div className="relative">
              <div
                ref={trackRef}
                className={`flex ${animate ? 'transition-transform duration-500 ease-out' : ''}`}
                style={{ transform: `translateX(-${offset * 100}%)` }}
              >
                {slides.map((f, i) => (
                  <div key={`${f.title}-${i}`} className="w-full shrink-0">
                    <img
                      src={`${import.meta.env.BASE_URL}${f.image}`}
                      alt={f.title}
                      className="w-full"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface/80 border border-surface-muted text-text-muted hover:text-text hover:bg-surface transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 3L5 8L10 13" />
                </svg>
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface/80 border border-surface-muted text-text-muted hover:text-text hover:bg-surface transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 3L11 8L6 13" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 border-t border-surface-muted">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-heading text-xl text-text tracking-[0.08em]">
                      {feature.title}
                    </h3>
                    <Link
                      to={feature.link}
                      className="text-[0.625rem] text-accent tracking-[0.15em] font-semibold hover:text-text transition-colors shrink-0"
                    >
                      View Page →
                    </Link>
                  </div>
                  <p className="text-text-muted text-xs tracking-[0.08em] mt-1 leading-relaxed normal-case">
                    {feature.description}
                  </p>
                </div>
                <span className="font-heading text-sm text-steel tracking-[0.1em] shrink-0 pt-0.5">
                  {String(current + 1).padStart(2, '0')} / {String(FEATURES.length).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-4">
          {FEATURES.map((f, i) => (
            <CarouselDot key={f.title} active={i === current} onClick={() => goTo(i)} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 items-stretch gap-[3px]">
        <div className="flex flex-col">
          <div className="h-1 bg-accent" />
          <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted p-5 flex-1">
            <h3 className="font-heading text-lg text-text tracking-[0.08em]">Cross-Region</h3>
            <p className="text-text-muted text-xs tracking-[0.08em] mt-2 leading-relaxed normal-case">
              Compare teams across all tier-1 leagues — LCK, LPL, LEC, LCS, and international tournaments — in one unified view.
            </p>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-teal" />
          <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted p-5 flex-1">
            <h3 className="font-heading text-lg text-text tracking-[0.08em]">Live Data</h3>
            <p className="text-text-muted text-xs tracking-[0.08em] mt-2 leading-relaxed normal-case">
              Real-time scores and live match tracking with automatic updates. Schedules synced daily via the LoL Esports API.
            </p>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-steel" />
          <div className="bg-surface-elevated border-2 border-t-0 border-surface-muted p-5 flex-1">
            <h3 className="font-heading text-lg text-text tracking-[0.08em]">Elo Ratings</h3>
            <p className="text-text-muted text-xs tracking-[0.08em] mt-2 leading-relaxed normal-case">
              Elo ratings calculated from historical results since 2023 to compare team strength across regions.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-text-muted text-[0.625rem] tracking-[0.2em]">
          Built with React · Data from LoL Esports API · Not affiliated with Riot Games
        </p>
      </div>
    </div>
  )
}
