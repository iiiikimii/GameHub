import { BarChart2, Gamepad2, ShieldAlert, Swords, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminLayout from '../layouts/AdminLayout.jsx'
import { adminApi } from '../services/adminService.js'

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="glass-card rounded-xl p-5 hover:-translate-y-1 transition-transform">
      <div className="flex items-center gap-4">
        <span className={`grid size-12 shrink-0 place-items-center rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.2)] ${color.bg}`}>
          <Icon aria-hidden="true" className={`size-5 ${color.text}`} />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">{label}</p>
          <p className="heading-gradient mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load stats'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout title="Overview" subtitle="Platform metrics and summary">
      {loading && <div className="text-sm text-white/40">Loading stats...</div>}
      
      {error && (
        <div className="mb-6 flex items-start gap-3 border border-[#ef8b72]/20 bg-[#ef8b72]/10 p-4">
          <ShieldAlert className="size-5 shrink-0 text-[#ef8b72]" />
          <p className="text-sm text-[#ef8b72]">{error}</p>
        </div>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={Users}
            color={{ bg: 'bg-[#8fd2dd]/10', text: 'text-[#8fd2dd]' }}
          />
          <StatCard
            label="Active Games"
            value={stats.activeGames.toLocaleString()}
            icon={Gamepad2}
            color={{ bg: 'bg-[#c8f169]/10', text: 'text-[#c8f169]' }}
          />
          <StatCard
            label="Active Challenges"
            value={stats.activeChallenges.toLocaleString()}
            icon={Swords}
            color={{ bg: 'bg-[#ef8b72]/10', text: 'text-[#ef8b72]' }}
          />
          <StatCard
            label="Total Scores"
            value={stats.totalScores.toLocaleString()}
            icon={BarChart2}
            color={{ bg: 'bg-white/10', text: 'text-white/70' }}
          />
          
          <div className="col-span-full mt-4 grid gap-4 sm:grid-cols-3">
             <div className="glass-card rounded-xl p-5 text-center transition hover:-translate-y-1">
               <p className="heading-gradient text-3xl font-bold">{stats.totalSessions.toLocaleString()}</p>
               <p className="mt-1 text-xs font-bold uppercase tracking-widest text-emerald-400">Game Sessions</p>
             </div>
             <div className="glass-card rounded-xl p-5 text-center transition hover:-translate-y-1">
               <p className="heading-gradient text-3xl font-bold">{stats.totalScoreSum.toLocaleString()}</p>
               <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#c8f169]">Total Points Earned</p>
             </div>
             <div className="glass-card rounded-xl p-5 text-center transition hover:-translate-y-1">
               <p className="heading-gradient text-3xl font-bold">{stats.totalAchievementsUnlocked.toLocaleString()}</p>
               <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#8fd2dd]">Achievements Unlocked</p>
             </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
