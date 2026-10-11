import { lazy, Suspense } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AdminRoute from './components/AdminRoute.jsx'
import NetworkStatus from './components/NetworkStatus.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
const AchievementsPage = lazy(() => import('./pages/AchievementsPage.jsx'))
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage.jsx'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'))
const ActivityPage = lazy(() => import('./pages/ActivityPage.jsx'))
const ChallengesPage = lazy(() => import('./pages/ChallengesPage.jsx'))
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const QuestsPage = lazy(() => import('./pages/QuestsPage.jsx'))
const RankedPage = lazy(() => import('./pages/RankedPage.jsx'))
const FriendsLeaderboardPage = lazy(() => import('./pages/FriendsLeaderboardPage.jsx'))
const ChessPage = lazy(() => import('./pages/ChessPage.jsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.jsx'))
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage.jsx'))
const SocialPage = lazy(() => import('./pages/SocialPage.jsx'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'))
const AdminUsers = lazy(() => import('./pages/AdminUsers.jsx'))
const AdminGames = lazy(() => import('./pages/AdminGames.jsx'))
const AdminChallenges = lazy(() => import('./pages/AdminChallenges.jsx'))
const AdminScores = lazy(() => import('./pages/AdminScores.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const GameDetailPage = lazy(() => import('./pages/GameDetailPage.jsx'))
const GamesPage = lazy(() => import('./pages/GamesPage.jsx'))
import HomePage from './pages/HomePage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import OfflineFallbackPage from './pages/OfflineFallbackPage.jsx'
import OfflinePracticePage from './pages/OfflinePracticePage.jsx'
import useOnlineStatus from './hooks/useOnlineStatus.js'
import { resolveOfflineNavigation } from './pwa/offlineNavigation.js'

function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#111323] px-5 text-center text-[#f4f4ed]">
      <div>
        <p className="text-xs font-semibold uppercase text-[#8b8bff]">404 / off the map</p>
        <h1 className="mt-3 text-4xl font-semibold">Halaman tidak ditemukan</h1>
        <Link to="/" className="mt-6 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 transition hover:border-[#8b8bff]/50 hover:text-white">
          Kembali ke beranda
        </Link>
      </div>
    </main>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const isOnline = useOnlineStatus()
  const offlineNavigation = resolveOfflineNavigation(pathname, isOnline)

  if (offlineNavigation.type === 'practice') {
    return <Navigate to={`/offline-play/${offlineNavigation.slug}`} replace />
  }

  if (offlineNavigation.type === 'fallback') {
    return <><NetworkStatus /><OfflineFallbackPage /></>
  }

  return (
    <>
      <NetworkStatus />
      <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#111323] text-sm text-white/55" aria-live="polite">Memuat halaman GameHub…</main>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/offline" element={<OfflineFallbackPage />} />
        <Route path="/offline-play/:slug" element={<OfflinePracticePage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/session" element={<Navigate to="/dashboard" replace />} />
          {/* ── Games, Quests & Progression ── */}
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/:slug" element={<GameDetailPage />} />
          <Route path="/ranked" element={<RankedPage />} />
          <Route path="/quests" element={<QuestsPage />} />
          {/* ── Leaderboard (Phase 8) ── */}
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          {/* ── Challenges (Phase 10) ── */}
          <Route path="/challenges" element={<ChallengesPage />} />
          {/* ── Achievements (Phase 9) ── */}
          <Route path="/achievements" element={<AchievementsPage />} />
          {/* ── Profile & History (Phase 11) ── */}
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/friends" element={<SocialPage />} />
          <Route path="/friends/leaderboard" element={<FriendsLeaderboardPage />} />
          <Route path="/chess" element={<ChessPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/users/:username" element={<PublicProfilePage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/games" element={<AdminGames />} />
          <Route path="/admin/challenges" element={<AdminChallenges />} />
          <Route path="/admin/scores" element={<AdminScores />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
        </Route>
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
      </Suspense>
    </>
  )
}
