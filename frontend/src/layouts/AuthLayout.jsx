import { ArrowUpLeft, Gamepad2, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AuthLayout({ eyebrow, title, description, children, footer }) {
  return (
    <main className="min-h-screen bg-[#111323] text-[#f4f4ed] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden min-h-screen overflow-hidden border-r border-white/10 bg-[#171c18] p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(139, 139, 255,0.08),transparent_38%),radial-gradient(circle_at_85%_90%,rgba(236,111,80,0.08),transparent_32%)]" />
        <Link to="/" className="relative inline-flex w-fit items-center gap-3 text-sm font-bold">
          <span className="grid size-10 place-items-center rounded-xl bg-[#8b8bff] text-[#172015]"><Gamepad2 className="size-5" /></span>
          GAMEHUB
        </Link>
        <div className="relative max-w-lg">
          <p className="mb-5 text-xs font-semibold uppercase text-[#8b8bff]">Your next run starts here</p>
          <p className="text-5xl font-semibold leading-[1.02] xl:text-6xl">Play sharp.<br />Find your people.</p>
          <div className="mt-10 flex flex-wrap gap-3 text-xs text-white/65">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2"><Sparkles className="size-3.5 text-[#8b8bff]" /> Skill-based games</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2"><ShieldCheck className="size-3.5 text-[#ef8b72]" /> Secure account</span>
          </div>
        </div>
        <p className="relative text-xs text-white/35">GAMEHUB / PLAYER ACCESS</p>
      </aside>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <Link to="/" className="inline-flex w-fit items-center gap-2 text-sm text-white/55 transition hover:text-white lg:invisible">
          <ArrowUpLeft className="size-4" /> Kembali ke beranda
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-3 text-sm font-bold">
              <span className="grid size-10 place-items-center rounded-xl bg-[#8b8bff] text-[#172015]"><Gamepad2 className="size-5" /></span>
              GAMEHUB
            </Link>
          </div>
          <p className="mb-3 text-xs font-semibold uppercase text-[#8b8bff]">{eyebrow}</p>
          <h1 className="text-4xl font-semibold leading-tight">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">{description}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-7 text-sm text-white/55">{footer}</div>
        </div>
        <p className="text-center text-[11px] text-white/30">GAMEHUB / PLAYER ACCESS</p>
      </section>
    </main>
  )
}
