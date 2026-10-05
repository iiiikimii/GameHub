import { ArrowRight, CalendarDays, CheckCircle2, Gift, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProgressBar from './ProgressBar.jsx'

export default function ChallengeCard({ challenge }) {
  const progress = Number(challenge.progress)
  const target = Number(challenge.target_score)
  const percent = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0
  const endDate = new Date(challenge.end_date)
  const isCompleted = Boolean(challenge.completed)

  return (
    <article className="relative overflow-hidden rounded-2xl glass-card">
      {/* Gradient background accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(ellipse at 90% 10%, rgba(239,139,114,0.15) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      {/* Corner decoration */}
      <div className="pointer-events-none absolute right-5 top-5 size-24 -translate-y-1/2 translate-x-1/2 rotate-45 border border-[#ef8b72]/15 shadow-[0_0_20px_rgba(239,139,114,0.1)]" aria-hidden="true" />

      <div className="relative p-5 sm:p-7">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#ef8b72]">
              Daily challenge
            </p>
            <h3 className="heading-gradient mt-2 text-2xl font-bold leading-snug">{challenge.title}</h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">
              {challenge.description}
            </p>
          </div>

          <span
            className={`grid size-12 shrink-0 place-items-center rounded-2xl transition shadow-[0_0_15px_rgba(0,0,0,0.2)] ${
              isCompleted
                ? 'bg-[#c8f169]/15 text-[#c8f169]'
                : 'bg-[#ef8b72]/15 text-[#ef8b72]'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="size-6" aria-hidden="true" />
            ) : (
              <Target className="size-6" aria-hidden="true" />
            )}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-7">
          <div className="mb-2.5 flex items-center justify-between text-xs">
            <span className="text-white/50 font-medium">{challenge.game_name ?? 'Any game'}</span>
            <span className="font-bold text-white">
              {progress.toLocaleString('id-ID')} / {target.toLocaleString('id-ID')}
            </span>
          </div>
          <ProgressBar
            value={progress}
            max={target}
            label={`Progress ${challenge.title}`}
            tone="coral"
          />
          <p className={`mt-2 text-right text-[11px] font-bold tracking-wider ${isCompleted ? 'text-[#c8f169]' : 'text-[#ef8b72]'}`}>
            {isCompleted ? '✓ COMPLETE' : `${percent}%`}
          </p>
        </div>

        {/* Footer row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5 text-xs">
          <span className="inline-flex items-center gap-1.5 text-white/50 font-medium">
            <CalendarDays className="size-4" aria-hidden="true" />
            Ends {endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-[#c8f169]">
            <Gift className="size-4" aria-hidden="true" />
            +{Number(challenge.reward_points).toLocaleString('id-ID')} pts
          </span>
          <Link
            to="/challenges"
            className="inline-flex items-center gap-1.5 text-white/50 font-medium transition hover:text-white"
            aria-label="Lihat semua challenge"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}
