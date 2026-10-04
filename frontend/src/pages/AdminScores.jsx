import { ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminLayout from '../layouts/AdminLayout.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { adminApi } from '../services/adminService.js'

export default function AdminScores() {
  const [data, setData] = useState({ scores: [], pagination: null })
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [search, setSearch] = useState('')
  const [game, setGame] = useState('')
  const [sort, setSort] = useState('date_desc')
  const [page, setPage] = useState(1)

  const [confirmDelete, setConfirmDelete] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = () => {
    setLoading(true)
    adminApi.getScores({ page, search, game, sort })
      .then(setData)
      .finally(() => setLoading(false))
  }

  // Fetch games for filter dropdown
  useEffect(() => {
    adminApi.getGames().then(setGames).catch(console.error)
  }, [])

  useEffect(() => {
    const timer = setTimeout(fetchData, 300)
    return () => clearTimeout(timer)
  }, [page, search, game, sort])

  const handleDelete = async () => {
    if (!confirmDelete) return
    setActionLoading(true)
    try {
      await adminApi.deleteScore(confirmDelete.id)
      setConfirmDelete(null)
      fetchData()
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <AdminLayout title="Scores" subtitle="View and manage player scores">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-white/10 bg-[#111512] px-3 py-2 focus-within:border-[#c8f169]/50">
          <Search className="size-4 text-white/40" />
          <input
            type="text"
            placeholder="Search username..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
          />
        </div>
        
        <select 
          value={game} 
          onChange={e => { setGame(e.target.value); setPage(1) }}
          className="rounded-lg border border-white/10 bg-[#111512] px-3 py-2 text-sm text-white outline-none focus:border-[#c8f169]/50"
        >
          <option value="">All Games</option>
          {games.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
        </select>
        
        <select 
          value={sort} 
          onChange={e => { setSort(e.target.value); setPage(1) }}
          className="rounded-lg border border-white/10 bg-[#111512] px-3 py-2 text-sm text-white outline-none focus:border-[#c8f169]/50"
        >
          <option value="date_desc">Newest First</option>
          <option value="date_asc">Oldest First</option>
          <option value="score_desc">Highest Score</option>
          <option value="score_asc">Lowest Score</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#171b19]">
        <table className="w-full text-left text-sm text-white/70">
          <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-semibold text-white/50 uppercase">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Game</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {loading ? (
              <tr><td colSpan="6" className="p-4 text-center text-white/30">Loading...</td></tr>
            ) : data.scores.length === 0 ? (
              <tr><td colSpan="6" className="p-4 text-center text-white/30">No scores found.</td></tr>
            ) : (
              data.scores.map(s => (
                <tr key={s.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">{s.user.username}</td>
                  <td className="px-4 py-3 text-xs text-white/60">{s.game.name}</td>
                  <td className="px-4 py-3 font-bold text-[#c8f169]">{s.score.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs">{s.duration.toFixed(1)}s</td>
                  <td className="px-4 py-3 text-xs">{new Date(s.createdAt).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setConfirmDelete(s)} className="p-1.5 text-red-400/60 hover:text-red-400" title="Delete Score"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.pagination && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-white/40">Total: {data.pagination.total}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={!data.pagination.hasPrev} className="p-1 disabled:opacity-30"><ChevronLeft className="size-5"/></button>
            <span>{page} / {data.pagination.totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!data.pagination.hasNext} className="p-1 disabled:opacity-30"><ChevronRight className="size-5"/></button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Score?"
        message={`Are you sure you want to delete this score of ${confirmDelete?.score} by ${confirmDelete?.user.username}? The user's total score will be recalculated.`}
        confirmLabel="Delete"
        danger={true}
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </AdminLayout>
  )
}
