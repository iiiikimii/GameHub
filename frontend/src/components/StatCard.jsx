const tones = {
  lime: {
    icon: 'bg-[#c8f169]/12 text-[#c8f169] ring-[#c8f169]/20',
    label: 'text-[#c8f169]',
    glow: 'group-hover:shadow-[0_0_24px_-4px_rgba(200,241,105,0.22)]',
    dot: 'bg-[#c8f169]',
  },
  coral: {
    icon: 'bg-[#ef8b72]/12 text-[#ef8b72] ring-[#ef8b72]/20',
    label: 'text-[#ef8b72]',
    glow: 'group-hover:shadow-[0_0_24px_-4px_rgba(239,139,114,0.22)]',
    dot: 'bg-[#ef8b72]',
  },
  sky: {
    icon: 'bg-[#8fd2dd]/12 text-[#8fd2dd] ring-[#8fd2dd]/20',
    label: 'text-[#8fd2dd]',
    glow: 'group-hover:shadow-[0_0_24px_-4px_rgba(143,210,221,0.22)]',
    dot: 'bg-[#8fd2dd]',
  },
  white: {
    icon: 'bg-white/6 text-white/65 ring-white/10',
    label: 'text-white/50',
    glow: 'group-hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.1)]',
    dot: 'bg-white/40',
  },
}

export default function StatCard({ label, value, detail, icon: Icon, tone = 'lime' }) {
  const t = tones[tone] ?? tones.lime

  return (
    <article className={`group relative min-w-0 overflow-hidden rounded-2xl glass-card p-5 sm:p-6 ${t.glow}`}>
      {/* Corner accent */}
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/2 rounded-full opacity-40 blur-2xl" style={{ background: 'currentColor' }} aria-hidden="true" />

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">{label}</p>
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ring-1 transition duration-300 group-hover:scale-110 ${t.icon}`}>
          <Icon aria-hidden="true" className="size-[20px]" />
        </span>
      </div>

      <p className="heading-gradient relative mt-4 truncate text-[2.25rem] font-bold leading-none tracking-tight">
        {value}
      </p>

      <div className="relative mt-3 flex items-center gap-2">
        <span className={`size-2 shrink-0 rounded-full animate-pulse-glow ${t.dot}`} aria-hidden="true" />
        <p className="truncate text-xs font-medium text-white/40">{detail}</p>
      </div>
    </article>
  )
}
