import { ArrowRight, Brain, Grid2X2, Loader2, RefreshCw, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getGames } from '../services/gameService.js'

const categoryMeta = {
  Reflex: {
    icon: Zap,
    color: 'text-[#c8f169]',
    bg: 'bg-[#c8f169]/10',
    border: 'border-[#c8f169]/20',
    glow: 'hover:shadow-[0_0_30px_-6px_rgba(200,241,105,0.25)]',
    badge: 'bg-[#c8f169]/10 text-[#c8f169]',
  },
  Puzzle: {
    icon: Grid2X2,
    color: 'text-[#8fd2dd]',
    bg: 'bg-[#8fd2dd]/10',
    border: 'border-[#8fd2dd]/20',
    glow: 'hover:shadow-[0_0_30px_-6px_rgba(143,210,221,0.25)]',
    badge: 'bg-[#8fd2dd]/10 text-[#8fd2dd]',
  },
  Memory: {
    icon: Brain,
    color: 'text-[#ef8b72]',
    bg: 'bg-[#ef8b72]/10',
    border: 'border-[#ef8b72]/20',
    glow: 'hover:shadow-[0_0_30px_-6px_rgba(239,139,114,0.25)]',
    badge: 'bg-[#ef8b72]/10 text-[#ef8b72]',
  },
}

const difficultyLabel = {
  EASY: { label: 'Easy', color: 'text-[#c8f169] bg-[#c8f169]/8' },
  MEDIUM: { label: 'Medium', color: 'text-[#8fd2dd] bg-[#8fd2dd]/8' },
  HARD: { label: 'Hard', color: 'text-[#ef8b72] bg-[#ef8b72]/8' },
}

function GameListCard({ game }) {
  const meta = categoryMeta[game.category] ?? categoryMeta.Puzzle
  const Icon = meta.icon
  const diff = difficultyLabel[game.difficulty] ?? { label: game.difficulty, color: 'text-white/50 bg-white/5' }

  return (
    <Link
      to={`/games/${game.slug}`}
      className={`group relative flex flex-col overflow-hidden border border-white/[0.08] bg-[#171b19] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-[#1c2120] ${meta.glow}`}
    >
      {/* Background glow blob */}
      <div
        className={`pointer-events-none absolute -right-6 -top-6 size-28 rounded-full opacity-20 blur-2xl transition duration-500 group-hover:opacity-35 ${meta.bg}`}
        aria-hidden="true"
      />

      {/* Icon + badges row */}
      <div className="relative flex items-start justify-between gap-4">
        <span className={`grid size-14 place-items-center rounded-2xl transition duration-300 group-hover:scale-105 ${meta.bg}`}>
          <Icon aria-hidden="true" className={`size-6 ${meta.color}`} />
        </span>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${diff.color}`}>
            {diff.label}
          </span>
          {!game.is_active && (
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-white/30">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="relative mt-5 flex-1">
        <p className={`text-[10px] font-semibold uppercase tracking-widest ${meta.color}`}>
          {game.category}
        </p>
        <h2 className="mt-1.5 text-xl font-semibold leading-snug">{game.name}</h2>
        <p className="mt-2 text-sm leading-6 text-white/45 line-clamp-2">
          {game.description ?? 'A fast-paced browser game. Play to earn points.'}
        </p>
      </div>

      {/* CTA */}
      <div className={`relative mt-5 flex items-center gap-2 text-sm font-semibold transition duration-200 ${meta.color}`}>
        Play now
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="border border-white/[0.08] bg-[#171b19] p-6">
      <div className="skeleton size-14 rounded-2xl" />
      <div className="skeleton mt-5 h-3 w-16 rounded" />
      <div className="skeleton mt-2 h-6 w-36 rounded" />
      <div className="skeleton mt-2 h-4 w-full rounded" />
      <div className="skeleton mt-1.5 h-4 w-3/4 rounded" />
      <div className="skeleton mt-5 h-4 w-20 rounded" />
    </div>
  )
}

export default function GamesPage() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    setLoading(true)
    setError('')

    getGames()
      .then((data) => { if (live) setGames(data) })
      .catch((err) => { if (live) setError(err.response?.data?.message ?? 'Gagal memuat daftar game.') })
      .finally(() => { if (live) setLoading(false) })

    return () => { live = false }
  }, [attempt])

  const activeGames = games.filter((g) => g.is_active)
  const inactiveGames = games.filter((g) => !g.is_active)

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="animate-rise">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#c8f169]">
          The Arcade
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Games</h1>
        <p className="mt-2 text-sm text-white/45">
          Play to earn points, complete challenges, and unlock achievements.
        </p>
      </header>

      {/* Content */}
      {loading && (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && error && (
        <section className="mt-10 max-w-md border border-[#ef8b72]/18 bg-[#ef8b72]/[0.04] p-7" role="alert">
          <p className="text-xs font-semibold uppercase text-[#ef8b72]">Error</p>
          <p className="mt-2 text-sm text-white/55">{error}</p>
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#c8f169] px-4 py-2.5 text-sm font-semibold text-[#172015] transition hover:bg-[#d7fa91]"
          >
            <RefreshCw className="size-4" /> Coba lagi
          </button>
        </section>
      )}

      {!loading && !error && (
        <div className="animate-rise mt-7">
          {activeGames.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeGames.map((game) => (
                  <GameListCard key={game.id} game={game} />
                ))}
              </div>

              {inactiveGames.length > 0 && (
                <div className="mt-10">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/25">
                    Coming soon
                  </p>
                  <div className="grid gap-4 opacity-40 sm:grid-cols-2 lg:grid-cols-3">
                    {inactiveGames.map((game) => (
                      <GameListCard key={game.id} game={game} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mt-10 border border-dashed border-white/12 p-12 text-center">
              <Loader2 className="mx-auto mb-4 size-8 text-white/20" />
              <p className="text-white/35">Belum ada game aktif saat ini.</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
