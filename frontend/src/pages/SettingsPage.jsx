import { Accessibility, ArrowRight, LogOut, SlidersHorizontal, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { applyUiPreferences, readUiPreferences, saveUiPreferences } from '../services/uiPreferences.js'

const textSizeOptions = [
  { value: 'standard', label: 'Standar', sample: 'Aa' },
  { value: 'large', label: 'Besar', sample: 'Aa' },
  { value: 'larger', label: 'Lebih besar', sample: 'Aa' },
]

function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-xl border border-white/[0.09] bg-[#191c21] p-5 sm:p-6">
      <div className="flex items-start gap-3 border-b border-white/[0.08] pb-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-[#b9b9ff]">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-white/45">{description}</p>
        </div>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  )
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [preferences, setPreferences] = useState(readUiPreferences)

  function updatePreferences(nextPreferences) {
    setPreferences(nextPreferences)
    saveUiPreferences(nextPreferences)
    applyUiPreferences(nextPreferences)
  }

  function signOutThisTab() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <DashboardLayout>
      <section className="mx-auto w-full max-w-5xl">
        <header className="mb-6 border-b border-white/[0.08] pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#b9b9ff]">Preferences</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">Atur kenyamanan tampilan GameHub di browser ini. Pilihan tampilan disimpan secara lokal.</p>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
          <div className="space-y-5">
            <SettingsSection icon={SlidersHorizontal} title="Tampilan" description="Sesuaikan ukuran teks dan gerakan antarmuka.">
              <fieldset>
                <legend className="text-sm font-medium text-white/80">Ukuran teks</legend>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {textSizeOptions.map((option) => {
                    const selected = preferences.textSize === option.value
                    return (
                      <label key={option.value} className={`relative flex min-h-[76px] cursor-pointer flex-col items-center justify-center rounded-lg border px-2 py-3 text-center transition ${selected ? 'border-[#8b8bff]/60 bg-[#8b8bff]/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/55 hover:border-white/20 hover:text-white/80'}`}>
                        <input
                          type="radio"
                          name="text-size"
                          value={option.value}
                          checked={selected}
                          onChange={() => updatePreferences({ ...preferences, textSize: option.value })}
                          className="absolute right-2 top-2 size-4 accent-[#8b8bff]"
                        />
                        <span className={`block font-semibold ${option.value === 'standard' ? 'text-lg' : option.value === 'large' ? 'text-xl' : 'text-2xl'}`}>{option.sample}</span>
                        <span className="mt-1 block text-xs">{option.label}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 border-t border-white/[0.08] pt-4">
                <span>
                  <span className="block text-sm font-medium text-white/80">Kurangi animasi</span>
                  <span className="mt-1 block text-xs leading-5 text-white/40">Mengurangi gerakan dan transisi di seluruh halaman.</span>
                </span>
                <input
                  type="checkbox"
                  checked={preferences.reduceMotion}
                  onChange={(event) => updatePreferences({ ...preferences, reduceMotion: event.target.checked })}
                  className="size-5 shrink-0 accent-[#8b8bff]"
                  aria-label="Kurangi animasi"
                />
              </label>
              <p role="status" className="mt-4 text-xs text-white/35">Perubahan diterapkan langsung dan tetap tersimpan saat halaman dimuat ulang.</p>
            </SettingsSection>

            <SettingsSection icon={Accessibility} title="Aksesibilitas" description="Kontrol ini membantu menjaga antarmuka tetap mudah dibaca dan digunakan.">
              <ul className="space-y-3 text-sm leading-6 text-white/55">
                <li className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#b9b9ff]" />Ukuran teks dapat diubah tanpa mengubah data akun.</li>
                <li className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#b9b9ff]" />Preferensi ini hanya tersimpan pada browser yang sedang digunakan.</li>
              </ul>
            </SettingsSection>
          </div>

          <aside className="space-y-5">
            <SettingsSection icon={UserRound} title="Akun" description="Informasi akun yang sedang digunakan.">
              <dl className="space-y-3">
                <div className="flex items-start justify-between gap-4"><dt className="text-xs text-white/40">Username</dt><dd className="text-right text-sm font-medium text-white/85">{user?.username ?? '—'}</dd></div>
                {user?.email && <div className="flex items-start justify-between gap-4"><dt className="text-xs text-white/40">Email</dt><dd className="max-w-[65%] break-all text-right text-sm text-white/70">{user.email}</dd></div>}
                <div className="flex items-start justify-between gap-4"><dt className="text-xs text-white/40">Role</dt><dd className="text-right text-xs font-semibold uppercase tracking-wide text-white/65">{user?.role ?? 'PLAYER'}</dd></div>
              </dl>
              <Link to="/profile" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white">
                Buka profil <ArrowRight className="size-4" />
              </Link>
            </SettingsSection>

            <section className="rounded-xl border border-white/[0.09] bg-[#191c21] p-5 sm:p-6">
              <h2 className="text-base font-semibold">Sesi saat ini</h2>
              <p className="mt-2 text-sm leading-6 text-white/45">Akun ini aktif di tab browser ini. Keluar dari sini tidak akan mengeluarkan akun lain di tab berbeda.</p>
              <button type="button" onClick={signOutThisTab} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md border border-[#ef8b72]/25 px-3 text-sm text-[#efaa98] transition hover:bg-[#ef8b72]/[0.08]">
                <LogOut className="size-4" /> Keluar dari tab ini
              </button>
            </section>
          </aside>
        </div>
      </section>
    </DashboardLayout>
  )
}
