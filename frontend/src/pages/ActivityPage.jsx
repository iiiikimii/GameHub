import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getActivityFeed } from '../services/socialService.js'

export default function ActivityPage() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await getActivityFeed(page)) }
    catch (err) { setError(err.response?.data?.message ?? 'Could not load activity.') }
    finally { setLoading(false) }
  }, [page])
  useEffect(() => { load() }, [load])
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-4xl">
        <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#8b8bff]/65">Friends activity</p><h1 className="mt-2 text-3xl font-semibold">Activity feed</h1>
        {error && <p role="alert" className="mt-5 text-sm text-[#ef8b72]">{error}</p>}
        <div className="mt-6 border border-white/[0.08] bg-[#171a2b]">
          {loading ? <p className="p-8 text-center text-sm text-white/40">Loading activity…</p> : data?.activities.length ? <ul className="divide-y divide-white/[0.06]">{data.activities.map((item) => <li key={item.id} className="flex gap-3 px-4 py-5 sm:px-6"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#8b8bff]/10 text-[#8b8bff]">{item.type === 'ACHIEVEMENT_UNLOCKED' ? '✦' : '↗'}</span><div className="min-w-0 flex-1"><p className="text-sm text-white/75"><Link className="font-semibold text-white hover:text-[#8b8bff]" to={`/users/${encodeURIComponent(item.actor.username)}`}>{item.actor.username}</Link> {item.text}{item.score != null && <span className="font-semibold text-[#8b8bff]"> · {item.score.toLocaleString()}</span>}</p><p className="mt-1 text-xs text-white/35">{new Date(item.createdAt).toLocaleString()}</p></div></li>)}</ul> : <p className="p-10 text-center text-sm text-white/40">No friend activity yet. Personal bests and new achievements from you and your friends will appear here.</p>}
        </div>
        {data?.pagination?.totalPages > 1 && <div className="mt-4 flex justify-between text-xs text-white/45"><button disabled={!data.pagination.hasPrev} onClick={() => setPage(page - 1)} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">Previous</button><span className="py-2">Page {page} / {data.pagination.totalPages}</span><button disabled={!data.pagination.hasNext} onClick={() => setPage(page + 1)} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">Next</button></div>}
      </section>
    </DashboardLayout>
  )
}
