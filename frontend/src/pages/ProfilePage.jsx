import {
  Award,
  Brain,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Eye,
  EyeOff,
  Gamepad2,
  Grid2X2,
  Loader2,
  Lock,
  Save,
  Trophy,
  User,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { getProfile, updateProfile } from '../services/profileService.js'

// ─── Constants ────────────────────────────────────────────────

const CATEGORY_META = {
  Reflex: { icon: Zap,      color: 'text-[#c8f169]', bg: 'bg-[#c8f169]/10' },
  Puzzle: { icon: Grid2X2,  color: 'text-[#8fd2dd]', bg: 'bg-[#8fd2dd]/10' },
  Memory: { icon: Brain,    color: 'text-[#ef8b72]', bg: 'bg-[#ef8b72]/10' },
}

const AVATAR_PRESETS = ['🎮', '🕹️', '⚡', '🧠', '🏆', '🌟', '🔥', '💎', '🦅', '🐉']

// ─── Avatar display ──────────────────────────────────────────

function AvatarDisplay({ avatar, username, size = 'xl' }) {
  const sizeClass = { sm: 'size-10 text-base', md: 'size-14 text-xl', xl: 'size-24 text-4xl' }[size]
  const content = avatar || (username ?? '?').slice(0, 2).toUpperCase()
  const isEmoji = avatar && [...avatar].length === 1 && avatar.codePointAt(0) > 127

  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#c8f169]/12 font-bold text-[#c8f169] ${sizeClass}`}>
      {content}
    </span>
  )
}

// ─── Stat card ────────────────────────────────────────────────

function StatItem({ label, value, sub, icon: Icon, color = 'text-[#c8f169]' }) {
  return (
    <div className="border border-white/[0.07] bg-[#171b19] p-4">
      <div className="flex items-center gap-2 text-white/35">
        <Icon className="size-3.5" aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-white/30">{sub}</p>}
    </div>
  )
}

// ─── Input field ─────────────────────────────────────────────

