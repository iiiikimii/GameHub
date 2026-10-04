import { ArrowLeft, LogOut, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function SessionPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#111512] px-5 text-[#f4f4ed]">
      <section className="w-full max-w-xl border border-white/10 bg-[#191e1b] p-7 sm:p-10">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#c8f169]/10 text-[#c8f169]"><ShieldCheck className="size-6" /></span>
        <p className="mt-7 text-xs font-semibold uppercase text-[#c8f169]">Authenticated session</p>
        <h1 className="mt-2 text-3xl font-semibold">Welcome, {user.username}</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">Autentikasi berhasil dan route terlindungi. Fondasi ini belum menampilkan dashboard atau game.</p>
        <div className="mt-7 grid gap-3 border-y border-white/10 py-5 text-sm sm:grid-cols-2">
          <div><p className="text-xs text-white/40">EMAIL</p><p className="mt-1 break-all">{user.email}</p></div>
          <div><p className="text-xs text-white/40">ROLE</p><p className="mt-1">{user.role}</p></div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-full bg-[#c8f169] px-4 py-2.5 text-sm font-semibold text-[#172015] transition hover:bg-[#d7fa91]"><LogOut className="size-4" /> Logout</button>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/35 hover:text-white"><ArrowLeft className="size-4" /> Beranda</Link>
        </div>
      </section>
    </main>
  )
}
