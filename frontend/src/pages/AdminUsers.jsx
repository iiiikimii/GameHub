import { ChevronLeft, ChevronRight, Edit2, Search, Shield, ShieldOff, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminLayout from '../layouts/AdminLayout.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { adminApi } from '../services/adminService.js'

export default function AdminUsers() {
  const [data, setData] = useState({ users: [], pagination: null })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  
  // Modals state
  const [confirmToggle, setConfirmToggle] = useState(null) // user object
  const [confirmRole, setConfirmRole] = useState(null) // user object
  const [confirmDelete, setConfirmDelete] = useState(null) // user object
  const [actionLoading, setActionLoading] = useState(false)

  const fetchUsers = () => {
    setLoading(true)
    adminApi.getUsers({ page, search })
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timer)
  }, [page, search])

  const handleToggleStatus = async () => {
    if (!confirmToggle) return
    setActionLoading(true)
    try {
      await adminApi.toggleUserActive(confirmToggle.id, !confirmToggle.is_active)
      setConfirmToggle(null)
      fetchUsers()
    } catch (e) {
      alert(e.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleRole = async () => {
    if (!confirmRole) return
    setActionLoading(true)
    const newRole = confirmRole.role === 'ADMIN' ? 'USER' : 'ADMIN'
    try {
      await adminApi.updateUserRole(confirmRole.id, newRole)
      setConfirmRole(null)
      fetchUsers()
    } catch (e) {
      alert(e.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }
  
  const handleDelete = async () => {
    if (!confirmDelete) return
    setActionLoading(true)
    try {
      await adminApi.deleteUser(confirmDelete.id)
      setConfirmDelete(null)
      fetchUsers()
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <AdminLayout title="Users" subtitle="Manage registered players and administrators">
      <div className="mb-6 flex max-w-md items-center gap-2 rounded-lg border border-white/10 bg-[#111512] px-3 py-2 focus-within:border-[#c8f169]/50">
        <Search className="size-4 text-white/40" />
        <input
          type="text"
          placeholder="Search username or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#171b19]">
        <table className="w-full text-left text-sm text-white/70">
          <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-semibold text-white/50 uppercase">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {loading ? (
              <tr><td colSpan="6" className="p-4 text-center text-white/30">Loading...</td></tr>
            ) : data.users.length === 0 ? (
              <tr><td colSpan="6" className="p-4 text-center text-white/30">No users found.</td></tr>
            ) : (
              data.users.map(u => (
                <tr key={u.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{u.username}</div>
                    <div className="text-xs text-white/40">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[#ef8b72]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#ef8b72]">
                        <Shield className="size-3" /> ADMIN
                      </span>
                    ) : (
                      <span className="text-white/40">USER</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{u.total_score.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="text-emerald-400">Active</span>
                    ) : (
                      <span className="text-red-400">Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setConfirmRole(u)} className="p-1.5 text-white/40 hover:text-white" title="Change Role">
                        {u.role === 'ADMIN' ? <ShieldOff className="size-4" /> : <Shield className="size-4" />}
                      </button>
                      <button onClick={() => setConfirmToggle(u)} className="p-1.5 text-white/40 hover:text-white" title="Toggle Status">
                        <Edit2 className="size-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(u)} className="p-1.5 text-red-400/60 hover:text-red-400" title="Delete User">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
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

      {/* Modals */}
      <ConfirmModal
        open={!!confirmToggle}
        title={confirmToggle?.is_active ? "Disable User?" : "Enable User?"}
        message={`Are you sure you want to ${confirmToggle?.is_active ? 'disable' : 'enable'} ${confirmToggle?.username}?`}
        danger={confirmToggle?.is_active}
        loading={actionLoading}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirmToggle(null)}
      />
      <ConfirmModal
        open={!!confirmRole}
        title="Change Role?"
        message={`Change ${confirmRole?.username}'s role to ${confirmRole?.role === 'ADMIN' ? 'USER' : 'ADMIN'}?`}
        danger={false}
        loading={actionLoading}
        onConfirm={handleToggleRole}
        onCancel={() => setConfirmRole(null)}
      />
      <ConfirmModal
        open={!!confirmDelete}
        title="Delete User?"
        message={`This will permanently delete ${confirmDelete?.username} and all their scores. This cannot be undone.`}
        confirmLabel="Delete"
        danger={true}
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </AdminLayout>
  )
}
