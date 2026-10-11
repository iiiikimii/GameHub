const tones = {
  lime: {
    icon: 'bg-[#8b8bff]/12 text-[#8b8bff] ring-[#8b8bff]/20',
    label: 'text-[#8b8bff]',
    dot: 'bg-[#8b8bff]',
  },
  coral: {
    icon: 'bg-[#ef8b72]/12 text-[#ef8b72] ring-[#ef8b72]/20',
    label: 'text-[#ef8b72]',
    dot: 'bg-[#ef8b72]',
  },
  sky: {
    icon: 'bg-[#7dd3fc]/12 text-[#7dd3fc] ring-[#7dd3fc]/20',
    label: 'text-[#7dd3fc]',
    dot: 'bg-[#7dd3fc]',
  },
  white: {
    icon: 'bg-white/6 text-white/65 ring-white/10',
    label: 'text-white/50',
    dot: 'bg-white/40',
  },
}

export default function StatCard({ label, value, detail, icon: Icon, tone = 'lime' }) {
  const t = tones[tone] ?? tones.lime

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-xl glass-card p-5 sm:p-6">
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">{label}</p>
        <span className={`grid size-11 shrink-0 place-items-center rounded-lg ring-1 ${t.icon}`}>
          <Icon aria-hidden="true" className="size-[20px]" />
        </span>
      </div>

      <p className="heading-gradient relative mt-4 truncate text-[2.25rem] font-bold leading-none tracking-tight">
        {value}
      </p>

      <div className="relative mt-3 flex items-center gap-2">
        <span className={`size-1.5 shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />
        <p className="truncate text-xs font-medium text-white/40">{detail}</p>
      </div>
    </article>
  )
}
