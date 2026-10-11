import { Bell, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { getNotifications } from '../services/socialService.js'
import InstallAppButton from '../components/InstallAppButton.jsx'

const pageTitles = {
  '/dashboard': { label: 'Dashboard', sub: 'Player overview' },
  '/games': { label: 'Games', sub: 'Arcade' },
  '/ranked': { label: 'Ranked Arena', sub: 'Competitive Seasons' },
  '/quests': { label: 'Quests & Progression', sub: 'Missions & Rewards' },
  '/leaderboard': { label: 'Leaderboard', sub: 'Global rankings' },
  '/challenges': { label: 'Challenges', sub: 'Daily & weekly' },
  '/achievements': { label: 'Achievements', sub: 'Milestones' },
  '/history': { label: 'History', sub: 'Game sessions' },
  '/profile': { label: 'Profile', sub: 'Your account' },
    '/friends': { label: 'Friends', sub: 'GameHub Social' },
    '/chess': { label: 'Chess', sub: 'Play with friends' },
  '/activity': { label: 'Activity Feed', sub: 'Friends activity' },
  '/friends/leaderboard': { label: 'Friends Leaderboard', sub: 'Social rankings' },
  '/notifications': { label: 'Notifications', sub: 'Your updates' },
  '/settings': { label: 'Settings', sub: 'Preferences' },
  '/admin': { label: 'Admin', sub: 'Control panel' },
}

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let active = true
    const refreshUnread = () => {
      getNotifications(1)
        .then((data) => { if (active) setUnreadCount(data.unreadCount || 0) })
        .catch(() => { if (active) setUnreadCount(0) })
    }
    refreshUnread()
    window.addEventListener('gamehub-notifications-updated', refreshUnread)
    return () => {
      active = false
      window.removeEventListener('gamehub-notifications-updated', refreshUnread)
    }
  }, [pathname])

  // Resolve title: exact match first, then prefix match (e.g. /games/:slug)
  const page =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(([key]) => pathname.startsWith(key + '/'))?.[1] ??
    { label: 'GameHub', sub: 'Player hub' }

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? 'GH'

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-white/[0.08] bg-[#111318]/95 px-4 sm:px-6">
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
        <InstallAppButton />

        {/* Notification bell */}
        <Link
          to="/notifications"
          aria-label={`Notifikasi${unreadCount ? `, ${unreadCount} belum dibaca` : ''}`}
          className="relative grid size-9 place-items-center rounded-lg border border-white/[0.08] text-white/45 transition hover:bg-white/5 hover:text-white/80"
        >
          <Bell className="size-[17px]" />
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#ef8b72] px-1 text-[9px] font-bold text-[#111323]">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </Link>

        {/* Avatar */}
        <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.025] py-1.5 pl-2 pr-3">
          <span className="grid size-7 place-items-center rounded-md bg-[#8b8bff]/15 text-[11px] font-bold text-[#8b8bff]">
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
