import {
  Award,
  Gamepad2,
  RefreshCw,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import AchievementCard from '../components/AchievementCard.jsx'
import ChallengeCard from '../components/ChallengeCard.jsx'
import GameCard from '../components/GameCard.jsx'
import StatCard from '../components/StatCard.jsx'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getDashboard } from '../services/dashboardService.js'
import { useAuth } from '../hooks/useAuth.js'

// ─── Helpers ──────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 5)  return 'Up late'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

function formatScore(score) {
  return Number(score).toLocaleString('id-ID')
}

// ─── Skeleton Components ──────────────────────────────────

function SkeletonCard() {
  return (
    <div className="border border-white/[0.08] bg-[#171b19] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton size-10 rounded-xl" />
      </div>
      <div className="skeleton mt-5 h-8 w-28 rounded" />
      <div className="skeleton mt-2 h-2.5 w-32 rounded" />
    </div>
  )
}

function SkeletonGameCard() {
  return (
    <div className="border border-white/[0.08] bg-[#171b19] p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="skeleton size-12 rounded-xl" />
        <div className="flex-1">
          <div className="skeleton h-2.5 w-14 rounded" />
          <div className="skeleton mt-2 h-4 w-36 rounded" />
          <div className="skeleton mt-1.5 h-3 w-24 rounded" />
        </div>
        <div className="skeleton size-9 rounded-full" />
      </div>
    </div>
  )
}

