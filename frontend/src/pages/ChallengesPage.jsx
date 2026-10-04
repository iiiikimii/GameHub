import {
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gift,
  Grid2X2,
  Loader2,
  RefreshCw,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { completeChallenge, getChallenges } from '../services/challengeService.js'

// ─── Constants ───────────────────────────────────────────────

const CATEGORY_META = {
  Reflex: { icon: Zap,      color: 'text-[#c8f169]', bg: 'bg-[#c8f169]/10', bar: 'bg-[#c8f169]' },
  Puzzle: { icon: Grid2X2,  color: 'text-[#8fd2dd]', bg: 'bg-[#8fd2dd]/10', bar: 'bg-[#8fd2dd]' },
  Memory: { icon: Brain,    color: 'text-[#ef8b72]', bg: 'bg-[#ef8b72]/10', bar: 'bg-[#ef8b72]' },
  default:{ icon: Swords,   color: 'text-[#c8f169]', bg: 'bg-[#c8f169]/10', bar: 'bg-[#c8f169]' },
}

const STATUS_META = {
  active:    { label: 'Active',     pill: 'bg-[#c8f169]/10 text-[#c8f169] border-[#c8f169]/20' },
  completed: { label: 'Completed',  pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  expired:   { label: 'Expired',    pill: 'bg-white/5 text-white/30 border-white/10' },
  upcoming:  { label: 'Upcoming',   pill: 'bg-[#8fd2dd]/10 text-[#8fd2dd] border-[#8fd2dd]/20' },
}

// ─── Celebrate toast ─────────────────────────────────────────

function CelebrationToast({ result, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-72 animate-rise"
      role="alert"
      aria-live="assertive"
    >
      <div className="overflow-hidden border border-[#c8f169]/30 bg-[#171b19] shadow-2xl shadow-black/60">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#c8f169] to-[#8fd2dd]" />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#c8f169]/15 text-xl">
              🎉
            </span>
            <div>
              <p className="font-bold text-[#c8f169]">Challenge Complete!</p>
              <p className="mt-0.5 text-sm text-white/65">{result.title}</p>
            </div>
          </div>

          {result.rewardPoints > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#c8f169]/8 px-4 py-3">
              <Gift className="size-4 text-[#c8f169]" aria-hidden="true" />
              <p className="font-semibold text-[#c8f169]">+{result.rewardPoints.toLocaleString('id-ID')} pts</p>
              {result.newTotalScore != null && (
                <p className="ml-auto text-xs text-white/35">
                  Total: {result.newTotalScore.toLocaleString('id-ID')}
                </p>
              )}
            </div>
          )}

          <button
            onClick={onDismiss}
            className="mt-3 w-full rounded-full border border-white/10 py-2 text-xs text-white/40 transition hover:text-white/70"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Animated progress bar ────────────────────────────────────

function ChallengeProgressBar({ percent, barClass }) {
  const ref = useRef(null)
  useEffect(() => {
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.width = `${percent}%`
    })
  }, [percent])

  return (
    <div className="mt-4">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          ref={ref}
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${barClass}`}
          style={{ width: '0%' }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}

// ─── Time remaining helper ────────────────────────────────────

function timeRemaining(endDate) {
  const diff = new Date(endDate).getTime() - Date.now()
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(h / 24)
  if (d >= 2) return `${d} days left`
  if (d === 1) return '1 day left'
  if (h >= 1) return `${h}h left`
  return 'Ending soon'
}

// ─── Challenge card ───────────────────────────────────────────

function ChallengeCard({ challenge, onComplete }) {
  const [completing, setCompleting] = useState(false)
  const [err, setErr] = useState('')

  const meta = CATEGORY_META[challenge.game?.category] ?? CATEGORY_META.default
  const Icon = meta.icon
  const statusMeta = STATUS_META[challenge.status] ?? STATUS_META.upcoming
  const timeLeft = challenge.status === 'active' ? timeRemaining(challenge.endDate) : null
  const isCompleted = challenge.status === 'completed'
  const isExpired = challenge.status === 'expired'
  const isActive = challenge.status === 'active'

  async function handleComplete() {
    setErr('')
    setCompleting(true)
    try {
      const result = await completeChallenge(challenge.id)
      onComplete(result)
    } catch (e) {
      setErr(e.response?.data?.message ?? 'Failed to complete challenge.')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <article
      className={`group relative overflow-hidden border transition duration-300
        ${isCompleted
          ? 'border-emerald-500/20 bg-[#101c12]'
          : isExpired
          ? 'border-white/[0.06] bg-[#111512] opacity-55'
          : 'border-white/[0.08] bg-[#171b19] hover:border-white/15 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-6px_rgba(200,241,105,0.12)]'
        }`}
    >
      {/* Top glow stripe for active */}
      {isActive && (
        <div className={`absolute inset-x-0 top-0 h-px ${meta.bar} opacity-60`} aria-hidden="true" />
      )}

      <div className="relative p-5 sm:p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${meta.bg}`}>
              {isCompleted
                ? <CheckCircle2 aria-hidden="true" className="size-5 text-emerald-400" />
                : <Icon aria-hidden="true" className={`size-5 ${meta.color}`} />
              }
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusMeta.pill}`}>
                  {statusMeta.label}
                </span>
                {challenge.game && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.bg} ${meta.color}`}>
                    {challenge.game.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Reward pill */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#c8f169]/8 px-2.5 py-1 text-xs font-semibold text-[#c8f169]">
              <Gift className="size-3" aria-hidden="true" />
              +{challenge.rewardPoints.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Title + description */}
        <h3 className="mt-4 text-lg font-semibold leading-snug">{challenge.title}</h3>
        <p className="mt-1 text-sm leading-6 text-white/45">{challenge.description}</p>

        {/* Progress section */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/45">
              {challenge.progress.toLocaleString('id-ID')}
              <span className="text-white/25"> / {challenge.targetScore.toLocaleString('id-ID')}</span>
            </span>
            <span className={`font-semibold tabular-nums ${meta.color}`}>
              {challenge.progressPercent}%
            </span>
          </div>

          {/* ASCII-style block progress bar */}
          <div className="mt-2 font-mono text-xs text-white/30 tracking-tight select-none" aria-hidden="true">
            {(() => {
              const filled = Math.round((challenge.progressPercent / 100) * 18)
              const empty = 18 - filled
              return '█'.repeat(filled) + '░'.repeat(empty)
            })()}
          </div>

          <ChallengeProgressBar percent={challenge.progressPercent} barClass={meta.bar} />
        </div>

        {/* Footer: dates + time remaining */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/30">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" aria-hidden="true" />
            {new Date(challenge.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </span>
          {timeLeft && (
            <span className="flex items-center gap-1 text-[#c8f169]/70">
              <Clock className="size-3" aria-hidden="true" />
              {timeLeft}
            </span>
          )}
          {challenge.completedAt && (
            <span className="flex items-center gap-1 text-emerald-400/70">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              Completed {new Date(challenge.completedAt).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short',
              })}
            </span>
          )}
        </div>

        {/* Error message */}
        {err && (
          <p className="mt-3 rounded border border-[#ef8b72]/20 bg-[#ef8b72]/5 px-3 py-2 text-xs text-[#ef8b72]">
            {err}
          </p>
        )}

        {/* Action row */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {isActive && !isCompleted && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50
                ${challenge.progressPercent >= 100
                  ? 'bg-[#c8f169] text-[#172015] hover:bg-[#d7fa91]'
                  : 'border border-white/10 text-white/50 hover:border-white/20 hover:text-white/80'
                }`}
            >
              {completing
                ? <Loader2 className="size-4 animate-spin" />
                : <Trophy className="size-4" />
              }
              {challenge.progressPercent >= 100 ? 'Claim Reward' : 'Verify Progress'}
            </button>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400">
              <CheckCircle2 className="size-4" /> Completed!
            </span>
          )}
          {challenge.game && !isExpired && (
            <Link
              to={`/games/${challenge.game.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-sm text-white/45 transition hover:border-white/20 hover:text-white/75"
            >
              <ExternalLink className="size-3.5" /> Play {challenge.game.name}
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

// ─── Skeleton card ────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="border border-white/[0.06] bg-[#171b19] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="skeleton size-11 rounded-xl" />
        <div className="flex-1">
          <div className="skeleton h-4 w-24 rounded" />
        </div>
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="skeleton mt-4 h-5 w-48 rounded" />
      <div className="skeleton mt-2 h-3 w-full rounded" />
      <div className="skeleton mt-1 h-3 w-4/5 rounded" />
      <div className="skeleton mt-5 h-2.5 w-full rounded-full" />
      <div className="skeleton mt-3 h-4 w-24 rounded" />
    </div>
  )
}

// ─── Filter tab ───────────────────────────────────────────────

function Tab({ active, onClick, children }) {
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

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('active')   // active | completed | expired | all
  const [toast, setToast] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const fetch = useCallback(() => {
    setLoading(true)
    setError('')
    getChallenges()
      .then(setChallenges)
      .catch((err) => setError(err.response?.data?.message ?? 'Gagal memuat challenges.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch, attempt])

  function handleComplete(result) {
    setToast(result)
    // Optimistically update status in list
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === result.challengeId
          ? { ...c, status: 'completed', completed: true, progressPercent: 100 }
          : c,
      ),
    )
  }

  const active    = challenges.filter((c) => c.status === 'active')
  const completed = challenges.filter((c) => c.status === 'completed')
  const expired   = challenges.filter((c) => c.status === 'expired')

  const displayed =
    filter === 'active'    ? active :
    filter === 'completed' ? completed :
    filter === 'expired'   ? expired :
    challenges

  return (
    <DashboardLayout>
      {/* Toast */}
      {toast && (
        <CelebrationToast result={toast} onDismiss={() => setToast(null)} />
      )}

      {/* Header */}
      <header className="animate-rise">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#c8f169]">
          Daily &amp; Weekly
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">Challenges</h1>
            <p className="mt-1.5 text-sm text-white/45">
              Complete challenges to earn bonus points and level up.
            </p>
          </div>
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/10 px-4 py-2.5 text-sm text-white/50 transition hover:border-white/20 hover:text-white/80 sm:self-auto"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
        </div>
      </header>

      {/* Summary bar */}
      {!loading && challenges.length > 0 && (
        <div className="animate-rise mt-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Active',    count: active.length,    color: 'text-[#c8f169]' },
            { label: 'Completed', count: completed.length, color: 'text-emerald-400' },
            { label: 'Expired',   count: expired.length,   color: 'text-white/30' },
          ].map(({ label, count, color }) => (
            <div key={label} className="border border-white/[0.08] bg-[#171b19] p-4 text-center">
              <p className={`text-2xl font-semibold ${color}`}>{count}</p>
              <p className="mt-0.5 text-[11px] text-white/35">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {!loading && challenges.length > 0 && (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 animate-rise-delayed">
          <Tab active={filter === 'active'}    onClick={() => setFilter('active')}>
            Active ({active.length})
          </Tab>
          <Tab active={filter === 'completed'} onClick={() => setFilter('completed')}>
            <CheckCircle2 className="size-3.5" /> Completed ({completed.length})
          </Tab>
          <Tab active={filter === 'expired'}   onClick={() => setFilter('expired')}>
            Expired ({expired.length})
          </Tab>
          <Tab active={filter === 'all'}       onClick={() => setFilter('all')}>
            All ({challenges.length})
          </Tab>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 animate-fade-in">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
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

      {/* Challenge cards */}
      {!loading && !error && displayed.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 animate-rise">
          {displayed.map((c) => (
            <ChallengeCard key={c.id} challenge={c} onComplete={handleComplete} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && displayed.length === 0 && (
        <div className="mt-10 border border-dashed border-white/10 p-14 text-center">
          <Swords className="mx-auto mb-3 size-8 text-white/15" aria-hidden="true" />
          <p className="text-sm text-white/35">
            {filter === 'active'    ? 'No active challenges right now. Check back later!' :
             filter === 'completed' ? 'No completed challenges yet. Start playing!' :
             filter === 'expired'   ? 'No expired challenges.' :
             'No challenges found.'}
          </p>
        </div>
      )}
    </DashboardLayout>
  )
}
