import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(() => (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  ))
  const [showHelp, setShowHelp] = useState(false)
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
      setShowHelp(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!installPrompt) {
      setShowHelp(true)
      return
    }

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setInstallPrompt(null)
  }

  if (installed) return null

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        aria-label="Install GameHub"
        title="Install GameHub"
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] text-white/50 transition hover:bg-white/5 hover:text-white/80"
      >
        <Download className="size-[17px]" aria-hidden="true" />
      </button>

      {showHelp && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowHelp(false)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="install-title" className="w-full max-w-sm border border-white/10 bg-[#171a2b] p-6 text-[#f4f4ed] shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8bff]">GameHub PWA</p>
                <h2 id="install-title" className="mt-2 text-xl font-semibold">Install the app</h2>
              </div>
              <button type="button" onClick={() => setShowHelp(false)} aria-label="Tutup panduan instalasi" className="grid size-9 place-items-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/60">
              {isAppleMobile
                ? 'Di Safari, ketuk tombol Bagikan lalu pilih “Add to Home Screen”.'
                : 'Buka menu browser, lalu pilih “Install GameHub” atau “Add to Home screen” jika tersedia.'}
            </p>
            <p className="mt-3 text-xs leading-5 text-white/35">Pilihan instalasi bergantung pada browser dan perangkat yang digunakan.</p>
          </section>
        </div>
      )}
    </>
  )
}
