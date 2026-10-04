export default function ProgressBar({ value, max, label, tone = 'lime' }) {
  const progress = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  const toneStyles = {
    lime: 'bg-[#c8f169]',
    coral: 'bg-[#ef8b72]',
    sky: 'bg-[#8fd2dd]',
  }

  const glowStyles = {
    lime: 'shadow-[0_0_10px_rgba(200,241,105,0.6)]',
    coral: 'shadow-[0_0_10px_rgba(239,139,114,0.6)]',
    sky: 'shadow-[0_0_10px_rgba(143,210,221,0.6)]',
  }

  const fillColor = toneStyles[tone] ?? toneStyles.lime
  const glowColor = glowStyles[tone] ?? glowStyles.lime

  return (
    <div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/8"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
      >
        <div
          className={`animate-progress h-full rounded-full ${fillColor} ${progress > 10 ? glowColor : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
