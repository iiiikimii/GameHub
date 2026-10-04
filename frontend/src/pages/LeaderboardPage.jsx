import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Loader2,
  RefreshCw,
  Search,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { getGames } from '../services/gameService.js'
import { getGameLeaderboard, getLeaderboard } from '../services/leaderboardService.js'

// ─── Constants ──────────────────────────────────────────────

const MEDAL = {
  1: { emoji: '🥇', label: 'gold',   text: 'text-[#FFD700]', bg: 'bg-[#FFD700]/12 border-[#FFD700]/25' },
  2: { emoji: '🥈', label: 'silver', text: 'text-[#C0C0C0]', bg: 'bg-[#C0C0C0]/10 border-[#C0C0C0]/20' },
  3: { emoji: '🥉', label: 'bronze', text: 'text-[#CD7F32]', bg: 'bg-[#CD7F32]/10 border-[#CD7F32]/20' },
}

const CATEGORY_META = {
  Reflex: { icon: Zap,      color: 'text-[#c8f169]', bg: 'bg-[#c8f169]/10' },
  Puzzle: { icon: Grid2X2,  color: 'text-[#8fd2dd]', bg: 'bg-[#8fd2dd]/10' },
  Memory: { icon: Brain,    color: 'text-[#ef8b72]', bg: 'bg-[#ef8b72]/10' },
}

// ─── Rank badge ──────────────────────────────────────────────

