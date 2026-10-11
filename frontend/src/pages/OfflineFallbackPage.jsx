import { ArrowLeft, Gamepad2, WifiOff } from 'lucide-react'
import { Link } from 'react-router-dom'

const practiceGames = [
  { slug: 'reaction-test', name: 'Reaction Test' },
  { slug: 'number-rush', name: 'Number Rush' },
  { slug: 'memory-match', name: 'Memory Match' },
]

export default function OfflineFallbackPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#111323] px-4 py-10 text-[#f4f4ed]">
      <section className="w-full max-w-xl border border-white/[0.08] bg-[#171a2b] p-6 text-center sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#ef8b72]/10 text-[#ef8b72]">
          <WifiOff className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-[#ef8b72]">Offline mode</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Koneksi internet tidak tersedia</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/55">
          Profil, leaderboard, pertemanan, dan penyimpanan skor memerlukan koneksi. Kamu masih bisa berlatih di mini-game yang asetnya sudah tersimpan.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {practiceGames.map((game) => (
            <Link
              key={game.slug}
              to={`/offline-play/${game.slug}`}
              className="flex min-h-12 items-center justify-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-medium text-white/75 transition hover:border-[#8b8bff]/30 hover:text-[#8b8bff]"
            >
              <Gamepad2 className="size-4" aria-hidden="true" />
              {game.name}
            </Link>
          ))}
        </div>

        <p className="mt-5 text-xs leading-5 text-white/35">Latihan offline tidak menyimpan atau menyinkronkan skor ke GameHub.</p>
        <Link to="/" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/55 transition hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke beranda
        </Link>
      </section>
    </main>
  )
}
