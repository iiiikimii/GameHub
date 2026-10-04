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
    <article className="relative overflow-hidden border border-white/[0.08] bg-[#171b19]">
      {/* Gradient background accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at 90% 10%, rgba(239,139,114,0.12) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      {/* Corner decoration */}
      <div className="pointer-events-none absolute right-5 top-5 size-20 -translate-y-1/2 translate-x-1/2 rotate-45 border border-[#ef8b72]/12" aria-hidden="true" />

      <div className="relative p-5 sm:p-7">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#ef8b72]">
              Daily challenge
            </p>
            <h3 className="mt-2 text-xl font-semibold leading-snug">{challenge.title}</h3>
            <p className="mt-1.5 max-w-lg text-sm leading-[1.6] text-white/48">
              {challenge.description}
            </p>
          </div>

          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl transition ${
              isCompleted
                ? 'bg-[#c8f169]/12 text-[#c8f169]'
                : 'bg-[#ef8b72]/10 text-[#ef8b72]'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="size-5" aria-hidden="true" />
            ) : (
              <Target className="size-5" aria-hidden="true" />
            )}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-white/45">{challenge.game_name ?? 'Any game'}</span>
            <span className="font-semibold text-white/80">
              {progress.toLocaleString('id-ID')} / {target.toLocaleString('id-ID')}
            </span>
          </div>
          <ProgressBar
            value={progress}
            max={target}
            label={`Progress ${challenge.title}`}
            tone="coral"
          />
          <p className={`mt-1.5 text-right text-[11px] font-semibold ${isCompleted ? 'text-[#c8f169]' : 'text-[#ef8b72]'}`}>
            {isCompleted ? '✓ Complete!' : `${percent}%`}
          </p>
        </div>

        {/* Footer row */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-white/40">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            Ends {endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#c8f169]">
            <Gift className="size-3.5" aria-hidden="true" />
            +{Number(challenge.reward_points).toLocaleString('id-ID')} pts reward
          </span>
          <Link
            to="/challenges"
            className="inline-flex items-center gap-1 text-white/35 transition hover:text-white/70"
            aria-label="Lihat semua challenge"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </article>
  )
}
