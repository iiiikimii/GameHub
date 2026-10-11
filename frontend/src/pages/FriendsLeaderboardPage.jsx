import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getFriendsLeaderboard } from '../services/socialService.js'

export default function FriendsLeaderboardPage() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await getFriendsLeaderboard(page)) }
    catch (err) { setError(err.response?.data?.message ?? 'Could not load leaderboard.') }
    finally { setLoading(false) }
  }, [page])
  useEffect(() => { load() }, [load])
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-4xl">
        <Link to="/friends" className="text-xs text-white/40 hover:text-[#8b8bff]">← Back to friends</Link>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[.24em] text-[#8b8bff]/65">Social rankings</p><h1 className="mt-2 text-3xl font-semibold">Friends leaderboard</h1>
        <p className="mt-2 text-xs text-white/40">Sorted by the existing cumulative total points metric across games. This is separate from Ranked RP.</p>
        {error && <p role="alert" className="mt-5 text-sm text-[#ef8b72]">{error}</p>}
        <div className="mt-6 border border-white/[0.08] bg-[#171a2b]">
          {loading ? <p className="p-8 text-center text-sm text-white/40">Loading leaderboard…</p> : data?.entries.length ? <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left"><thead><tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-widest text-white/35"><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Player</th><th className="px-4 py-3 text-right">Points</th><th className="px-4 py-3 text-right">Global</th></tr></thead><tbody>{data.entries.map((entry) => <tr key={entry.id} className={`border-b border-white/[0.04] last:border-0 ${entry.isCurrentUser ? 'bg-[#8b8bff]/[0.04]' : ''}`}><td className="px-4 py-4 text-sm font-bold text-[#8b8bff]">#{entry.rank}</td><td className="px-4 py-4"><Link to={`/users/${encodeURIComponent(entry.username)}`} className="text-sm font-semibold text-white/80 hover:text-[#8b8bff]">{entry.username}{entry.isCurrentUser ? ' (you)' : ''}</Link></td><td className="px-4 py-4 text-right text-sm tabular-nums">{entry.totalScore.toLocaleString()}</td><td className="px-4 py-4 text-right text-xs text-white/40">#{entry.globalRank}</td></tr>)}</tbody></table></div> : <p className="p-10 text-center text-sm text-white/40">Add some friends to compare scores here.</p>}
        </div>
        {data?.pagination?.totalPages > 1 && <div className="mt-4 flex justify-between text-xs text-white/45"><button disabled={!data.pagination.hasPrev} onClick={() => setPage(page - 1)} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">Previous</button><span className="py-2">Page {page} / {data.pagination.totalPages}</span><button disabled={!data.pagination.hasNext} onClick={() => setPage(page + 1)} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">Next</button></div>}
      </section>
    </DashboardLayout>
  )
}
