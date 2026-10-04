import { Bell, Menu, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

const pageTitles = {
  '/dashboard': { label: 'Dashboard', sub: 'Player overview' },
  '/games': { label: 'Games', sub: 'Arcade' },
  '/leaderboard': { label: 'Leaderboard', sub: 'Global rankings' },
  '/challenges': { label: 'Challenges', sub: 'Daily & weekly' },
  '/achievements': { label: 'Achievements', sub: 'Milestones' },
  '/history': { label: 'History', sub: 'Game sessions' },
  '/profile': { label: 'Profile', sub: 'Your account' },
  '/settings': { label: 'Settings', sub: 'Preferences' },
  '/admin': { label: 'Admin', sub: 'Control panel' },
}

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth()
  const { pathname } = useLocation()

  // Resolve title: exact match first, then prefix match (e.g. /games/:slug)
  const page =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(([key]) => pathname.startsWith(key + '/'))?.[1] ??
    { label: 'GameHub', sub: 'Player hub' }

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? 'GH'

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-white/[0.08] bg-[#111512]/90 px-4 backdrop-blur-md sm:px-6">
      {/* Mobile menu trigger */}
      <button
        onClick={onMenuClick}
        aria-label="Buka menu navigasi"
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] text-white/55 transition hover:bg-white/5 hover:text-white/80 md:hidden"
      >
        <Menu className="size-[18px]" />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="hidden text-[10px] font-semibold uppercase tracking-wider text-white/28 sm:block">
            {page.sub}
          </p>
          <span className="hidden text-white/20 sm:block" aria-hidden="true">/</span>
          <p className="truncate text-sm font-semibold text-white/80">{page.label}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search hint (decorative) */}
        <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/30 lg:flex">
          <Search className="size-3.5" aria-hidden="true" />
          <span>Quick search</span>
          <kbd className="ml-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-white/25">
            ⌘K
          </kbd>
        </div>

        {/* Notification bell */}
        <button
          aria-label="Notifikasi"
          className="relative grid size-9 place-items-center rounded-lg border border-white/[0.08] text-white/45 transition hover:bg-white/5 hover:text-white/80"
        >
          <Bell className="size-[17px]" />
          {/* Unread dot */}
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#ef8b72]" aria-hidden="true" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] py-1.5 pl-2 pr-3 transition hover:bg-white/[0.05]">
          <span className="grid size-7 place-items-center rounded-full bg-[#c8f169]/15 text-[11px] font-bold text-[#c8f169]">
            {initials}
          </span>
          <span className="hidden text-[13px] font-medium text-white/65 sm:block">
            {user?.username}
          </span>
        </div>
      </div>
    </header>
  )
}
