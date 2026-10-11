import { ArrowUpRight, Brain, Grid2X2, Zap, Play } from 'lucide-react'
import { Link } from 'react-router-dom'

const gameIcons = {
  Reflex: Zap,
  Puzzle: Grid2X2,
  Memory: Brain,
}

const gameTones = {
  Reflex: {
    icon: 'bg-[#8b8bff]/12 text-[#8b8bff]',
    badge: 'bg-[#8b8bff]/10 text-[#8b8bff]',
  },
  Puzzle: {
    icon: 'bg-[#7dd3fc]/12 text-[#7dd3fc]',
    badge: 'bg-[#7dd3fc]/10 text-[#7dd3fc]',
  },
  Memory: {
    icon: 'bg-[#ef8b72]/12 text-[#ef8b72]',
    badge: 'bg-[#ef8b72]/10 text-[#ef8b72]',
  },
}

const difficultyColors = {
  Easy: 'text-[#8b8bff] bg-[#8b8bff]/10 border border-[#8b8bff]/20',
  Medium: 'text-[#7dd3fc] bg-[#7dd3fc]/10 border border-[#7dd3fc]/20',
  Hard: 'text-[#ef8b72] bg-[#ef8b72]/10 border border-[#ef8b72]/20',
}

export default function GameCard({ game, variant = 'recommended' }) {
  const Icon = gameIcons[game.category] ?? Grid2X2
  const tone = gameTones[game.category] ?? gameTones.Puzzle
  const isRecent = variant === 'recent'
  const diffColor = difficultyColors[game.difficulty] ?? 'text-white/50 bg-white/5 border border-white/10'

  return (
    <article
      className="group relative min-w-0 overflow-hidden rounded-xl glass-card p-4 sm:p-5"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <span className={`grid size-12 shrink-0 place-items-center rounded-lg ${tone.icon}`}>
          <Icon aria-hidden="true" className="size-6" />
        </span>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            {isRecent ? 'Recent run' : game.category}
          </p>
          <h3 className="heading-gradient mt-1 truncate text-lg font-bold leading-snug">{game.name}</h3>

          {isRecent ? (
            <p className="mt-1.5 text-xs text-white/50">
              <span className="font-bold text-white">{Number(game.score).toLocaleString('id-ID')}</span>
              {' '}pts · {Number(game.duration).toFixed(2)}s
            </p>
          ) : (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${diffColor}`}>
                {game.difficulty}
              </span>
            </div>
          )}
        </div>

        {/* Action */}
        <Link
          to={`/games/${game.slug}`}
          aria-label={`${isRecent ? 'Lihat hasil' : 'Main'} ${game.name}`}
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-[#8b8bff]/40 hover:bg-[#8b8bff] hover:text-[#172015]"
        >
          {isRecent ? <ArrowUpRight className="size-4" /> : <Play className="size-4 translate-x-[1px]" />}
        </Link>
      </div>

      {/* Description (recommended only) */}
      {!isRecent && game.description && (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-white/50">{game.description}</p>
      )}

      {/* Date (recent only) */}
      {isRecent && (
        <p className="mt-3 text-[11px] font-medium text-white/30">
          {new Date(game.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
    </article>
  )
}
