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
      className={`group relative flex min-w-0 items-center gap-3.5 overflow-hidden border p-4 transition duration-200 ${
        isUnlocked
          ? 'border-[#c8f169]/18 bg-[#c8f169]/[0.03] hover:border-[#c8f169]/28 hover:bg-[#c8f169]/[0.05]'
          : 'border-white/[0.08] bg-[#171b19] hover:border-white/14'
      }`}
    >
      {/* Icon container */}
      <span
        className={`relative grid size-11 shrink-0 place-items-center rounded-xl transition duration-200 ${
          isUnlocked
            ? 'bg-[#c8f169]/12 text-[#c8f169] group-hover:bg-[#c8f169]/18'
            : 'bg-white/5 text-white/28'
        }`}
      >
        <Icon aria-hidden="true" className="size-[18px]" />
        {/* Subtle ring for unlocked */}
        {isUnlocked && (
          <span className="absolute inset-0 rounded-xl ring-1 ring-[#c8f169]/25" aria-hidden="true" />
        )}
      </span>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <h3
          className={`truncate text-[13px] font-semibold leading-snug ${
            isUnlocked ? 'text-[#f4f4ed]' : 'text-white/40'
          }`}
        >
          {isUnlocked ? achievement.name : 'Locked achievement'}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-white/35">
          {isUnlocked ? achievement.description : 'Keep playing to unlock this milestone.'}
        </p>
        {isUnlocked && achievement.unlocked_at && (
          <p className="mt-1 text-[10px] text-[#c8f169]/60">
            Unlocked {new Date(achievement.unlocked_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Check badge */}
      {isUnlocked && (
        <CheckCircle2 className="size-4 shrink-0 text-[#c8f169]/70" aria-hidden="true" />
      )}
    </article>
  )
}
