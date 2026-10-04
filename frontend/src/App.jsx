import { Link, Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AchievementsPage from './pages/AchievementsPage.jsx'
import ChallengesPage from './pages/ChallengesPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import AdminGames from './pages/AdminGames.jsx'
import AdminChallenges from './pages/AdminChallenges.jsx'
import AdminScores from './pages/AdminScores.jsx'
import AdminAccessPage from './pages/AdminAccessPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import FeaturePlaceholderPage from './pages/FeaturePlaceholderPage.jsx'
import GameDetailPage from './pages/GameDetailPage.jsx'
import GamesPage from './pages/GamesPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'

function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#111512] px-5 text-center text-[#f4f4ed]">
      <div>
        <p className="text-xs font-semibold uppercase text-[#c8f169]">404 / off the map</p>
        <h1 className="mt-3 text-4xl font-semibold">Halaman tidak ditemukan</h1>
        <Link to="/" className="mt-6 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 transition hover:border-[#c8f169]/50 hover:text-white">
          Kembali ke beranda
        </Link>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/session" element={<Navigate to="/dashboard" replace />} />
        {/* ── Game System (Phase 7) ── */}
        <Route path="/games" element={<GamesPage />} />
        <Route path="/games/:slug" element={<GameDetailPage />} />
        {/* ── Leaderboard (Phase 8) ── */}
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        {/* ── Challenges (Phase 10) ── */}
        <Route path="/challenges" element={<ChallengesPage />} />
        {/* ── Achievements (Phase 9) ── */}
        <Route path="/achievements" element={<AchievementsPage />} />
        {/* ── Profile & History (Phase 11) ── */}
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<FeaturePlaceholderPage title="Settings" />} />
      </Route>
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/games" element={<AdminGames />} />
        <Route path="/admin/challenges" element={<AdminChallenges />} />
        <Route path="/admin/scores" element={<AdminScores />} />
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}
