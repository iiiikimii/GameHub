import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { blockUser, getPublicProfile, removeFriend, respondFriendRequest, sendFriendRequest } from '../services/socialService.js'

function Stat({ label, value }) {
  return <div className="border border-white/[0.08] bg-[#171a2b] p-4"><p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">{label}</p><p className="mt-2 text-2xl font-bold">{Number(value ?? 0).toLocaleString()}</p></div>
}

export default function PublicProfilePage() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setProfile(await getPublicProfile(username)) }
    catch (err) { setError(err.response?.data?.message ?? 'Could not load this profile.') }
    finally { setLoading(false) }
  }, [username])

  useEffect(() => { load() }, [load])

  async function act(action, message) {
    try { await action(); setNotice(message); await load() }
    catch (err) { setError(err.response?.data?.message ?? 'Action failed.') }
  }

  const relationship = profile?.relationship
  let actions = null
  if (profile && !profile.isSelf) {
    if (!relationship) actions = <button onClick={() => act(() => sendFriendRequest(profile.username), 'Friend request sent.')} className="rounded-lg bg-[#8b8bff] px-4 py-2.5 text-sm font-bold text-[#172015]">Add friend</button>
    else if (relationship.direction === 'OUTGOING') actions = <button onClick={() => act(() => respondFriendRequest(relationship.id, 'CANCEL'), 'Request cancelled.')} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/65">Cancel request</button>
    else if (relationship.direction === 'INCOMING') actions = <div className="flex gap-2"><button onClick={() => act(() => respondFriendRequest(relationship.id, 'ACCEPT'), 'Friend request accepted.')} className="rounded-lg bg-[#8b8bff] px-4 py-2.5 text-sm font-bold text-[#172015]">Accept request</button><button onClick={() => window.confirm(`Decline ${profile.username}'s request?`) && act(() => respondFriendRequest(relationship.id, 'REJECT'), 'Request declined.')} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/65">Decline</button></div>
    else actions = <button onClick={() => window.confirm(`Remove ${profile.username} from your friends?`) && act(() => removeFriend(relationship.id), 'Friend removed.')} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/65">Remove friend</button>
  }

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-4xl">
        <Link to="/friends" className="text-xs text-white/40 hover:text-[#8b8bff]">← Back to friends</Link>
        {loading ? <p className="py-16 text-center text-sm text-white/40">Loading profile…</p> : error ? <p role="alert" className="mt-5 rounded-lg border border-[#ef8b72]/25 bg-[#ef8b72]/[0.06] p-4 text-sm text-[#ef8b72]">{error}</p> : profile && (
          <>
            {notice && <p role="status" className="mt-4 rounded-lg border border-[#8b8bff]/20 bg-[#8b8bff]/[0.06] p-3 text-sm text-[#8b8bff]">{notice}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-4 border border-white/[0.08] bg-[#171a2b] p-5 sm:p-7">
              <span className="grid size-16 place-items-center overflow-hidden rounded-full bg-[#8b8bff]/15 text-lg font-bold text-[#8b8bff]">{profile.avatar ? <img className="size-full object-cover" src={profile.avatar} alt="" /> : profile.username.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b8bff]/65">Player profile</p><h1 className="mt-1 truncate text-2xl font-semibold">{profile.username}</h1><p className="mt-1 text-xs text-white/40">Level {profile.level}{profile.selectedTitle ? ` · ${profile.selectedTitle}` : ''} · Member since {new Date(profile.memberSince).toLocaleDateString()}</p></div>
              {actions}
              {!profile.isSelf && <button onClick={() => window.confirm(`Block ${profile.username}? This removes any friendship and prevents further social interaction.`) && act(() => blockUser(profile.username), 'User blocked.')} className="rounded-lg border border-[#ef8b72]/25 px-3 py-2.5 text-xs text-[#ef8b72]">Block</button>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Total points" value={profile.totalScore} /><Stat label="Games played" value={profile.gamesPlayed} /><Stat label="Achievements" value={profile.achievementsUnlocked} /><Stat label="Friends" value={profile.friendsCount} /></div>
            <div className="mt-7 border border-white/[0.08] bg-[#171a2b] p-5 sm:p-6">
              <h2 className="text-sm font-semibold">Recent achievements</h2>
              {profile.achievements.length === 0 ? <p className="mt-5 text-sm text-white/40">No achievements unlocked yet.</p> : <ul className="mt-4 divide-y divide-white/[0.06]">{profile.achievements.map((item) => <li key={item.id} className="flex items-center gap-3 py-3"><span className="grid size-9 place-items-center rounded-lg bg-[#8b8bff]/10 text-[#8b8bff]">✦</span><div><p className="text-sm text-white/80">{item.name}</p><p className="mt-1 text-xs text-white/35">{item.description}</p></div></li>)}</ul>}
            </div>
            <p className="mt-4 text-xs text-white/30">Public profile data excludes email, account role, private game sessions, and account settings.</p>
          </>
        )}
      </section>
    </DashboardLayout>
  )
}
