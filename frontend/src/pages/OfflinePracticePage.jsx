import { ArrowLeft, Gamepad2 } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Link, useParams } from 'react-router-dom'

const practiceGames = {
  'reaction-test': {
    name: 'Reaction Test',
    description: 'Latih refleks tanpa mengirim skor.',
    Component: lazy(() => import('../games/ReactionTest/ReactionTest.jsx')),
  },
  'number-rush': {
    name: 'Number Rush',
    description: 'Latih ketelitian di grid angka.',
    Component: lazy(() => import('../games/NumberRush/NumberRush.jsx')),
  },
  'memory-match': {
    name: 'Memory Match',
    description: 'Latih ingatan dengan mencocokkan kartu.',
    Component: lazy(() => import('../games/MemoryMatch/MemoryMatch.jsx')),
  },
}

export default function OfflinePracticePage() {
  const { slug } = useParams()
  const game = practiceGames[slug]

  if (!game) {
    return <main className="grid min-h-screen place-items-center bg-[#111323] p-5 text-center text-white"><div><h1 className="text-2xl font-semibold">Game latihan tidak tersedia</h1><Link to="/offline" className="mt-5 inline-flex min-h-11 items-center gap-2 text-[#8b8bff]"><ArrowLeft className="size-4" />Mode offline</Link></div></main>
  }

  const { Component } = game

  return (
    <main className="min-h-screen bg-[#111323] px-3 py-5 text-[#f4f4ed] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <Link to="/offline" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-white/55 transition hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> Semua game latihan
        </Link>
        <header className="mt-4 flex items-start gap-3 border border-[#ef8b72]/20 bg-[#241713]/60 p-4 sm:items-center sm:p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ef8b72]/10 text-[#ef8b72]"><Gamepad2 className="size-5" aria-hidden="true" /></span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ef8b72]">Offline practice</p>
            <h1 className="mt-1 text-lg font-semibold">{game.name}</h1>
            <p className="mt-1 text-xs text-white/45">{game.description} Hasil latihan tidak disimpan.</p>
          </div>
        </header>
        <section className="mt-4 border border-white/[0.08] bg-[#0f1120]" aria-label={`${game.name} offline practice`}>
          <Suspense fallback={<div className="grid min-h-[40vh] place-items-center text-sm text-white/50">Memuat game…</div>}>
            <Component offlinePractice />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
