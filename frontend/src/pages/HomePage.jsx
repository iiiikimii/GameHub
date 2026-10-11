import { ArrowDown, ArrowRight, Brain, Gamepad2, LogOut, Trophy, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import InstallAppButton from '../components/InstallAppButton.jsx'

const pillars = [
  { icon: Zap, label: 'Reaction Test', note: 'Test your timing' },
  { icon: Brain, label: 'Memory Match', note: 'Remember the pattern' },
  { icon: Trophy, label: 'Number Rush', note: 'Build a better score' },
]

export default function HomePage() {
  const { user, logout } = useAuth()

  return (
    <main className="min-h-screen bg-[#111318] px-5 text-[#f4f4ed] sm:px-8 lg:px-14">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col">
        <header className="flex h-[72px] items-center border-b border-white/10">
          <Link to="/" className="inline-flex items-center gap-3 text-sm font-bold max-[360px]:gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[#8b8bff] text-[#172015]"><Gamepad2 className="size-[18px]" /></span>
            GAMEHUB
          </Link>
          <nav className="ml-auto flex items-center gap-3 sm:gap-6 max-[360px]:gap-1">
            <a href="#the-arcade" className="hidden items-center gap-2 text-sm text-white/55 transition hover:text-white sm:inline-flex">The arcade <ArrowDown className="size-3.5" /></a>
            <InstallAppButton />
            {user ? (
              <>
                <Link to="/dashboard" className="hidden text-sm text-white/65 sm:inline">Hi, {user.username}</Link>
                {user.role === 'ADMIN' && <Link to="/admin" className="text-sm text-white/65 hover:text-white">Admin</Link>}
                <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm transition hover:border-white/30 hover:bg-white/[0.04]"><LogOut className="size-4" /><span className="hidden sm:inline">Keluar</span></button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-2 py-2 text-sm text-white/65 transition hover:text-white max-[360px]:px-1.5 max-[360px]:text-xs">Masuk</Link>
                <Link to="/register" className="inline-flex items-center gap-2 rounded-md bg-[#8b8bff] px-4 py-2.5 text-sm font-semibold text-[#172015] transition hover:bg-[#c3c3ff] max-[360px]:gap-0.5 max-[360px]:px-2 max-[360px]:py-2 max-[360px]:text-xs"><span>Gabung</span><ArrowRight className="size-4 max-[360px]:hidden" /></Link>
              </>
            )}
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 md:grid-cols-[1.05fr_.95fr] md:py-20 lg:gap-20">
          <div className="max-w-3xl">
            <p className="mb-6 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.16em] text-white/50"><span className="h-px w-8 bg-[#8b8bff]" /> A small arcade for focused play</p>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-.045em] sm:text-6xl xl:text-7xl">PLAY A ROUND.<br /><span className="text-[#b9b9ff]">BEAT YOUR BEST.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/60 sm:text-lg">Pick up a quick game, follow your progress, and challenge a friend when you’re ready.</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {user ? (
                <Link to="/dashboard" className="inline-flex min-h-12 items-center gap-3 rounded-md bg-[#8b8bff] px-5 font-semibold text-[#172015] transition hover:bg-[#c3c3ff]">Lihat dashboard <ArrowRight className="size-4" /></Link>
              ) : (
                <Link to="/register" className="inline-flex min-h-12 items-center gap-3 rounded-md bg-[#8b8bff] px-5 font-semibold text-[#172015] transition hover:bg-[#c3c3ff]">Mulai bermain <ArrowRight className="size-4" /></Link>
              )}
              <a href="#the-arcade" className="px-2 py-3 text-sm text-white/60 transition hover:text-white">Kenali GameHub</a>
            </div>
          </div>

          <div className="w-full max-w-xl md:justify-self-end">
            <section className="overflow-hidden rounded-xl border border-white/10 bg-[#191c21]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
                <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/40">The arcade</p><h2 className="mt-1 text-lg font-semibold">Three games. Your pace.</h2></div>
                <span className="text-xs tabular-nums text-white/35">01 — 03</span>
              </div>
              <div className="divide-y divide-white/[0.08] px-5 sm:px-6">
                {pillars.map(({ icon: Icon, label, note }, index) => (
                  <div className="flex min-h-[88px] items-center gap-4" key={label}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-[#b9b9ff]"><Icon className="size-[18px]" /></span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-white/40">{note}</p></div>
                    <span className="font-mono text-xs text-white/25">0{index + 1}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 px-5 py-4 sm:px-6">
                <Link to={user ? '/games' : '/login'} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#b9b9ff] transition hover:text-white">Browse all games <ArrowRight className="size-4" /></Link>
              </div>
            </section>
          </div>
        </section>

        <section id="the-arcade" className="grid gap-5 border-t border-white/10 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-white/40">Made for short sessions</p><p className="mt-1 text-sm text-white/60">Your scores, friends, and match history stay together in one place.</p></div>
          <Link to={user ? '/games' : '/login'} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white/75 transition hover:text-[#b9b9ff]">{user ? 'Open the arcade' : 'Sign in to play'} <ArrowRight className="size-4" /></Link>
        </section>
      </div>
    </main>
  )
}
