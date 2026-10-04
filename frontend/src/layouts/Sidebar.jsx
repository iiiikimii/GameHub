import {
  Award,
  Gamepad2,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Target,
  Trophy,
  UserRound,
  X,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

const playerItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Games', to: '/games', icon: Gamepad2 },
  { label: 'Leaderboard', to: '/leaderboard', icon: Trophy },
  { label: 'Challenges', to: '/challenges', icon: Target },
  { label: 'Achievements', to: '/achievements', icon: Award },
  { label: 'History', to: '/history', icon: History },
]

const accountItems = [
  { label: 'Profile', to: '/profile', icon: UserRound },
  { label: 'Settings', to: '/settings', icon: Settings },
]

const adminItems = [
  { label: 'Admin', to: '/admin', icon: ShieldCheck },
]

function NavItem({ to, icon: Icon, label, onClick, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-all duration-150 ${
          isActive
            ? 'bg-[#c8f169]/10 font-semibold text-[#c8f169]'
            : 'text-white/48 hover:bg-white/[0.04] hover:text-white/80'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="nav-active-indicator" aria-hidden="true" />}
          <Icon aria-hidden="true" className={`size-[17px] shrink-0 ${isActive ? 'text-[#c8f169]' : ''}`} />
          {label}
        </>
      )}
    </NavLink>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="mb-1.5 mt-5 px-3 text-[9px] font-bold uppercase tracking-widest text-white/25 first:mt-0">
      {children}
    </p>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'ADMIN'
  const initials = user?.username?.slice(0, 2).toUpperCase() ?? 'GH'

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <>
      {/* Sidebar panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-white/[0.08] bg-[#0f1311] transition-transform duration-300 ease-out md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/[0.08] px-4">
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className="inline-flex items-center gap-3"
            aria-label="GameHub — Kembali ke dashboard"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-[#c8f169] text-[#172015] shadow-[0_0_12px_rgba(200,241,105,0.3)]">
              <Gamepad2 className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-bold tracking-wide">GAMEHUB</span>
          </NavLink>

          {/* Close button (mobile only) */}
          <button
            onClick={onClose}
            aria-label="Tutup menu navigasi"
            className="grid size-8 place-items-center rounded-lg text-white/40 transition hover:bg-white/5 hover:text-white/70 md:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Navigasi utama"
          className="flex-1 overflow-y-auto px-3 py-4"
        >
          <SectionLabel>Player Hub</SectionLabel>
          {playerItems.map(({ label, to, icon }) => (
            <NavItem
              key={to}
              to={to}
              icon={icon}
              label={label}
              onClick={onClose}
              end={to === '/dashboard'}
            />
          ))}

          <SectionLabel>Account</SectionLabel>
          {accountItems.map(({ label, to, icon }) => (
            <NavItem key={to} to={to} icon={icon} label={label} onClick={onClose} />
          ))}

          {isAdmin && (
            <>
              <SectionLabel>Admin</SectionLabel>
              {adminItems.map(({ label, to, icon }) => (
                <NavItem key={to} to={to} icon={icon} label={label} onClick={onClose} />
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-white/[0.08] p-4">
          {/* User info */}
          <div className="mb-3 flex min-w-0 items-center gap-3 rounded-lg bg-white/[0.03] p-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#c8f169]/15 text-[11px] font-bold text-[#c8f169]">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium leading-none">{user?.username}</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/30">
                {user?.role}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-white/40 transition duration-150 hover:bg-[#ef8b72]/8 hover:text-[#ef8b72]"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
