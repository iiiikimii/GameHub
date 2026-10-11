import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { apiErrorMessage } from '../services/apiErrorMessage.js'
import {
  getBlockedUsers,
  getFriendRequests,
  getFriends,
  removeFriend,
  respondFriendRequest,
  searchUsers,
  sendFriendRequest,
  unblockUser,
} from '../services/socialService.js'

const TABS = [
  ['FRIENDS', 'Friends'], ['INCOMING', 'Incoming Requests'], ['SENT', 'Sent Requests'],
  ['SEARCH', 'Find Players'], ['BLOCKED', 'Blocked'],
]

function Avatar({ user }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#8b8bff]/15 text-sm font-bold text-[#8b8bff]">
      {user.avatar ? <img className="size-full object-cover" src={user.avatar} alt="" /> : user.username?.slice(0, 2).toUpperCase()}
    </span>
  )
}

function Pager({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null
  return (
    <div className="mt-5 flex items-center justify-between text-xs text-white/45">
      <span>Page {pagination.page} of {pagination.totalPages}</span>
      <div className="flex gap-2">
        <button disabled={!pagination.hasPrev} onClick={() => onPage(pagination.page - 1)} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">Previous</button>
        <button disabled={!pagination.hasNext} onClick={() => onPage(pagination.page + 1)} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">Next</button>
      </div>
    </div>
  )
}

export default function SocialPage() {
  const [tab, setTab] = useState('FRIENDS')
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let result
      if (tab === 'FRIENDS') result = await getFriends(page)
      else if (tab === 'INCOMING' || tab === 'SENT') result = await getFriendRequests(tab === 'INCOMING' ? 'incoming' : 'sent', page)
      else if (tab === 'BLOCKED') result = await getBlockedUsers(page)
      else if (searchTerm.length >= 2) result = await searchUsers(searchTerm, page)
      else result = { users: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } }
      setData(result)
    } catch (err) {
      setError(apiErrorMessage(err, 'Data sosial belum dapat dimuat.'))
    } finally {
      setLoading(false)
    }
  }, [tab, page, searchTerm])

  useEffect(() => { load() }, [load])

  async function act(action, successMessage) {
    try {
      setNotice('')
      await action()
      setNotice(successMessage)
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Tindakan belum berhasil. Coba lagi.'))
    }
  }

  function changeTab(next) {
    setTab(next)
    setPage(1)
    setError('')
    setNotice('')
  }

  const entries = data?.friends ?? data?.requests ?? data?.users ?? []

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#8b8bff]/65">GameHub Social</p>
            <h1 className="mt-2 text-3xl font-semibold">Players & friends</h1>
            <p className="mt-2 max-w-xl text-sm text-white/45">Find players, manage requests, and choose who can interact with you.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/chess" className="rounded-lg border border-[#8b8bff]/20 px-3 py-2 text-xs text-[#8b8bff] hover:border-[#8b8bff]/40">Play chess</Link>
            <Link to="/activity" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/65 hover:border-[#8b8bff]/35">Activity feed</Link>
            <Link to="/friends/leaderboard" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/65 hover:border-[#8b8bff]/35">Friends leaderboard</Link>
          </div>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto border-b border-white/[0.08] pb-3">
          {TABS.map(([value, label]) => (
            <button key={value} onClick={() => changeTab(value)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === value ? 'bg-[#8b8bff]/10 text-[#8b8bff]' : 'text-white/45 hover:bg-white/[0.04] hover:text-white/75'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'SEARCH' && (
          <form className="mb-5 flex gap-2" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearchTerm(query.trim()) }}>
            <input aria-label="Search players by username" value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={50} placeholder="Search by username" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-[#8b8bff]/45" />
            <button className="rounded-lg bg-[#8b8bff] px-4 py-3 text-sm font-bold text-[#172015]">Search</button>
          </form>
        )}

        {notice && <p role="status" className="mb-4 rounded-lg border border-[#8b8bff]/20 bg-[#8b8bff]/[0.06] px-4 py-3 text-sm text-[#8b8bff]">{notice}</p>}
        {error && <p role="alert" className="mb-4 rounded-lg border border-[#ef8b72]/25 bg-[#ef8b72]/[0.06] px-4 py-3 text-sm text-[#ef8b72]">{error}</p>}

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#191c31] to-[#131526] shadow-xl shadow-black/10">
          {loading ? <p className="p-8 text-center text-sm text-white/40">Loading players…</p> : entries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-white/75">{tab === 'SEARCH' && !searchTerm ? 'Search for a username to get started' : 'Nothing here yet'}</p>
              <p className="mt-2 text-xs text-white/35">{tab === 'FRIENDS' ? 'Find players and send a friend request.' : 'Your results will appear here.'}</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {entries.map((item) => {
                const user = item.user ?? item
                const friendshipId = item.id ?? item.friendshipId
                const relationship = item.relationship
                return (
                  <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-4 transition-colors hover:bg-white/[0.025] sm:px-5">
                    <Avatar user={user} />
                    <div className="min-w-0 flex-1">
                      <Link to={`/users/${encodeURIComponent(user.username)}`} className="font-semibold text-white/85 hover:text-[#8b8bff]">{user.username}</Link>
                      <p className="mt-1 text-xs text-white/35">
                        {tab === 'FRIENDS' ? `${Number(user.totalScore ?? 0).toLocaleString()} total points` : tab === 'INCOMING' ? 'Sent you a friend request' : tab === 'SENT' ? 'Request pending' : tab === 'BLOCKED' ? 'Blocked account' : relationship?.status === 'ACCEPTED' ? 'Already friends' : relationship?.direction === 'OUTGOING' ? 'Request pending' : `${Number(user.totalScore ?? 0).toLocaleString()} total points`}
                      </p>
                    </div>
                    {tab === 'FRIENDS' && <button onClick={() => window.confirm(`Remove ${user.username} from your friends?`) && act(() => removeFriend(friendshipId), 'Friend removed.')} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 hover:border-[#ef8b72]/40 hover:text-[#ef8b72]">Remove</button>}
                    {tab === 'INCOMING' && <div className="flex gap-2"><button onClick={() => act(() => respondFriendRequest(friendshipId, 'ACCEPT'), 'Friend request accepted.')} className="rounded-lg bg-[#8b8bff] px-3 py-2 text-xs font-bold text-[#172015]">Accept</button><button onClick={() => window.confirm(`Decline ${user.username}'s request?`) && act(() => respondFriendRequest(friendshipId, 'REJECT'), 'Friend request declined.')} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55">Decline</button></div>}
                    {tab === 'SENT' && <button onClick={() => act(() => respondFriendRequest(friendshipId, 'CANCEL'), 'Friend request cancelled.')} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55">Cancel</button>}
                    {tab === 'SEARCH' && <div>{relationship?.direction === 'OUTGOING' ? <span className="rounded-full border border-white/10 px-3 py-2 text-[11px] text-white/40">Pending</span> : relationship?.direction === 'INCOMING' ? <Link to="/friends" className="rounded-lg border border-[#8b8bff]/20 px-3 py-2 text-xs text-[#8b8bff]">View request</Link> : relationship?.status === 'ACCEPTED' ? <span className="rounded-full border border-[#8b8bff]/20 px-3 py-2 text-[11px] text-[#8b8bff]">Friends</span> : <button onClick={() => act(() => sendFriendRequest(user.username), 'Friend request sent.')} className="rounded-lg border border-[#8b8bff]/30 px-3 py-2 text-xs text-[#8b8bff]">Add friend</button>}</div>}
                    {tab === 'BLOCKED' && <button onClick={() => act(() => unblockUser(user.username), 'User unblocked.')} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55">Unblock</button>}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <Pager pagination={data?.pagination} onPage={setPage} />
      </section>
    </DashboardLayout>
  )
}
