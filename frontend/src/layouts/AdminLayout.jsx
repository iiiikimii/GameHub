import {
  BarChart2,
  Gamepad2,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Shield,
  Swords,
  Users,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/admin',            label: 'Overview',    icon: LayoutDashboard },
  { to: '/admin/users',      label: 'Users',       icon: Users },
  { to: '/admin/games',      label: 'Games',       icon: Gamepad2 },
  { to: '/admin/challenges', label: 'Challenges',  icon: Swords },
  { to: '/admin/scores',     label: 'Scores',      icon: BarChart2 },
]

function NavItem({ to, label, icon: Icon, exact }) {
  const { pathname } = useLocation()
  const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + '/')
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition
        ${active
          ? 'bg-[#c8f169]/10 text-[#c8f169]'
          : 'text-white/45 hover:bg-white/5 hover:text-white/75'
        }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  )
}

export default function AdminLayout({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen bg-[#0c0f0d] text-[#f4f4ed]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-white/[0.07] bg-[#111512]">
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.07] px-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#c8f169] text-[#172015]">
            <Shield className="size-4" />
          </span>
          <div>
            <p className="text-sm font-bold leading-none">Admin</p>
            <p className="text-[10px] text-white/30 leading-none mt-0.5">Control Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          <NavItem to="/admin" label="Overview"   icon={LayoutDashboard} exact />
          <NavItem to="/admin/users"      label="Users"       icon={Users} />
          <NavItem to="/admin/games"      label="Games"       icon={Gamepad2} />
          <NavItem to="/admin/challenges" label="Challenges"  icon={Swords} />
          <NavItem to="/admin/scores"     label="Scores"      icon={BarChart2} />
        </nav>

        {/* Footer links */}
        <div className="border-t border-white/[0.07] p-3 space-y-0.5">
          <Link to="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/40 transition hover:bg-white/5 hover:text-white/70">
            <ListOrdered className="size-4 shrink-0" /> Back to App
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-56 flex min-h-screen flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#0c0f0d]/90 px-6 backdrop-blur-sm">
          <div>
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
            {subtitle && <p className="text-xs text-white/35">{subtitle}</p>}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c8f169]/20 bg-[#c8f169]/8 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c8f169]">
            <Shield className="size-3" /> Admin
          </span>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
