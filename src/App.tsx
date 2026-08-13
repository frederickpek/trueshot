import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ComparePage } from './pages/ComparePage'
import { MatchPage } from './pages/MatchPage'
import { PlayerPage } from './pages/PlayerPage'
import { TeamPage } from './pages/TeamPage'
import { EloPage } from './pages/EloPage'
import { RankingsPage } from './pages/RankingsPage'
import { UpcomingPage } from './pages/UpcomingPage'
import { AboutPage } from './pages/AboutPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ComparePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="upcoming" element={<UpcomingPage />} />
          <Route path="standings" element={<RankingsPage />} />
          <Route path="elo" element={<EloPage />} />
          <Route path="team/:slug" element={<TeamPage />} />
          <Route path="player/:id" element={<PlayerPage />} />
          <Route path="match/:matchId" element={<MatchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