function Field({ label, id, type = 'text', value, onChange, placeholder, error, rightEl, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-white/50">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`h-10 w-full rounded-lg border bg-[#111512] px-3.5 text-sm text-white placeholder-white/20 outline-none transition
            focus:ring-1 ${error
              ? 'border-[#ef8b72]/50 focus:border-[#ef8b72]/70 focus:ring-[#ef8b72]/20'
              : 'border-white/[0.08] focus:border-[#c8f169]/40 focus:ring-[#c8f169]/20'
            } ${rightEl ? 'pr-10' : ''}`}
        />
        {rightEl && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-[#ef8b72]">{error}</p>}
    </div>
  )
}

// ─── Password field ───────────────────────────────────────────

function PasswordField({ label, id, value, onChange, placeholder, error, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <Field
      label={label} id={id} type={show ? 'text' : 'password'}
      value={value} onChange={onChange} placeholder={placeholder}
      error={error} autoComplete={autoComplete}
      rightEl={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-white/30 transition hover:text-white/60"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  )
}

// ─── Edit profile modal ───────────────────────────────────────

function EditModal({ profile, onClose, onSaved }) {
  const [form, setForm] = useState({
    username: profile.username,
    email: profile.email,
    avatar: profile.avatar ?? '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    setApiError('')

    // Client-side validation
    const newErrors = {}
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const payload = {}
    if (form.username !== profile.username) payload.username = form.username
    if (form.email !== profile.email) payload.email = form.email
    if (form.avatar !== (profile.avatar ?? '')) payload.avatar = form.avatar || null
    if (form.newPassword) {
      payload.currentPassword = form.currentPassword
      payload.newPassword = form.newPassword
    }

    if (Object.keys(payload).length === 0) {
      onClose()
      return
    }

    setSaving(true)
    try {
      const updated = await updateProfile(payload)
      onSaved(updated)
      onClose()
    } catch (err) {
      setApiError(err.response?.data?.message ?? 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
    >
      <div className="w-full max-w-md border border-white/10 bg-[#171b19] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <h2 className="font-semibold">Edit Profile</h2>
          <button onClick={onClose} className="text-white/35 transition hover:text-white" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Avatar presets */}
          <div>
            <p className="mb-2 text-xs font-semibold text-white/50">Avatar</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_PRESETS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, avatar: f.avatar === em ? '' : em }))}
                  className={`grid size-9 place-items-center rounded-lg border text-lg transition
                    ${form.avatar === em
                      ? 'border-[#c8f169]/40 bg-[#c8f169]/10'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
                    }`}
                  aria-label={`Select ${em} avatar`}
                >
                  {em}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, avatar: '' }))}
                className={`grid size-9 place-items-center rounded-lg border text-xs font-semibold transition
                  ${!form.avatar ? 'border-[#c8f169]/40 bg-[#c8f169]/10 text-[#c8f169]' : 'border-white/[0.08] bg-white/[0.03] text-white/30 hover:border-white/20'}`}
                aria-label="Use initials"
              >
                AB
              </button>
            </div>
          </div>

          <Field label="Username" id="edit-username" value={form.username} onChange={set('username')}
            placeholder="username" error={errors.username} autoComplete="username" />

          <Field label="Email" id="edit-email" type="email" value={form.email} onChange={set('email')}
            placeholder="you@example.com" error={errors.email} autoComplete="email" />

          {/* Change password section */}
          <div className="border-t border-white/[0.06] pt-4">
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="flex items-center gap-2 text-xs font-semibold text-white/40 transition hover:text-white/70"
            >
              <Lock className="size-3.5" />
              Change password
              <ChevronDown className={`size-3.5 transition-transform ${showPassword ? 'rotate-180' : ''}`} />
            </button>

            {showPassword && (
              <div className="mt-3 space-y-3">
                <PasswordField label="Current password" id="edit-current-pass" value={form.currentPassword}
                  onChange={set('currentPassword')} placeholder="••••••••" autoComplete="current-password" />
                <PasswordField label="New password" id="edit-new-pass" value={form.newPassword}
                  onChange={set('newPassword')} placeholder="min. 8 chars" autoComplete="new-password" />
                <PasswordField label="Confirm new password" id="edit-confirm-pass" value={form.confirmPassword}
                  onChange={set('confirmPassword')} placeholder="••••••••" error={errors.confirmPassword}
                  autoComplete="new-password" />
              </div>
            )}
          </div>

          {apiError && (
            <p className="rounded border border-[#ef8b72]/20 bg-[#ef8b72]/5 px-3 py-2.5 text-sm text-[#ef8b72]">
              {apiError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-white/10 py-2.5 text-sm text-white/50 transition hover:border-white/20 hover:text-white/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#c8f169] py-2.5 text-sm font-semibold text-[#172015] transition hover:bg-[#d7fa91] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Recent score row ─────────────────────────────────────────

function RecentScoreRow({ entry }) {
  const meta = CATEGORY_META[entry.game.category] ?? { icon: Gamepad2, color: 'text-white/50', bg: 'bg-white/5' }
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.06] py-3 last:border-0">
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${meta.bg}`}>
        <Icon aria-hidden="true" className={`size-3.5 ${meta.color}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.game.name}</p>
        <p className="text-[11px] text-white/30">
          {new Date(entry.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-white/80">{entry.score.toLocaleString('id-ID')}</p>
        <p className="text-[10px] text-white/25">{entry.duration.toFixed(1)}s</p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────

export default function ProfilePage() {
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const fetchProfile = useCallback(() => {
    setLoading(true)
    setError('')
    getProfile()
      .then(setProfile)
      .catch((err) => setError(err.response?.data?.message ?? 'Gagal memuat profil.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center gap-3 text-white/30">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Loading profile…</span>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-sm border border-[#ef8b72]/18 bg-[#ef8b72]/[0.04] p-7" role="alert">
          <p className="text-sm text-[#ef8b72]">{error}</p>
          <button onClick={fetchProfile} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#c8f169] px-4 py-2.5 text-sm font-semibold text-[#172015] transition hover:bg-[#d7fa91]">
            Coba lagi
          </button>
        </div>
      </DashboardLayout>
    )
  }

  const { icon: FavIcon, color: favColor, bg: favBg } = profile.favoriteGame
    ? (CATEGORY_META[profile.favoriteGame.category] ?? { icon: Gamepad2, color: 'text-white/50', bg: 'bg-white/5' })
    : { icon: Gamepad2, color: 'text-white/30', bg: 'bg-white/5' }

  return (
    <DashboardLayout>
      {editing && (
        <EditModal
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={(updated) => setProfile(updated)}
        />
      )}

      {/* ── Hero ── */}
      <header className="animate-rise">
        <div className="relative overflow-hidden border border-white/[0.08] bg-[#171b19] p-6 sm:p-8">
          {/* Lime glow */}
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-[#c8f169]/8 blur-3xl" aria-hidden="true" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Avatar */}
            <AvatarDisplay avatar={profile.avatar} username={profile.username} size="xl" />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#c8f169]">
                {profile.role === 'ADMIN' ? '👑 Admin' : 'Player'}
              </p>
              <h1 className="mt-1 text-3xl font-semibold">{profile.username}</h1>
              <p className="mt-0.5 text-sm text-white/40">{profile.email}</p>
              <p className="mt-1 text-xs text-white/25">
                Member since {new Date(profile.createdAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Edit button */}
            <button
              onClick={() => setEditing(true)}
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/10 px-4 py-2.5 text-sm text-white/55 transition hover:border-[#c8f169]/30 hover:text-[#c8f169] sm:self-auto"
            >
              <Edit3 className="size-4" /> Edit Profile
            </button>
          </div>
        </div>
      </header>

      {/* ── Stats grid ── */}
      <div className="mt-4 grid grid-cols-2 gap-3 animate-rise sm:grid-cols-4">
        <StatItem label="Total Score" value={profile.totalScore.toLocaleString('id-ID')}
          icon={Trophy} color="text-[#c8f169]" />
        <StatItem label="Global Rank" value={`#${profile.rank}`}
          icon={Trophy} color="text-[#FFD700]" />
        <StatItem label="Games Played" value={profile.gamesPlayed.toLocaleString('id-ID')}
          icon={Gamepad2} color="text-[#8fd2dd]" />
        <StatItem label="Achievements"
          value={`${profile.achievementsUnlocked}/${profile.achievementsTotal}`}
          icon={Award} color="text-[#ef8b72]" />
      </div>

      {/* ── Bottom row: favorite game + recent scores ── */}
      <div className="mt-4 grid gap-4 animate-rise-delayed lg:grid-cols-2">
        {/* Favorite game */}
        <div className="border border-white/[0.08] bg-[#171b19] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Favorite Game</p>
          {profile.favoriteGame ? (
            <div className="mt-4 flex items-center gap-4">
              <span className={`grid size-14 shrink-0 place-items-center rounded-xl ${favBg}`}>
                <FavIcon aria-hidden="true" className={`size-6 ${favColor}`} />
              </span>
              <div>
                <p className="text-lg font-semibold">{profile.favoriteGame.name}</p>
                <p className="text-xs text-white/35">{profile.favoriteGame.playCount} plays</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/30">No games played yet.</p>
          )}
        </div>

        {/* Recent scores */}
        <div className="border border-white/[0.08] bg-[#171b19] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Recent Scores</p>
          {profile.recentScores.length > 0 ? (
            <div className="mt-2 divide-y divide-white/[0.06]">
              {profile.recentScores.map((entry) => (
                <RecentScoreRow key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/30">No scores yet. Start playing!</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
