import { ArrowLeft, Construction } from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'

export default function FeaturePlaceholderPage({ title }) {
  return (
    <DashboardLayout>
      <section className="mx-auto mt-10 max-w-xl border border-white/10 bg-[#171b19] p-7 sm:p-9">
        <Construction className="size-6 text-[#c8f169]" />
        <p className="mt-6 text-[11px] font-semibold uppercase text-white/40">Coming in a later phase</p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-white/50">Navigasi sudah disiapkan. Fitur ini belum diimplementasikan pada Phase 6.</p>
        <Link to="/dashboard" className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/70 transition hover:border-[#c8f169]/40 hover:text-[#c8f169]"><ArrowLeft className="size-4" /> Kembali ke dashboard</Link>
      </section>
    </DashboardLayout>
  )
}
