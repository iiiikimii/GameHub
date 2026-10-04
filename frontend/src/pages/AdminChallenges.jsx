import { Edit2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminLayout from '../layouts/AdminLayout.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { adminApi } from '../services/adminService.js'

function ChallengeModal({ open, challenge, games, onClose, onSave }) {
  const defaultDate = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ title: '', description: '', game_id: '', target_score: 1000, reward_points: 100, start_date: defaultDate, end_date: defaultDate, is_active: true })
  
  useEffect(() => {
    if (challenge) {
      const s = challenge.start_date.split('T')[0]
      const e = challenge.end_date.split('T')[0]
      setForm({ ...challenge, start_date: s, end_date: e, game_id: challenge.game_id || '' })
    } else {
      setForm({ title: '', description: '', game_id: '', target_score: 1000, reward_points: 100, start_date: defaultDate, end_date: defaultDate, is_active: true })
    }
  }, [challenge, open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    onSave({ ...form, game_id: form.game_id || null })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md border border-white/10 bg-[#171b19] shadow-2xl my-8">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <h2 className="font-semibold">{challenge ? 'Edit Challenge' : 'Add Challenge'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-white/50">Title</label>
            <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full rounded bg-[#111512] px-3 py-2 text-sm text-white border border-white/[0.08]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full rounded bg-[#111512] px-3 py-2 text-sm text-white border border-white/[0.08]" rows={2} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Target Game (Optional)</label>
            <select value={form.game_id} onChange={e => setForm({...form, game_id: e.target.value})} className="w-full rounded bg-[#111512] px-3 py-2 text-sm text-white border border-white/[0.08]">
              <option value="">Any Game</option>
              {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-white/50">Target Score</label>
              <input required type="number" value={form.target_score} onChange={e => setForm({...form, target_score: e.target.value})} className="w-full rounded bg-[#111512] px-3 py-2 text-sm text-white border border-white/[0.08]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Reward Points</label>
              <input required type="number" value={form.reward_points} onChange={e => setForm({...form, reward_points: e.target.value})} className="w-full rounded bg-[#111512] px-3 py-2 text-sm text-white border border-white/[0.08]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-white/50">Start Date</label>
              <input required type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full rounded bg-[#111512] px-3 py-2 text-sm text-white border border-white/[0.08] [color-scheme:dark]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">End Date</label>
              <input required type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full rounded bg-[#111512] px-3 py-2 text-sm text-white border border-white/[0.08] [color-scheme:dark]" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ch_is_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
            <label htmlFor="ch_is_active" className="text-sm">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.07]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-white/50">Cancel</button>
            <button type="submit" className="rounded-full bg-[#c8f169] px-4 py-2 text-sm font-semibold text-[#172015] hover:bg-[#d7fa91]">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminChallenges() {
  const [challenges, setChallenges] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCh, setEditingCh] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [chRes, gRes] = await Promise.all([adminApi.getChallenges(), adminApi.getGames()])
      setChallenges(chRes)
      setGames(gRes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async (data) => {
    try {
      if (editingCh) await adminApi.updateChallenge(editingCh.id, data)
      else await adminApi.createChallenge(data)
      setModalOpen(false)
      fetchData()
    } catch (e) {
      alert(e.response?.data?.message || 'Save failed')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setActionLoading(true)
    try {
      await adminApi.deleteChallenge(confirmDelete.id)
      setConfirmDelete(null)
      fetchData()
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <AdminLayout title="Challenges" subtitle="Manage daily and weekly challenges">
      <div className="mb-4 flex justify-end">
        <button onClick={() => { setEditingCh(null); setModalOpen(true) }} className="flex items-center gap-2 rounded-full bg-[#c8f169] px-4 py-2 text-sm font-semibold text-[#172015] hover:bg-[#d7fa91]">
          <Plus className="size-4" /> Add Challenge
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#171b19]">
        <table className="w-full text-left text-sm text-white/70">
          <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-semibold text-white/50 uppercase">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Target / Reward</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Completions</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {loading ? (
              <tr><td colSpan="6" className="p-4 text-center text-white/30">Loading...</td></tr>
            ) : challenges.length === 0 ? (
              <tr><td colSpan="6" className="p-4 text-center text-white/30">No challenges found.</td></tr>
            ) : (
              challenges.map(c => (
                <tr key={c.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{c.title}</div>
                    <div className="text-xs text-white/40">{c.game_name || 'Any Game'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>Score: {c.target_score}</div>
                    <div className="text-[#c8f169]">+{c.reward_points} pts</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>{c.start_date.split('T')[0]}</div>
                    <div className="text-white/40">to {c.end_date.split('T')[0]}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{c.completed_count}</td>
                  <td className="px-4 py-3">
                    {c.is_active ? <span className="text-emerald-400">Active</span> : <span className="text-red-400">Inactive</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditingCh(c); setModalOpen(true) }} className="p-1.5 text-white/40 hover:text-white" title="Edit Challenge"><Edit2 className="size-4" /></button>
                    <button onClick={() => setConfirmDelete(c)} className="p-1.5 text-red-400/60 hover:text-red-400" title="Delete Challenge"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ChallengeModal open={modalOpen} challenge={editingCh} games={games} onClose={() => setModalOpen(false)} onSave={handleSave} />
      
      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Challenge?"
        message={`Are you sure you want to delete "${confirmDelete?.title}"?`}
        confirmLabel="Delete"
        danger={true}
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </AdminLayout>
  )
}
