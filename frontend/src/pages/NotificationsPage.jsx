import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { markAllNotificationsRead, markNotificationRead, getNotifications } from '../services/socialService.js'

function notificationText(item) {
  if (item.type === 'FRIEND_REQUEST') return 'sent you a friend request.'
  if (item.type === 'FRIEND_ACCEPTED') return 'accepted your friend request.'
  if (item.activity?.type === 'ACHIEVEMENT_UNLOCKED') return `unlocked ${item.activity.achievementName}.`
  return `set a personal best in ${item.activity?.gameName || 'a game'}.`
}

export default function NotificationsPage() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await getNotifications(page)) }
    catch (err) { setError(err.response?.data?.message ?? 'Could not load notifications.') }
    finally { setLoading(false) }
  }, [page])
  useEffect(() => { load() }, [load])
  async function markAll() {
    try { await markAllNotificationsRead(); await load() }
    catch (err) { setError(err.response?.data?.message ?? 'Could not update notifications.') }
  }
  async function markOne(id) {
    try { await markNotificationRead(id); await load() }
    catch (err) { setError(err.response?.data?.message ?? 'Could not update notification.') }
  }
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#8b8bff]/65">Your updates</p><h1 className="mt-2 text-3xl font-semibold">Notifications</h1><p className="mt-2 text-xs text-white/40">{data?.unreadCount ?? 0} unread</p></div><button disabled={!data?.unreadCount} onClick={markAll} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 disabled:opacity-30">Mark all read</button></div>
        {error && <p role="alert" className="mt-5 text-sm text-[#ef8b72]">{error}</p>}
        <div className="mt-6 border border-white/[0.08] bg-[#171a2b]">
          {loading ? <p className="p-8 text-center text-sm text-white/40">Loading notifications…</p> : data?.notifications.length ? <ul className="divide-y divide-white/[0.06]">{data.notifications.map((item) => <li key={item.id} className={`flex items-center gap-3 px-4 py-4 sm:px-6 ${item.isRead ? '' : 'bg-[#8b8bff]/[0.035]'}`}><span className={`size-2 shrink-0 rounded-full ${item.isRead ? 'bg-transparent' : 'bg-[#8b8bff]'}`} /><div className="min-w-0 flex-1"><p className="text-sm text-white/75">{item.actor ? <><Link to={`/users/${encodeURIComponent(item.actor.username)}`} className="font-semibold text-white hover:text-[#8b8bff]">{item.actor.username}</Link> {notificationText(item)}</> : `A player ${notificationText(item)}`}</p><p className="mt-1 text-xs text-white/35">{new Date(item.createdAt).toLocaleString()}</p></div>{item.type === 'FRIEND_REQUEST' && <Link to="/friends" className="text-xs text-[#8b8bff]">Respond</Link>}{!item.isRead && <button onClick={() => markOne(item.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55">Mark read</button>}</li>)}</ul> : <p className="p-10 text-center text-sm text-white/40">You are all caught up. New friend and gaming activity will show here.</p>}
        </div>
        {data?.pagination?.totalPages > 1 && <div className="mt-4 flex justify-between text-xs text-white/45"><button disabled={!data.pagination.hasPrev} onClick={() => setPage(page - 1)} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">Previous</button><span className="py-2">Page {page} / {data.pagination.totalPages}</span><button disabled={!data.pagination.hasNext} onClick={() => setPage(page + 1)} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">Next</button></div>}
      </section>
    </DashboardLayout>
  )
}
