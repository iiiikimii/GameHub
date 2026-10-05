import { Award, Bolt, Brain, CheckCircle2, Gamepad2, LockKeyhole, Sparkles, Trophy } from 'lucide-react'

const achievementIcons = {
  gamepad: Gamepad2,
  sparkles: Sparkles,
  bolt: Bolt,
  trophy: Trophy,
  brain: Brain,
}

export default function AchievementCard({ achievement }) {
  const isUnlocked = Boolean(achievement.unlocked_at)
  const Icon = isUnlocked ? (achievementIcons[achievement.icon] ?? Award) : LockKeyhole

  return (
    <article
      className={`group relative flex min-w-0 items-center gap-4 overflow-hidden rounded-xl border p-4 transition duration-300 ${
        isUnlocked
          ? 'border-[#c8f169]/30 bg-[#c8f169]/[0.05] hover:border-[#c8f169]/50 hover:bg-[#c8f169]/[0.08] shadow-[0_4px_15px_-3px_rgba(200,241,105,0.1)]'
          : 'border-white/[0.08] bg-[#171b19] hover:border-white/20'
      }`}
    >
      {/* Icon container */}
      <span
        className={`relative grid size-12 shrink-0 place-items-center rounded-xl transition duration-300 group-hover:scale-110 ${
          isUnlocked
            ? 'bg-[#c8f169]/20 text-[#c8f169] shadow-[0_0_15px_rgba(200,241,105,0.3)]'
            : 'bg-white/5 text-white/30'
        }`}
      >
        <Icon aria-hidden="true" className="size-5" />
        {/* Subtle ring for unlocked */}
        {isUnlocked && (
          <span className="absolute inset-0 rounded-xl ring-1 ring-[#c8f169]/40" aria-hidden="true" />
        )}
      </span>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <h3
          className={`truncate text-[14px] font-bold leading-snug ${
            isUnlocked ? 'heading-gradient' : 'text-white/50'
          }`}
        >
          {isUnlocked ? achievement.name : 'Locked achievement'}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-white/50">
          {isUnlocked ? achievement.description : 'Keep playing to unlock this milestone.'}
        </p>
        {isUnlocked && achievement.unlocked_at && (
          <p className="mt-1.5 text-[10px] font-bold tracking-wider uppercase text-[#c8f169]/70">
            Unlocked {new Date(achievement.unlocked_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Check badge */}
      {isUnlocked && (
        <CheckCircle2 className="size-5 shrink-0 text-[#c8f169] drop-shadow-[0_0_8px_rgba(200,241,105,0.5)] transition group-hover:scale-110" aria-hidden="true" />
      )}
    </article>
  )
}
