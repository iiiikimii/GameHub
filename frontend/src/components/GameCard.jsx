import { ArrowUpRight, Brain, Grid2X2, Zap, Play } from 'lucide-react'
import { Link } from 'react-router-dom'

const gameIcons = {
  Reflex: Zap,
  Puzzle: Grid2X2,
  Memory: Brain,
}

const gameTones = {
  Reflex: {
    icon: 'bg-[#c8f169]/12 text-[#c8f169]',
    badge: 'bg-[#c8f169]/10 text-[#c8f169]',
    glow: 'group-hover:border-[#c8f169]/20',
  },
  Puzzle: {
    icon: 'bg-[#8fd2dd]/12 text-[#8fd2dd]',
    badge: 'bg-[#8fd2dd]/10 text-[#8fd2dd]',
    glow: 'group-hover:border-[#8fd2dd]/20',
  },
  Memory: {
    icon: 'bg-[#ef8b72]/12 text-[#ef8b72]',
    badge: 'bg-[#ef8b72]/10 text-[#ef8b72]',
    glow: 'group-hover:border-[#ef8b72]/20',
  },
}

const difficultyColors = {
  Easy: 'text-[#c8f169] bg-[#c8f169]/8',
  Medium: 'text-[#8fd2dd] bg-[#8fd2dd]/8',
  Hard: 'text-[#ef8b72] bg-[#ef8b72]/8',
}

export default function GameCard({ game, variant = 'recommended' }) {
  const Icon = gameIcons[game.category] ?? Grid2X2
  const tone = gameTones[game.category] ?? gameTones.Puzzle
  const isRecent = variant === 'recent'
  const diffColor = difficultyColors[game.difficulty] ?? 'text-white/50 bg-white/5'

  return (
    <article
      className={`group relative min-w-0 overflow-hidden border border-white/[0.08] bg-[#171b19] p-4 transition duration-300 hover:-translate-y-0.5 hover:bg-[#1c2120] sm:p-5 ${tone.glow}`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <span className={`grid size-12 shrink-0 place-items-center rounded-xl transition duration-300 group-hover:scale-105 ${tone.icon}`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
            {isRecent ? 'Recent run' : game.category}
          </p>
          <h3 className="mt-0.5 truncate text-[15px] font-semibold leading-snug">{game.name}</h3>

          {isRecent ? (
            <p className="mt-1 text-xs text-white/45">
              <span className="font-medium text-white/70">{Number(game.score).toLocaleString('id-ID')}</span>
              {' '}pts · {Number(game.duration).toFixed(2)}s
            </p>
          ) : (
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${diffColor}`}>
                {game.difficulty}
              </span>
              <span className="text-xs text-white/35">{game.category}</span>
            </div>
          )}
        </div>

        {/* Action */}
        <Link
          to={`/games/${game.slug}`}
          aria-label={`${isRecent ? 'Lihat hasil' : 'Main'} ${game.name}`}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/45 transition duration-200 hover:border-[#c8f169]/40 hover:bg-[#c8f169]/5 hover:text-[#c8f169]"
        >
          {isRecent ? <ArrowUpRight className="size-4" /> : <Play className="size-3.5 translate-x-[1px]" />}
        </Link>
      </div>

      {/* Description (recommended only) */}
      {!isRecent && game.description && (
        <p className="mt-4 line-clamp-2 text-sm leading-5 text-white/42">{game.description}</p>
      )}

      {/* Date (recent only) */}
      {isRecent && (
        <p className="mt-3 text-[11px] text-white/30">
          {new Date(game.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
    </article>
  )
}
