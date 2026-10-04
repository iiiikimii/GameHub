import {
  Award,
  Bolt,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  Gamepad2,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { checkAchievements, getMyAchievements } from '../services/achievementService.js'

// ─── Icon map (matches the `icon` field in DB) ────────────────

const ICON_MAP = {
  gamepad: Gamepad2,
  sparkles: Sparkles,
  bolt: Zap,
  trophy: Trophy,
  brain: Brain,
  calendar: Calendar,
  award: Award,
  star: Star,
  default: BookOpen,
}

function getIcon(iconName) {
  return ICON_MAP[iconName?.toLowerCase()] ?? ICON_MAP.default
}

// ─── Requirement type color & label ───────────────────────────

const TYPE_META = {
  games_played:       { color: 'text-[#8fd2dd]', bg: 'bg-[#8fd2dd]/10', label: 'Games Played' },
  total_score:        { color: 'text-[#c8f169]', bg: 'bg-[#c8f169]/10', label: 'Total Score' },
  reaction_time_ms:   { color: 'text-[#c8f169]', bg: 'bg-[#c8f169]/10', label: 'Reaction Speed' },
  memory_match_hard:  { color: 'text-[#ef8b72]', bg: 'bg-[#ef8b72]/10', label: 'Memory Match' },
  daily_player:       { color: 'text-[#8fd2dd]', bg: 'bg-[#8fd2dd]/10', label: 'Daily Player' },
  global_rank_top3:   { color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/10', label: 'Leaderboard' },
}

function getTypeMeta(type) {
  return TYPE_META[type] ?? { color: 'text-white/50', bg: 'bg-white/5', label: 'Achievement' }
}

// ─── Unlock notification toast ────────────────────────────────

function UnlockToast({ names, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  if (!names.length) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-50 animate-rise max-w-xs"
      role="alert"
      aria-live="assertive"
    >
      <div className="border border-[#c8f169]/30 bg-[#171b19] p-4 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#c8f169]/15 text-[#c8f169]">
            🏆
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#c8f169]">
              Achievement Unlocked!
            </p>
            {names.map((name) => (
              <p key={name} className="mt-0.5 text-sm font-semibold text-[#f4f4ed]">
                {name}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────

function AchievProgressBar({ progress, color }) {
  const barRef = useRef(null)
  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = `${progress.percent}%`
    }
  }, [progress.percent])

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between text-[10px]">
        <span className="text-white/35">{progress.label}</span>
        <span className={`font-semibold ${color}`}>{progress.percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          ref={barRef}
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: '0%', background: 'currentColor' }}
        />
      </div>
    </div>
  )
}

// ─── Achievement card ─────────────────────────────────────────

function AchievCard({ achievement }) {
  const { isUnlocked, name, description, icon, requirementType, progress, unlockedAt } = achievement
  const Icon = getIcon(icon)
  const meta = getTypeMeta(requirementType)

  return (
    <article
      className={`group relative overflow-hidden border transition duration-300
        ${isUnlocked
          ? `border-[#c8f169]/20 bg-[#171b19] hover:border-[#c8f169]/35 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-6px_rgba(200,241,105,0.2)]`
          : 'border-white/[0.06] bg-[#111512] opacity-60 hover:opacity-75'
        }`}
    >
      {/* Glow blob (unlocked only) */}
      {isUnlocked && (
        <div
          className="pointer-events-none absolute -right-5 -top-5 size-24 rounded-full bg-[#c8f169]/10 blur-2xl transition duration-500 group-hover:opacity-150"
          aria-hidden="true"
        />
      )}

      <div className="relative p-5">
        {/* Icon + lock indicator */}
        <div className="flex items-start justify-between gap-3">
          <span className={`grid size-12 shrink-0 place-items-center rounded-xl transition duration-300 group-hover:scale-105 ${isUnlocked ? meta.bg : 'bg-white/5'}`}>
            {isUnlocked ? (
              <Icon aria-hidden="true" className={`size-5 ${meta.color}`} />
            ) : (
              <Lock aria-hidden="true" className="size-5 text-white/20" />
            )}
          </span>

          {isUnlocked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#c8f169]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c8f169]">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              Unlocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/30">
              <Lock className="size-3" aria-hidden="true" />
              Locked
            </span>
          )}
        </div>

        {/* Category label */}
        <p className={`mt-4 text-[9px] font-bold uppercase tracking-widest ${isUnlocked ? meta.color : 'text-white/25'}`}>
          {meta.label}
        </p>

        {/* Name + description */}
        <h3 className="mt-1 font-semibold leading-tight">{name}</h3>
        <p className="mt-1.5 text-xs leading-5 text-white/45">{description}</p>

        {/* Progress bar (locked only, if available) */}
        {!isUnlocked && progress && (
          <div style={{ color: meta.color.replace('text-', '').replace('[', '').replace(']', '') }}>
            <AchievProgressBar progress={progress} color={meta.color} />
          </div>
        )}

        {/* Unlock date */}
        {isUnlocked && unlockedAt && (
          <p className="mt-3 text-[10px] text-white/25">
            Unlocked {new Date(unlockedAt).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
        )}
      </div>
    </article>
  )
}

// ─── Skeleton card ────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="border border-white/[0.06] bg-[#111512] p-5">
      <div className="flex items-start justify-between">
        <div className="skeleton size-12 rounded-xl" />
        <div className="skeleton h-5 w-20 rounded-full" />
      </div>
      <div className="skeleton mt-4 h-2 w-16 rounded" />
      <div className="skeleton mt-2 h-4 w-36 rounded" />
      <div className="skeleton mt-2 h-3 w-full rounded" />
      <div className="skeleton mt-1 h-3 w-3/4 rounded" />
    </div>
  )
}

// ─── Filter tabs ──────────────────────────────────────────────

function FilterTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition whitespace-nowrap
        ${active
          ? 'border-[#c8f169]/35 bg-[#c8f169]/10 text-[#c8f169]'
          : 'border-white/[0.08] text-white/40 hover:border-white/15 hover:text-white/70'
        }`}
    >
      {children}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [toastNames, setToastNames] = useState([])
  const [filter, setFilter] = useState('all')   // all | unlocked | locked
  const [attempt, setAttempt] = useState(0)

  const fetchAchievements = useCallback(() => {
    setLoading(true)
    setError('')
    getMyAchievements()
      .then(setAchievements)
      .catch((err) => setError(err.response?.data?.message ?? 'Gagal memuat achievements.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements, attempt])

  const handleCheck = useCallback(async () => {
    setChecking(true)
    try {
      const result = await checkAchievements()
      if (result.newlyUnlocked.length > 0) {
        setToastNames(result.newlyUnlocked)
        fetchAchievements()  // refresh list after new unlocks
      }
    } catch {
      // silent fail for check
    } finally {
      setChecking(false)
    }
  }, [fetchAchievements])

  // Stats
  const unlocked = achievements.filter((a) => a.isUnlocked)
  const locked = achievements.filter((a) => !a.isUnlocked)
  const percent = achievements.length > 0 ? Math.round((unlocked.length / achievements.length) * 100) : 0

  const displayed = filter === 'unlocked' ? unlocked : filter === 'locked' ? locked : achievements

  return (
    <DashboardLayout>
      {/* Toast */}
      {toastNames.length > 0 && (
        <UnlockToast names={toastNames} onDismiss={() => setToastNames([])} />
      )}

      {/* Header */}
      <header className="animate-rise">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#c8f169]">
          Milestones
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">Achievements</h1>
            <p className="mt-1.5 text-sm text-white/45">
              Complete challenges and milestones to earn achievements.
            </p>
          </div>
          <button
            onClick={handleCheck}
            disabled={checking || loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-white/55 transition hover:border-[#c8f169]/30 hover:text-[#c8f169] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {checking
              ? <Loader2 className="size-4 animate-spin" />
              : <RefreshCw className="size-4" />
            }
            Check for new
          </button>
        </div>
      </header>

      {/* Progress overview */}
      {!loading && achievements.length > 0 && (
        <div className="animate-rise mt-6 border border-white/[0.08] bg-[#171b19] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/45">Overall progress</p>
              <p className="mt-1 text-3xl font-semibold">
                <span className="text-[#c8f169]">{unlocked.length}</span>
                <span className="text-white/30">/{achievements.length}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-semibold text-[#c8f169]">{percent}%</p>
              <p className="text-xs text-white/30">Complete</p>
            </div>
          </div>
          {/* Master progress bar */}
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-[#c8f169] transition-[width] duration-1000 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          {/* Mini breakdown */}
          <div className="mt-3 flex gap-4 text-xs text-white/35">
            <span><span className="font-semibold text-[#c8f169]">{unlocked.length}</span> unlocked</span>
            <span><span className="font-semibold text-white/50">{locked.length}</span> remaining</span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {!loading && achievements.length > 0 && (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 animate-rise-delayed">
          <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>
            <Award className="size-3.5" /> All ({achievements.length})
          </FilterTab>
          <FilterTab active={filter === 'unlocked'} onClick={() => setFilter('unlocked')}>
            <CheckCircle2 className="size-3.5" /> Unlocked ({unlocked.length})
          </FilterTab>
          <FilterTab active={filter === 'locked'} onClick={() => setFilter('locked')}>
            <Lock className="size-3.5" /> Locked ({locked.length})
          </FilterTab>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <section className="mt-8 max-w-md border border-[#ef8b72]/18 bg-[#ef8b72]/[0.04] p-7" role="alert">
          <p className="text-xs font-semibold uppercase text-[#ef8b72]">Error</p>
          <p className="mt-2 text-sm text-white/55">{error}</p>
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#c8f169] px-4 py-2.5 text-sm font-semibold text-[#172015] transition hover:bg-[#d7fa91]"
          >
            <RefreshCw className="size-4" /> Coba lagi
          </button>
        </section>
      )}

      {/* Grid */}
      {!loading && !error && displayed.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-rise">
          {displayed.map((a) => <AchievCard key={a.id} achievement={a} />)}
        </div>
      )}

      {/* Empty filtered state */}
      {!loading && !error && achievements.length > 0 && displayed.length === 0 && (
        <div className="mt-10 border border-dashed border-white/10 p-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-8 text-white/15" />
          <p className="text-sm text-white/35">
            {filter === 'unlocked' ? 'No achievements unlocked yet. Start playing!' : 'All achievements unlocked! 🎉'}
          </p>
        </div>
      )}
    </DashboardLayout>
  )
}
