import {
  Brain,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gamepad2,
  Grid2X2,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getHistory } from '../services/profileService.js'

// ─── Constants ────────────────────────────────────────────────

const CATEGORY_META = {
  Reflex: { icon: Zap,      color: 'text-[#c8f169]', bg: 'bg-[#c8f169]/10' },
  Puzzle: { icon: Grid2X2,  color: 'text-[#8fd2dd]', bg: 'bg-[#8fd2dd]/10' },
  Memory: { icon: Brain,    color: 'text-[#ef8b72]', bg: 'bg-[#ef8b72]/10' },
}

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc',  label: 'Oldest first' },
  { value: 'score_desc', label: 'Highest score' },
  { value: 'score_asc',  label: 'Lowest score' },
]

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

// ─── Skeleton row ─────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-white/[0.05] px-5 py-4">
      <div className="skeleton size-9 rounded-lg" />
      <div className="flex-1">
        <div className="skeleton h-3.5 w-28 rounded" />
        <div className="skeleton mt-1.5 h-2.5 w-20 rounded" />
      </div>
      <div className="skeleton h-4 w-16 rounded" />
      <div className="skeleton h-3 w-12 rounded" />
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  )
}

// ─── History entry row ────────────────────────────────────────

function HistoryRow({ entry }) {
  const meta = CATEGORY_META[entry.game.category] ?? { icon: Gamepad2, color: 'text-white/45', bg: 'bg-white/5' }
  const Icon = meta.icon
  return (
    <div className="group flex flex-col gap-2 border-b border-white/[0.05] px-4 py-4 transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      {/* Game icon */}
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${meta.bg}`}>
        <Icon aria-hidden="true" className={`size-4 ${meta.color}`} />
      </span>

      {/* Game name + difficulty */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{entry.game.name}</p>
        <p className="text-[11px] text-white/30">{entry.game.difficulty}</p>
      </div>

      {/* Score */}
      <div className="shrink-0 text-right sm:w-28">
        <p className="flex items-center justify-end gap-1 text-sm font-semibold tabular-nums">
          <Trophy aria-hidden="true" className="size-3.5 text-[#c8f169]" />
          {entry.score.toLocaleString('id-ID')}
        </p>
        <p className="text-[10px] text-white/25">pts</p>
      </div>

      {/* Duration */}
      <div className="shrink-0 text-right sm:w-20">
        <p className="flex items-center justify-end gap-1 text-sm text-white/55">
          <Clock aria-hidden="true" className="size-3.5 text-white/25" />
          {formatDuration(entry.duration)}
        </p>
      </div>

      {/* Date */}
      <div className="shrink-0 text-right sm:w-28">
        <p className="flex items-center justify-end gap-1 text-[11px] text-white/35">
          <Calendar aria-hidden="true" className="size-3 text-white/20" />
          {new Date(entry.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </p>
        <p className="text-[10px] text-white/20">
          {new Date(entry.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────

function Pagination({ pagination, onPageChange }) {
  const { page, totalPages, hasPrev, hasNext, total } = pagination
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-white/[0.08] px-5 py-4 text-sm">
      <p className="text-xs text-white/30">{total.toLocaleString('id-ID')} entries</p>
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={!hasPrev} aria-label="Prev"
          className="inline-flex size-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/40 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-[5rem] text-center text-xs text-white/40">{page} / {totalPages}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={!hasNext} aria-label="Next"
          className="inline-flex size-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/40 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Filter panel ─────────────────────────────────────────────

function FilterPanel({ filters, games, onChange, onReset }) {
  const hasActive = filters.gameSlug || filters.sort !== 'date_desc'
    || filters.minScore || filters.maxScore || filters.dateFrom || filters.dateTo

  return (
    <aside className="border border-white/[0.08] bg-[#171b19] p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40">
          <SlidersHorizontal className="size-3.5" /> Filters
        </p>
        {hasActive && (
          <button onClick={onReset} className="flex items-center gap-1 text-[10px] font-semibold text-[#ef8b72]/70 transition hover:text-[#ef8b72]">
            <X className="size-3" /> Reset
          </button>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {/* Sort */}
        <div>
          <label htmlFor="filter-sort" className="mb-1.5 block text-xs font-medium text-white/40">Sort by</label>
          <select
            id="filter-sort"
            value={filters.sort}
            onChange={(e) => onChange('sort', e.target.value)}
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#111512] px-3 text-sm text-white outline-none focus:border-[#c8f169]/40"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Game filter */}
        <div>
          <label htmlFor="filter-game" className="mb-1.5 block text-xs font-medium text-white/40">Game</label>
          <select
            id="filter-game"
            value={filters.gameSlug}
            onChange={(e) => onChange('gameSlug', e.target.value)}
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#111512] px-3 text-sm text-white outline-none focus:border-[#c8f169]/40"
          >
            <option value="">All games</option>
            {games.map((g) => (
              <option key={g.slug} value={g.slug}>{g.name} ({g.playCount}x)</option>
            ))}
          </select>
        </div>

        {/* Score range */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-white/40">Score range</p>
          <div className="flex gap-2">
            <input type="number" placeholder="Min" value={filters.minScore}
              onChange={(e) => onChange('minScore', e.target.value || null)}
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#111512] px-3 text-sm text-white outline-none focus:border-[#c8f169]/40 placeholder-white/20" />
            <input type="number" placeholder="Max" value={filters.maxScore}
              onChange={(e) => onChange('maxScore', e.target.value || null)}
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#111512] px-3 text-sm text-white outline-none focus:border-[#c8f169]/40 placeholder-white/20" />
          </div>
        </div>

        {/* Date range */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-white/40">Date range</p>
          <div className="flex flex-col gap-2">
            <input type="date" value={filters.dateFrom}
              onChange={(e) => onChange('dateFrom', e.target.value || null)}
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#111512] px-3 text-sm text-white/70 outline-none focus:border-[#c8f169]/40 [color-scheme:dark]" />
            <input type="date" value={filters.dateTo}
              onChange={(e) => onChange('dateTo', e.target.value || null)}
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#111512] px-3 text-sm text-white/70 outline-none focus:border-[#c8f169]/40 [color-scheme:dark]" />
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Main page ────────────────────────────────────────────────

const DEFAULT_FILTERS = {
  sort: 'date_desc',
  gameSlug: '',
  minScore: '',
  maxScore: '',
  dateFrom: '',
  dateTo: '',
}

export default function HistoryPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const debounceRef = useRef(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError('')
    getHistory({ page, ...filters })
      .then(setData)
      .catch((err) => setError(err.response?.data?.message ?? 'Gagal memuat history.'))
      .finally(() => setLoading(false))
  }, [page, filters])

  useEffect(() => { fetchData() }, [fetchData])

  function handleFilterChange(key, value) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      setFilters((prev) => ({ ...prev, [key]: value }))
    }, 350)
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function handlePageChange(p) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <DashboardLayout>
      <header className="animate-rise">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#c8f169]">Game Sessions</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">History</h1>
            <p className="mt-1.5 text-sm text-white/45">All your game sessions, fully filterable.</p>
          </div>
          <button onClick={fetchData} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-white/50 transition hover:border-white/20 hover:text-white/80">
            <RefreshCw className="size-4" /> Refresh
          </button>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-4 animate-rise-delayed lg:flex-row">
        {/* Filter sidebar */}
        <div className="w-full shrink-0 lg:w-60">
          <FilterPanel
            filters={filters}
            games={data?.gameStats ?? []}
            onChange={handleFilterChange}
            onReset={handleReset}
          />
        </div>

        {/* Table */}
        <div className="min-w-0 flex-1">
          {/* Column headers */}
          <div className="hidden border border-b-0 border-white/[0.08] bg-[#171b19] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/25 sm:flex sm:items-center sm:gap-4">
            <div className="size-9 shrink-0" />
            <div className="flex-1">Game</div>
            <div className="w-28 text-right">Score</div>
            <div className="w-20 text-right">Duration</div>
            <div className="w-28 text-right">Date</div>
          </div>

          <div className="border border-white/[0.08] bg-[#0f1311]">
            {loading && (
              <div aria-live="polite" aria-label="Loading history">
                {[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            )}

            {!loading && error && (
              <div className="px-6 py-12 text-center" role="alert">
                <p className="text-sm text-[#ef8b72]">{error}</p>
                <button onClick={fetchData} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/55 transition hover:text-white">
                  <RefreshCw className="size-4" /> Retry
                </button>
              </div>
            )}

            {!loading && !error && data?.entries?.length === 0 && (
              <div className="px-6 py-14 text-center">
                <Gamepad2 className="mx-auto mb-3 size-8 text-white/15" />
                <p className="text-sm text-white/35">No game sessions found for the selected filters.</p>
              </div>
            )}

            {!loading && !error && data?.entries?.length > 0 && (
              data.entries.map((entry) => <HistoryRow key={entry.id} entry={entry} />)
            )}

            {!loading && !error && data?.pagination && (
              <Pagination pagination={data.pagination} onPageChange={handlePageChange} />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
