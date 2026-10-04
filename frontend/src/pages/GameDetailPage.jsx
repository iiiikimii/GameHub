import { ArrowLeft, Brain, Grid2X2, Loader2, RefreshCw, Zap } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getGameBySlug } from '../services/gameService.js'

// Lazy-load game components — each game is its own code chunk
const gameComponents = {
  'reaction-test': lazy(() => import('../games/ReactionTest/ReactionTest.jsx')),
  'number-rush': lazy(() => import('../games/NumberRush/NumberRush.jsx')),
  'memory-match': lazy(() => import('../games/MemoryMatch/MemoryMatch.jsx')),
}

const categoryMeta = {
  Reflex: { icon: Zap, color: 'text-[#c8f169]', bg: 'bg-[#c8f169]/10' },
  Puzzle: { icon: Grid2X2, color: 'text-[#8fd2dd]', bg: 'bg-[#8fd2dd]/10' },
  Memory: { icon: Brain, color: 'text-[#ef8b72]', bg: 'bg-[#ef8b72]/10' },
}

const difficultyLabel = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
}

function GameLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="size-8 animate-spin text-[#c8f169]" />
    </div>
  )
}

export default function GameDetailPage() {
  const { slug } = useParams()
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setLoading(true)
    setError('')
    setGame(null)

    getGameBySlug(slug)
      .then((data) => { if (live) setGame(data) })
      .catch((err) => {
        if (live) setError(err.response?.data?.message ?? 'Game tidak ditemukan.')
      })
      .finally(() => { if (live) setLoading(false) })

    return () => { live = false }
  }, [slug])

  const GameComponent = gameComponents[slug] ?? null
  const meta = game ? (categoryMeta[game.category] ?? categoryMeta.Puzzle) : null
  const MetaIcon = meta?.icon ?? Zap

  return (
    <DashboardLayout>
      {/* Loading state */}
      {loading && (
        <div className="flex min-h-[40vh] items-center justify-center animate-fade-in">
          <Loader2 className="size-8 animate-spin text-[#c8f169]" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <section className="mx-auto mt-10 max-w-md border border-[#ef8b72]/18 bg-[#ef8b72]/[0.04] p-8 text-center" role="alert">
          <p className="text-xs font-semibold uppercase text-[#ef8b72]">Error</p>
          <p className="mt-2 text-lg font-semibold">Game tidak ditemukan</p>
          <p className="mt-1 text-sm text-white/50">{error}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 transition hover:text-white"
            >
              <RefreshCw className="size-4" /> Refresh
            </button>
            <Link
              to="/games"
              className="inline-flex items-center gap-2 rounded-full bg-[#c8f169] px-5 py-2.5 text-sm font-semibold text-[#172015] transition hover:bg-[#d7fa91]"
            >
              <ArrowLeft className="size-4" /> Back to Games
            </Link>
          </div>
        </section>
      )}

      {/* Game found but no component (future game) */}
      {!loading && game && !GameComponent && (
        <div className="mx-auto mt-10 max-w-md border border-white/[0.08] bg-[#171b19] p-8 text-center">
          <span className={`inline-grid size-16 place-items-center rounded-2xl ${meta.bg}`}>
            <MetaIcon className={`size-7 ${meta.color}`} />
          </span>
          <h1 className="mt-5 text-2xl font-semibold">{game.name}</h1>
          <p className="mt-2 text-sm text-white/45">{game.description}</p>
          <p className="mt-4 text-sm text-white/30">This game is not yet playable. Check back later!</p>
          <Link
            to="/games"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="size-4" /> Back to Games
          </Link>
        </div>
      )}

      {/* Game loaded and component available */}
      {!loading && game && GameComponent && (
        <div className="animate-rise">
          {/* Game header */}
          <div className="mb-6 flex items-start gap-4">
            <Link
              to="/games"
              className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-white/45 transition hover:bg-white/5 hover:text-white/80"
              aria-label="Back to games"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="flex items-center gap-4 min-w-0">
              <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${meta.bg}`}>
                <MetaIcon aria-hidden="true" className={`size-5 ${meta.color}`} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-semibold leading-tight">{game.name}</h1>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${meta.bg} ${meta.color}`}>
                    {game.category}
                  </span>
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] text-white/40">
                    {difficultyLabel[game.difficulty] ?? game.difficulty}
                  </span>
                </div>
                {game.description && (
                  <p className="mt-0.5 text-sm text-white/40 truncate">{game.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Game area */}
          <div className="border border-white/[0.08] bg-[#0f1311]">
            <Suspense fallback={<GameLoader />}>
              <GameComponent />
            </Suspense>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
