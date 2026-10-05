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
    glow: 'group-hover:border-[#c8f169]/30 group-hover:shadow-[0_0_20px_-4px_rgba(200,241,105,0.2)]',
  },
  Puzzle: {
    icon: 'bg-[#8fd2dd]/12 text-[#8fd2dd]',
    badge: 'bg-[#8fd2dd]/10 text-[#8fd2dd]',
    glow: 'group-hover:border-[#8fd2dd]/30 group-hover:shadow-[0_0_20px_-4px_rgba(143,210,221,0.2)]',
  },
  Memory: {
    icon: 'bg-[#ef8b72]/12 text-[#ef8b72]',
    badge: 'bg-[#ef8b72]/10 text-[#ef8b72]',
    glow: 'group-hover:border-[#ef8b72]/30 group-hover:shadow-[0_0_20px_-4px_rgba(239,139,114,0.2)]',
  },
}

const difficultyColors = {
  Easy: 'text-[#c8f169] bg-[#c8f169]/10 border border-[#c8f169]/20',
  Medium: 'text-[#8fd2dd] bg-[#8fd2dd]/10 border border-[#8fd2dd]/20',
  Hard: 'text-[#ef8b72] bg-[#ef8b72]/10 border border-[#ef8b72]/20',
}

export default function GameCard({ game, variant = 'recommended' }) {
  const Icon = gameIcons[game.category] ?? Grid2X2
  const tone = gameTones[game.category] ?? gameTones.Puzzle
  const isRecent = variant === 'recent'
  const diffColor = difficultyColors[game.difficulty] ?? 'text-white/50 bg-white/5 border border-white/10'

  return (
    <article
      className={`group relative min-w-0 overflow-hidden rounded-2xl glass-card p-4 sm:p-5 ${tone.glow}`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <span className={`grid size-14 shrink-0 place-items-center rounded-2xl transition duration-300 group-hover:scale-110 ${tone.icon}`}>
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
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white/5 border border-white/10 text-white transition duration-200 hover:scale-110 hover:border-[#c8f169]/40 hover:bg-[#c8f169] hover:text-[#172015] hover:shadow-[0_0_15px_rgba(200,241,105,0.4)]"
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
