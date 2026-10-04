import { BarChart2, Gamepad2, ShieldAlert, Swords, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminLayout from '../layouts/AdminLayout.jsx'
import { adminApi } from '../services/adminService.js'

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="border border-white/[0.08] bg-[#171b19] p-5">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${color.bg}`}>
          <Icon aria-hidden="true" className={`size-4 ${color.text}`} />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
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
             <div className="border border-white/[0.05] p-4 text-center">
               <p className="text-xl font-semibold text-emerald-400">{stats.totalSessions.toLocaleString()}</p>
               <p className="text-xs text-white/40">Game Sessions</p>
             </div>
             <div className="border border-white/[0.05] p-4 text-center">
               <p className="text-xl font-semibold text-[#c8f169]">{stats.totalScoreSum.toLocaleString()}</p>
               <p className="text-xs text-white/40">Total Points Earned</p>
             </div>
             <div className="border border-white/[0.05] p-4 text-center">
               <p className="text-xl font-semibold text-[#8fd2dd]">{stats.totalAchievementsUnlocked.toLocaleString()}</p>
               <p className="text-xs text-white/40">Achievements Unlocked</p>
             </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