function RankBadge({ rank }) {
  const medal = MEDAL[rank]
  if (medal) {
    return (
      <span
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full border text-base font-bold ${medal.bg}`}
        aria-label={`Rank ${rank} — ${medal.label}`}
      >
        {medal.emoji}
      </span>
    )
  }
  return (
    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-sm font-semibold text-white/45">
      {rank}
    </span>
  )
}

// ─── Avatar initials ─────────────────────────────────────────

function Avatar({ username, size = 'md' }) {
  const initials = (username ?? '?').slice(0, 2).toUpperCase()
  const sizeClass = size === 'lg' ? 'size-11 text-sm' : 'size-9 text-xs'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#c8f169]/12 font-bold text-[#c8f169] ${sizeClass}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

// ─── Skeleton rows ───────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-4">
      <div className="skeleton size-9 rounded-full" />
      <div className="skeleton size-9 rounded-full" />
      <div className="skeleton h-3 w-28 rounded" />
      <div className="skeleton ml-auto h-4 w-20 rounded" />
    </div>
  )
}

// ─── Leaderboard entry row ───────────────────────────────────

function LeaderboardRow({ entry, isCurrentUser, index }) {
  const medal = MEDAL[entry.rank]
  const isTop3 = entry.rank <= 3

  return (
    <div
      className={`group flex items-center gap-4 border-b border-white/[0.06] px-4 py-3.5 transition duration-150 sm:px-6
        ${isCurrentUser
          ? 'bg-[#c8f169]/[0.04] border-l-2 border-l-[#c8f169]/40'
          : 'hover:bg-white/[0.02]'
        }
        ${isTop3 ? 'py-4' : ''}
      `}
      aria-current={isCurrentUser ? 'true' : undefined}
    >
      {/* Rank */}
      <div className="w-10 shrink-0 flex justify-center">
        <RankBadge rank={entry.rank} />
      </div>

      {/* Avatar */}
      <Avatar username={entry.username} size={isTop3 ? 'lg' : 'md'} />

      {/* Username */}
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold leading-none ${
          isCurrentUser
            ? 'text-[#c8f169]'
            : isTop3
            ? 'text-[#f4f4ed] text-[15px]'
            : 'text-[#f4f4ed]/85 text-sm'
        }`}>
          {entry.username}
          {isCurrentUser && (
            <span className="ml-2 inline-flex items-center rounded-full bg-[#c8f169]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#c8f169]">
              You
            </span>
          )}
        </p>
        {isTop3 && medal && (
          <p className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wider ${medal.text}`}>
            {medal.label}
          </p>
        )}
      </div>

      {/* Score */}
      <div className="shrink-0 text-right">
        <p className={`tabular-nums font-semibold ${
          isCurrentUser ? 'text-[#c8f169]' : isTop3 ? 'text-white text-lg' : 'text-white/75 text-sm'
        }`}>
          {entry.totalScore.toLocaleString('id-ID')}
        </p>
        <p className="text-[10px] text-white/25">pts</p>
      </div>
    </div>
  )
}

// ─── Current user sticky banner ──────────────────────────────

function CurrentUserBanner({ entry, label }) {
  if (!entry || entry.totalScore === 0) return null
  return (
    <div className="flex items-center gap-4 border border-[#c8f169]/20 bg-[#c8f169]/[0.04] px-4 py-3.5 sm:px-6">
      <div className="w-10 shrink-0 flex justify-center">
        <RankBadge rank={entry.rank ?? '—'} />
      </div>
      <Avatar username={entry.username} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#c8f169]">
          {entry.username}
          <span className="ml-2 inline-flex items-center rounded-full bg-[#c8f169]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#c8f169]">
            You
          </span>
        </p>
        <p className="mt-0.5 text-[10px] text-white/35">{label}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="tabular-nums text-sm font-semibold text-[#c8f169]">
          {entry.totalScore.toLocaleString('id-ID')}
        </p>
        <p className="text-[10px] text-white/25">pts</p>
      </div>
    </div>
  )
}

// ─── Pagination ──────────────────────────────────────────────

function Pagination({ pagination, onPageChange }) {
  const { page, totalPages, hasPrev, hasNext, total } = pagination
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-white/[0.08] px-5 py-4 text-sm sm:px-6">
      <p className="text-xs text-white/35">
        {total.toLocaleString('id-ID')} players
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          aria-label="Previous page"
          className="inline-flex size-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/45 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>

        <span className="min-w-[5rem] text-center text-xs text-white/50">
          {page} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          aria-label="Next page"
          className="inline-flex size-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/45 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────

export default function LeaderboardPage() {
  const { user } = useAuth()

  // Tabs: null = global, number = gameId
  const [activeTab, setActiveTab] = useState(null)
  const [games, setGames] = useState([])

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  // Load game list for tabs
  useEffect(() => {
    getGames()
      .then((g) => setGames(g.filter((game) => game.is_active)))
      .catch(() => {})
  }, [])

  // Fetch leaderboard when tab / page / search changes
  const fetchLeaderboard = useCallback(() => {
    setLoading(true)
    setError('')
    setData(null)

    const fetcher = activeTab === null
      ? getLeaderboard({ page, search })
      : getGameLeaderboard(activeTab, { page, search })

    fetcher
      .then(setData)
      .catch((err) => setError(err.response?.data?.message ?? 'Gagal memuat leaderboard.'))
      .finally(() => setLoading(false))
  }, [activeTab, page, search])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Debounce search input → search state
  function handleSearchChange(e) {
    const val = e.target.value
    setSearchInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(val.trim())
      setPage(1)
    }, 380)
  }

  function clearSearch() {
    setSearchInput('')
    setSearch('')
    setPage(1)
    searchRef.current?.focus()
  }

  function handleTabChange(gameId) {
    setActiveTab(gameId)
    setPage(1)
    setSearch('')
    setSearchInput('')
  }

  function handlePageChange(newPage) {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isCurrentUserOnPage = data?.entries?.some((e) => e.id === user?.id)

  return (
    <DashboardLayout>
      {/* ── Page header ── */}
      <header className="animate-rise">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#c8f169]">
          Global rankings
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">Leaderboard</h1>
            <p className="mt-1.5 text-sm text-white/45">
              Top players ranked by total score accumulated across all games.
            </p>
          </div>
          {/* Trophy icon accent */}
          <span className="hidden shrink-0 items-center justify-center rounded-2xl bg-[#c8f169]/10 p-4 sm:flex">
            <Trophy className="size-7 text-[#c8f169]" aria-hidden="true" />
          </span>
        </div>
      </header>

      <div className="mt-7 animate-rise-delayed">
        {/* ── Game filter tabs ── */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {/* Global tab */}
          <TabButton
            active={activeTab === null}
            onClick={() => handleTabChange(null)}
          >
            <Trophy className="size-3.5" aria-hidden="true" />
            Global
          </TabButton>

          {/* Per-game tabs */}
          {games.map((game) => {
            const meta = CATEGORY_META[game.category] ?? CATEGORY_META.Puzzle
            const Icon = meta.icon
            return (
              <TabButton
                key={game.id}
                active={activeTab === game.id}
                onClick={() => handleTabChange(game.id)}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {game.name}
              </TabButton>
            )
          })}
        </div>

        {/* ── Search box ── */}
        <div className="relative mb-5 max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search player…"
            aria-label="Search player"
            className="h-10 w-full rounded-lg border border-white/[0.08] bg-[#171b19] pl-10 pr-9 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#c8f169]/40 focus:ring-1 focus:ring-[#c8f169]/20"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white/70"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* ── Game label ── */}
        {data?.gameName && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/35">
            {data.gameName} — best score per player
          </p>
        )}

        {/* ── Table container ── */}
        <div className="overflow-hidden border border-white/[0.08] bg-[#0f1311]">

          {/* Column headers */}
          <div className="flex items-center gap-4 border-b border-white/[0.08] bg-[#171b19] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/30 sm:px-6">
            <div className="w-10 shrink-0 text-center">Rank</div>
            <div className="size-9 shrink-0" />
            <div className="flex-1">Player</div>
            <div className="shrink-0 text-right">Score</div>
          </div>

          {/* Loading */}
          {loading && (
            <div aria-live="polite" aria-label="Loading leaderboard">
              {[...Array(10)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="px-6 py-12 text-center" role="alert">
              <p className="text-sm text-[#ef8b72]">{error}</p>
              <button
                onClick={fetchLeaderboard}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/60 transition hover:text-white"
              >
                <RefreshCw className="size-4" /> Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && data?.entries?.length === 0 && (
            <div className="px-6 py-14 text-center">
              <Trophy className="mx-auto mb-3 size-8 text-white/15" aria-hidden="true" />
              <p className="text-sm text-white/35">
                {search ? `No players found matching "${search}"` : 'No scores recorded yet. Be the first!'}
              </p>
            </div>
          )}

          {/* Entries */}
          {!loading && !error && data?.entries?.length > 0 && (
            <div>
              {data.entries.map((entry, idx) => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  isCurrentUser={entry.id === user?.id}
                  index={idx}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && data?.pagination && (
            <Pagination pagination={data.pagination} onPageChange={handlePageChange} />
          )}
        </div>

        {/* ── Sticky current-user banner (shown when user not on current page) ── */}
        {!loading && !error && data?.currentUser && !isCurrentUserOnPage && (
          <div className="mt-3">
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/25">
              Your position
            </p>
            <CurrentUserBanner
              entry={data.currentUser}
              label={activeTab === null ? 'Your global rank' : `Your rank in ${data.gameName}`}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// ─── Tab button ──────────────────────────────────────────────

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition duration-150 whitespace-nowrap
        ${active
          ? 'border-[#c8f169]/35 bg-[#c8f169]/10 text-[#c8f169]'
          : 'border-white/[0.08] bg-transparent text-white/45 hover:border-white/15 hover:text-white/70'
        }`}
    >
      {children}
    </button>
  )
}