function SkeletonAchievement() {
  return (
    <div className="flex items-center gap-3.5 border border-white/[0.08] bg-[#171b19] p-4">
      <div className="skeleton size-11 rounded-xl" />
      <div className="flex-1">
        <div className="skeleton h-3 w-28 rounded" />
        <div className="skeleton mt-1.5 h-2.5 w-44 rounded" />
      </div>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────

function SectionHeader({ eyebrow, title, suffix, eyebrowColor = 'text-white/30' }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <p className={`text-[10px] font-semibold uppercase tracking-widest ${eyebrowColor}`}>
          {eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-semibold leading-none">{title}</h2>
      </div>
      {suffix && <span className="text-xs text-white/32">{suffix}</span>}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────

function EmptyState({ message }) {
  return (
    <div className="border border-dashed border-white/12 p-8 text-center text-sm text-white/35">
      {message}
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCurrent = true

    setLoading(true)
    setError('')

    getDashboard()
      .then((data) => {
        if (isCurrent) setDashboard(data)
      })
      .catch((err) => {
        if (isCurrent)
          setError(err.response?.data?.message ?? 'Dashboard belum dapat dimuat.')
      })
      .finally(() => {
        if (isCurrent) setLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [attempt])

  function retry() {
    setDashboard(null)
    setAttempt((n) => n + 1)
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-fade-in">
          {/* Greeting skeleton */}
          <div className="mb-7">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton mt-3 h-9 w-64 rounded" />
            <div className="skeleton mt-2 h-3 w-48 rounded" />
          </div>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          {/* Body */}
          <div className="mt-8 grid gap-8 xl:grid-cols-[1.35fr_0.85fr]">
            <div className="skeleton h-52 rounded" />
            <div className="space-y-2">
              <SkeletonAchievement />
              <SkeletonAchievement />
              <SkeletonAchievement />
            </div>
          </div>
          <div className="mt-9 grid gap-3 md:grid-cols-2">
            <SkeletonGameCard />
            <SkeletonGameCard />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <DashboardLayout>
        <section
          className="mx-auto mt-10 max-w-lg border border-[#ef8b72]/18 bg-[#ef8b72]/[0.04] p-8"
          role="alert"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#ef8b72]">
            Dashboard unavailable
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Data belum dapat dimuat</h1>
          <p className="mt-2 text-sm leading-6 text-white/50">{error}</p>
          <button
            onClick={retry}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#c8f169] px-5 py-2.5 text-sm font-semibold text-[#172015] transition hover:bg-[#d7fa91]"
          >
            <RefreshCw className="size-4" />
            Coba lagi
          </button>
        </section>
      </DashboardLayout>
    )
  }

  // ── Success ──
  const { stats, dailyChallenge, achievements, recentGames, recommendedGames } = dashboard

  return (
    <DashboardLayout>
      <div className="animate-rise">

        {/* ── Greeting banner ─────────────────────────────── */}
        <header className="relative overflow-hidden rounded-none border border-white/[0.07] bg-[#171b19] px-6 py-7 sm:px-8 sm:py-9">
          {/* Accent glow */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 size-48 rounded-full opacity-50 blur-3xl"
            style={{ background: 'rgba(200,241,105,0.12)' }}
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#c8f169]">
                Player overview
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-none sm:text-4xl">
                {getGreeting()}, <span className="text-[#c8f169]">{user?.username}</span> 👋
              </h1>
              <p className="mt-2.5 text-sm text-white/45">
                {stats.gamesPlayed > 0
                  ? `${formatScore(stats.gamesPlayed)} games played · Ranked #${formatScore(stats.currentRank)} globally`
                  : 'Ready to play your first game?'}
              </p>
            </div>

            {/* Quick stat pills */}
            <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:flex-col sm:items-end">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c8f169]/20 bg-[#c8f169]/8 px-3 py-1.5 text-xs font-semibold text-[#c8f169]">
                <Zap className="size-3.5" aria-hidden="true" />
                {formatScore(stats.totalScore)} pts
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60">
                <Award className="size-3.5" aria-hidden="true" />
                {stats.achievementsUnlocked}/{stats.achievementsTotal} achievements
              </span>
            </div>
          </div>
        </header>

        {/* ── Stat cards ──────────────────────────────────── */}
        <section
          aria-label="Player statistics"
          className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4"
        >
          <div className="animate-rise-1">
            <StatCard
              label="Total score"
              value={formatScore(stats.totalScore)}
              detail="All-time accumulated points"
              icon={Zap}
              tone="lime"
            />
          </div>
          <div className="animate-rise-2">
            <StatCard
              label="Games played"
              value={formatScore(stats.gamesPlayed)}
              detail="Recorded game sessions"
              icon={Gamepad2}
              tone="sky"
            />
          </div>
          <div className="animate-rise-3">
            <StatCard
              label="Current rank"
              value={`#${formatScore(stats.currentRank)}`}
              detail="Global leaderboard position"
              icon={Trophy}
              tone="coral"
            />
          </div>
          <div className="animate-rise-4">
            <StatCard
              label="Achievements"
              value={`${stats.achievementsUnlocked}/${stats.achievementsTotal}`}
              detail="Milestones unlocked so far"
              icon={Award}
              tone="white"
            />
          </div>
        </section>

        {/* ── Challenge & Achievements row ─────────────────── */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">

          {/* Daily challenge */}
          <section aria-labelledby="challenge-heading">
            <SectionHeader
              eyebrow="Today · Compete"
              title="Daily Challenge"
              suffix="Earn bonus points"
              eyebrowColor="text-[#ef8b72]/70"
            />
            <h2 id="challenge-heading" className="sr-only">Daily Challenge</h2>
            {dailyChallenge ? (
              <ChallengeCard challenge={dailyChallenge} />
            ) : (
              <EmptyState message="Belum ada challenge aktif hari ini. Cek kembali nanti." />
            )}
          </section>

          {/* Achievements */}
          <section aria-labelledby="achievement-heading">
            <SectionHeader
              eyebrow="Milestones"
              title="Achievements"
              suffix={`${stats.achievementsUnlocked} unlocked`}
            />
            <h2 id="achievement-heading" className="sr-only">Achievements</h2>
            {achievements.length > 0 ? (
              <div className="space-y-2">
                {achievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>
            ) : (
              <EmptyState message="Achievement akan muncul setelah tersedia." />
            )}
          </section>
        </div>

        {/* ── Recent games ─────────────────────────────────── */}
        <section aria-labelledby="recent-heading" className="mt-8">
          <SectionHeader
            eyebrow="Your activity"
            title="Recent Games"
            suffix={`Last ${recentGames.length} result${recentGames.length !== 1 ? 's' : ''}`}
          />
          <h2 id="recent-heading" className="sr-only">Recent Games</h2>
          {recentGames.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {recentGames.map((game) => (
                <GameCard key={game.id} game={game} variant="recent" />
              ))}
            </div>
          ) : (
            <EmptyState message="Belum ada hasil permainan. Skor terbaru akan muncul di sini setelah kamu bermain." />
          )}
        </section>

        {/* ── Recommended games ────────────────────────────── */}
        <section aria-labelledby="recommended-heading" className="mt-8 pb-8">
          <SectionHeader
            eyebrow="Picked for you"
            title="Recommended Games"
            suffix="Based on play history"
            eyebrowColor="text-[#ef8b72]/70"
          />
          <h2 id="recommended-heading" className="sr-only">Recommended Games</h2>
          {recommendedGames.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {recommendedGames.map((game) => (
                <GameCard key={game.id} game={game} variant="recommended" />
              ))}
            </div>
          ) : (
            <div className="relative overflow-hidden border border-dashed border-white/12 p-8 text-center">
              <Sparkles className="mx-auto mb-3 size-7 text-white/20" aria-hidden="true" />
              <p className="text-sm text-white/35">
                Belum ada game aktif. Rekomendasi akan muncul setelah game tersedia.
              </p>
            </div>
          )}
        </section>

      </div>
    </DashboardLayout>
  )
}
