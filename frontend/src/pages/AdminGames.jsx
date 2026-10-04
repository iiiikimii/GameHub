import { Edit2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminLayout from '../layouts/AdminLayout.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { adminApi } from '../services/adminService.js'

function GameModal({ open, game, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', slug: '', description: '', category: 'Reflex', difficulty: 'Easy', is_active: true })
  
  useEffect(() => {
    if (game) setForm(game)
    else setForm({ name: '', slug: '', description: '', category: 'Reflex', difficulty: 'Easy', is_active: true })
  }, [game, open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-white/10 bg-[#171b19] shadow-2xl">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <h2 className="font-semibold">{game ? 'Edit Game' : 'Add Game'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-white/50">Name</label>
            <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded bg-[#111512] px-3 py-2 text-sm text-white border border-white/[0.08]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Slug</label>
            <input required type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full rounded bg-[#111512] px-3 py-2 text-sm text-white border border-white/[0.08]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Category</label>
            <select required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full rounded bg-[#111512] px-3 py-2 text-sm text-white border border-white/[0.08]">
              <option value="Reflex">Reflex</option>
              <option value="Puzzle">Puzzle</option>
              <option value="Memory">Memory</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Difficulty</label>
            <select required value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})} className="w-full rounded bg-[#111512] px-3 py-2 text-sm text-white border border-white/[0.08]">
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
            <label htmlFor="is_active" className="text-sm">Active</label>
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

export default function AdminGames() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGame, setEditingGame] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchGames = () => {
    setLoading(true)
    adminApi.getGames().then(setGames).finally(() => setLoading(false))
  }

  useEffect(() => { fetchGames() }, [])

  const handleSave = async (data) => {
    try {
      if (editingGame) await adminApi.updateGame(editingGame.id, data)
      else await adminApi.createGame(data)
      setModalOpen(false)
      fetchGames()
    } catch (e) {
      alert(e.response?.data?.message || 'Save failed')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setActionLoading(true)
    try {
      await adminApi.deleteGame(confirmDelete.id)
      setConfirmDelete(null)
      fetchGames()
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <AdminLayout title="Games" subtitle="Manage available games">
      <div className="mb-4 flex justify-end">
        <button onClick={() => { setEditingGame(null); setModalOpen(true) }} className="flex items-center gap-2 rounded-full bg-[#c8f169] px-4 py-2 text-sm font-semibold text-[#172015] hover:bg-[#d7fa91]">
          <Plus className="size-4" /> Add Game
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#171b19]">
        <table className="w-full text-left text-sm text-white/70">
          <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-semibold text-white/50 uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Difficulty</th>
              <th className="px-4 py-3">Total Scores</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {loading ? (
              <tr><td colSpan="6" className="p-4 text-center text-white/30">Loading...</td></tr>
            ) : games.length === 0 ? (
              <tr><td colSpan="6" className="p-4 text-center text-white/30">No games found.</td></tr>
            ) : (
              games.map(g => (
                <tr key={g.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">{g.name} <span className="text-xs text-white/40 block">{g.slug}</span></td>
                  <td className="px-4 py-3">{g.category}</td>
                  <td className="px-4 py-3">{g.difficulty}</td>
                  <td className="px-4 py-3 tabular-nums">{g.total_scores}</td>
                  <td className="px-4 py-3">
                    {g.is_active ? <span className="text-emerald-400">Active</span> : <span className="text-red-400">Inactive</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditingGame(g); setModalOpen(true) }} className="p-1.5 text-white/40 hover:text-white" title="Edit Game"><Edit2 className="size-4" /></button>
                    <button onClick={() => setConfirmDelete(g)} className="p-1.5 text-red-400/60 hover:text-red-400" title="Delete Game"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <GameModal open={modalOpen} game={editingGame} onClose={() => setModalOpen(false)} onSave={handleSave} />
      
      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Game?"
        message={`Are you sure you want to delete ${confirmDelete?.name}? This might break score associations.`}
        confirmLabel="Delete"
        danger={true}
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </AdminLayout>
  )
}
