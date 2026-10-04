import { ArrowDown, ArrowRight, Gamepad2, LogOut, Shield, Sparkles, Trophy, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

const pillars = [
  { icon: Zap, label: 'Reflex', note: 'Trust your timing' },
  { icon: Sparkles, label: 'Memory', note: 'Keep a clear head' },
  { icon: Trophy, label: 'Competition', note: 'Earn your place' },
]

export default function HomePage() {
  const { user, logout } = useAuth()

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#111512] px-5 text-[#f4f4ed] sm:px-8 lg:px-14">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,transparent_55%,rgba(200,241,105,0.045)),radial-gradient(ellipse_at_10%_85%,rgba(236,111,80,0.08),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col">
        <header className="flex h-[78px] items-center border-b border-white/10">
          <Link to="/" className="inline-flex items-center gap-3 text-sm font-bold">
            <span className="grid size-10 place-items-center rounded-xl bg-[#c8f169] text-[#172015]"><Gamepad2 className="size-5" /></span>
            GAMEHUB
          </Link>
          <nav className="ml-auto flex items-center gap-3 sm:gap-6">
            <a href="#the-arcade" className="hidden items-center gap-2 text-sm text-white/55 transition hover:text-white sm:inline-flex">The arcade <ArrowDown className="size-3.5" /></a>
            {user ? (
              <>
                <Link to="/dashboard" className="hidden text-sm text-white/65 sm:inline">Hi, {user.username}</Link>
                {user.role === 'ADMIN' && <Link to="/admin" className="text-sm text-white/65 hover:text-white">Admin</Link>}
                <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#c8f169]/60 hover:text-[#c8f169]"><LogOut className="size-4" /><span className="hidden sm:inline">Keluar</span></button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-2 py-2 text-sm text-white/65 transition hover:text-white">Masuk</Link>
                <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-[#c8f169] px-4 py-2.5 text-sm font-semibold text-[#172015] transition hover:bg-[#d7fa91]">Gabung <ArrowRight className="size-4" /></Link>
              </>
            )}
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-14 py-16 md:grid-cols-[1.12fr_0.88fr] md:py-20">
          <div className="max-w-3xl animate-rise">
            <p className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase text-[#c8f169]"><span className="size-1.5 rounded-full bg-[#c8f169]" /> The next round is yours</p>
            <h1 className="text-6xl font-semibold leading-[0.96] sm:text-7xl xl:text-8xl">PLAY.<br /><span className="text-[#c8f169]">COMPETE.</span><br />LEVEL UP.</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/60 sm:text-lg">Quick games. Clean scores. A place on the board that you earn, one sharp move at a time.</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              {user ? (
                <Link to="/dashboard" className="inline-flex items-center gap-3 rounded-full bg-[#c8f169] px-6 py-3.5 font-semibold text-[#172015] transition hover:translate-y-[-2px] hover:bg-[#d7fa91]">Lihat dashboard <ArrowRight className="size-4" /></Link>
              ) : (
                <Link to="/register" className="inline-flex items-center gap-3 rounded-full bg-[#c8f169] px-6 py-3.5 font-semibold text-[#172015] transition hover:translate-y-[-2px] hover:bg-[#d7fa91]">Mulai bermain <ArrowRight className="size-4" /></Link>
              )}
              <a href="#the-arcade" className="px-2 py-3 text-sm text-white/60 transition hover:text-white">Kenali GameHub</a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg animate-rise-delayed">
            <div className="absolute -right-3 -top-3 size-20 border-r border-t border-[#c8f169]/50" />
            <section className="relative overflow-hidden border border-white/10 bg-[#191e1b] p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div><p className="text-[11px] font-semibold uppercase text-white/40">GameHub / 001</p><h2 className="mt-1 text-lg font-semibold">Player ready</h2></div>
                <span className="grid size-12 place-items-center rounded-2xl bg-[#c8f169]/10 text-[#c8f169]"><Gamepad2 className="size-6" /></span>
              </div>
              <div className="grid grid-cols-3 gap-3 py-7">
                {pillars.map(({ icon: Icon, label, note }, index) => (
                  <div className="min-h-32 border-l border-white/10 pl-3 sm:pl-4" key={label}>
                    <Icon className={`mb-6 size-5 ${index === 1 ? 'text-[#ef8b72]' : 'text-[#c8f169]'}`} />
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="mt-1 text-[11px] leading-4 text-white/40">{note}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-5 text-xs">
                <span className="inline-flex items-center gap-2 text-white/50"><Shield className="size-3.5 text-[#c8f169]" /> Secure player access</span>
                <span className="text-[#c8f169]">FOUNDATION 01</span>
              </div>
              <div className="pointer-events-none absolute -bottom-14 -right-10 size-36 rotate-12 border border-[#c8f169]/10" />
            </section>
          </div>
        </section>

        <section id="the-arcade" className="grid gap-5 border-t border-white/10 py-7 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><p className="text-xs font-semibold uppercase text-[#ef8b72]">The arcade is taking shape</p><p className="mt-1 text-sm text-white/50">Reaction Test, Number Rush, and Memory Match are coming in a later phase.</p></div>
          <Link to={user ? '/dashboard' : '/register'} className="inline-flex items-center gap-2 text-sm font-medium text-white/75 transition hover:text-[#c8f169]">{user ? 'Continue' : 'Create a player account'} <ArrowRight className="size-4" /></Link>
        </section>
      </div>
    </main>
  )
}
