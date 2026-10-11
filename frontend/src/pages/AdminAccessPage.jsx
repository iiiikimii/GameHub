import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function AdminAccessPage() {
  const { user } = useAuth()

  return (
    <main className="grid min-h-screen place-items-center bg-[#111323] px-5 text-[#f4f4ed]">
      <section className="w-full max-w-lg border border-white/10 bg-[#191b2e] p-8">
        <ShieldCheck className="size-7 text-[#8b8bff]" />
        <p className="mt-6 text-xs font-semibold uppercase text-[#8b8bff]">Admin route verified</p>
        <h1 className="mt-2 text-3xl font-semibold">Access granted, {user.username}</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">AdminRoute memeriksa role dari akun yang tervalidasi server. Dashboard admin belum dibuat.</p>
        <Link to="/session" className="mt-7 inline-flex rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/75 transition hover:border-white/35 hover:text-white">Kembali</Link>
      </section>
    </main>
  )
}
