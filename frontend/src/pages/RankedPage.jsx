import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Filter,
  Gamepad2,
  Gift,
  HelpCircle,
  History,
  Loader2,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import {
  claimSeasonRewards,
  getRankedLeaderboard,
  getRankedProfile,
  getRankedSeasons,
} from '../services/rankedService.js'

// ─── Tier Visual Styles & Icons ──────────────────────────────
const TIER_META = {
  BRONZE: {
    label: 'Bronze',
    color: 'text-[#CD7F32]',
    bg: 'bg-[#CD7F32]/10',
    border: 'border-[#CD7F32]/30',
    glow: 'shadow-[0_0_20px_rgba(205,127,50,0.25)]',
    badge: 'border-[#CD7F32]/40 bg-[#CD7F32]/15 text-[#CD7F32]',
  },
  SILVER: {
    label: 'Silver',
    color: 'text-[#C0C0C0]',
    bg: 'bg-[#C0C0C0]/10',
    border: 'border-[#C0C0C0]/30',
    glow: 'shadow-[0_0_20px_rgba(192,192,192,0.25)]',
    badge: 'border-[#C0C0C0]/40 bg-[#C0C0C0]/15 text-[#C0C0C0]',
  },
  GOLD: {
    label: 'Gold',
    color: 'text-[#FFD700]',
    bg: 'bg-[#FFD700]/10',
    border: 'border-[#FFD700]/30',
    glow: 'shadow-[0_0_25px_rgba(255,215,0,0.3)]',
    badge: 'border-[#FFD700]/40 bg-[#FFD700]/15 text-[#FFD700]',
  },
  PLATINUM: {
    label: 'Platinum',
    color: 'text-[#00E5FF]',
    bg: 'bg-[#00E5FF]/10',
    border: 'border-[#00E5FF]/30',
    glow: 'shadow-[0_0_25px_rgba(0,229,255,0.3)]',
    badge: 'border-[#00E5FF]/40 bg-[#00E5FF]/15 text-[#00E5FF]',
  },
  DIAMOND: {
    label: 'Diamond',
    color: 'text-[#B388FF]',
    bg: 'bg-[#B388FF]/10',
    border: 'border-[#B388FF]/30',
    glow: 'shadow-[0_0_30px_rgba(179,136,255,0.35)]',
    badge: 'border-[#B388FF]/40 bg-[#B388FF]/15 text-[#B388FF]',
  },
}

function formatCountdown(seconds) {
  if (seconds <= 0) return 'Season Ended'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

function formatUtcDate(value) {
  return `${new Date(value).toLocaleString(undefined, {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short',
  })} UTC`
}

export default function RankedPage() {
  const [profileData, setProfileData] = useState(null)
  const [leaderboardData, setLeaderboardData] = useState(null)
  const [seasonsList, setSeasonsList] = useState([])
  const [rankedRules, setRankedRules] = useState(null)
  const [selectedSeasonId, setSelectedSeasonId] = useState(null)
  const [selectedTierFilter, setSelectedTierFilter] = useState('')
  const [activeTab, setActiveTab] = useState('OVERVIEW') // OVERVIEW | LEADERBOARD | MATCHES | RULES | REWARDS
  const [page, setPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState('')

  const loadData = useCallback(async (seasonId = null, lbPage = 1, tier = '', matchesPage = 1) => {
    try {
      setLoading(true)
      setError('')
      const [profRes, lbRes, seasonsRes] = await Promise.all([
        getRankedProfile(seasonId, matchesPage),
        getRankedLeaderboard({ seasonId, page: lbPage, limit: 15, tier: tier || null }),
        getRankedSeasons(),
      ])

      setProfileData(profRes)
      setLeaderboardData(lbRes)
      setSeasonsList(seasonsRes.seasons || [])
      setRankedRules(seasonsRes.rules || null)
      if (profRes?.season) {
        setCountdown(profRes.season.isUpcoming
          ? profRes.season.secondsUntilStart || 0
          : profRes.season.secondsRemaining || 0)
        if (!seasonId) setSelectedSeasonId(profRes.season.id)
      }
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load ranked data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(selectedSeasonId, page, selectedTierFilter, historyPage)
  }, [loadData, selectedSeasonId, page, selectedTierFilter, historyPage])

  // Countdown timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleClaimSeasonReward = async () => {
    if (!profileData?.season?.id) return
    try {
      setClaiming(true)
      const res = await claimSeasonRewards(profileData.season.id)
      alert(`Success! Season rewards claimed: +${res.rewardsGranted.xp} XP, +${res.rewardsGranted.bonusScore} pts!`)
      await loadData(selectedSeasonId, page, selectedTierFilter, historyPage)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to claim season reward')
    } finally {
      setClaiming(false)
    }
  }

  const season = profileData?.season
  const player = profileData?.player
  const tierMeta = TIER_META[player?.tier] || TIER_META.BRONZE

  if (!loading && !error && !season) {
    return (
      <DashboardLayout>
        <section className="rounded-2xl border border-white/[0.08] bg-[#171a2b] p-8 text-center">
          <Trophy className="mx-auto size-10 text-white/25" />
          <h1 className="mt-4 text-xl font-bold text-white">No Ranked Season Available</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-white/55">
            Ranked seasons have not been scheduled yet. Your regular scores and leaderboard remain available while you wait for the next season.
          </p>
          <Link to="/leaderboard" className="mt-5 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/75 hover:text-white">
            View Regular Leaderboard
          </Link>
        </section>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ─── Hero Season & Rank Overview Card ─── */}
        <section
          className={`relative overflow-hidden rounded-2xl border bg-[#171a2b] p-6 sm:p-8 transition-all ${tierMeta.border}`}
          aria-label="Player Ranked Season Overview"
        >
          {/* Ambient tier glow */}
          <div
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: tierMeta.color }}
          />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Player rank identity */}
            <div className="flex items-center gap-5">
              {/* Tier Emblem Box */}
              <div
                className={`relative flex size-24 shrink-0 flex-col items-center justify-center rounded-2xl border-2 text-center shadow-2xl ${tierMeta.border} ${tierMeta.bg} ${tierMeta.glow}`}
              >
                <Trophy className={`size-9 ${tierMeta.color}`} />
                <span className={`mt-1 text-xs font-black uppercase tracking-wider ${tierMeta.color}`}>
                  {player?.tier || 'BRONZE'}
                </span>
                <span className="absolute -bottom-2 rounded-full bg-[#111323] px-2 py-0.5 text-[9px] font-mono font-bold text-white/70 border border-white/10">
                  {player?.rp ?? 0} RP
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight text-white">{player?.username ?? 'Player'}</h1>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${tierMeta.badge}`}>
                    {player?.tier} TIER
                  </span>
                  {player?.selectedTitle && (
                    <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-300">
                      {player.selectedTitle}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-white/50">
                  Ranked Position: <span className="font-bold text-white font-mono">#{player?.rankPosition ?? '-'}</span> of {player?.totalPlayers ?? 0} players • Win Rate: <span className="font-bold text-[#8b8bff] font-mono">{player?.winRate ?? 0}%</span> ({player?.wins ?? 0}W - {player?.losses ?? 0}L)
                </p>

                {/* Progress to next tier */}
                {player?.tierInfo && (
                  <div className="mt-3.5 w-72 sm:w-96">
                    <div className="flex justify-between text-[11px] font-medium text-white/55">
                      <span>
                        {player.tierInfo.nextTier ? `Progress to ${player.tierInfo.nextTierLabel}` : 'Apex Rank Achieved'}
                      </span>
                      <span className="font-mono text-white/80">
                        {player.tierInfo.nextTier
                          ? `${player.tierInfo.rpInTier} / ${player.tierInfo.rpNeededForNext} RP (${player.tierInfo.progressPercent}%)`
                          : `${player.rp} RP`}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/40">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${player.tierInfo.progressPercent}%`,
                          backgroundColor: tierMeta.color,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Season status & switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Season info badge */}
              <div className="rounded-xl border border-white/[0.08] bg-[#111323] p-4 min-w-[200px]">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
                    <span className="flex items-center gap-1.5 text-[#8b8bff]">
                    <Clock className="size-3.5" /> {season?.isEnded ? 'Season Concluded' : season?.isActive ? 'Active Season' : season?.isUpcoming ? 'Upcoming Season' : 'Season Scheduled'}
                  </span>
                  <span>S{season?.seasonNumber}</span>
                </div>
                <h3 className="mt-1 font-bold text-sm text-white truncate">{season?.title}</h3>
                <p className="mt-1 font-mono text-lg font-bold text-white tracking-tight">
                  {season?.isEnded
                    ? 'Season Ended'
                    : season?.isUpcoming
                    ? `Starts in ${formatCountdown(countdown)}`
                    : formatCountdown(countdown)}
                </p>
                <p className="text-[10px] text-white/35">
                  {season ? `${formatUtcDate(season.startDate)} – ${formatUtcDate(season.endDate)}` : ''}
                </p>
              </div>

              {/* Season rewards claim button if ended */}
              {season?.isEnded && !player?.rewardClaimed && player?.matchesPlayed > 0 && (
                <button
                  onClick={handleClaimSeasonReward}
                  disabled={claiming}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-[#8b8bff] px-5 py-3 text-xs font-black uppercase text-[#111323] shadow-lg shadow-amber-400/20 transition hover:scale-105"
                >
                  {claiming ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
                  Claim Season Rewards
                </button>
              )}

              {season?.isEnded && player?.rewardClaimed && (
                <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="size-4" /> Season Reward Claimed
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── Navigation Tabs & Season Switcher ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex overflow-x-auto pb-1 sm:pb-0 gap-1.5 rounded-xl border border-white/[0.08] bg-[#171a2b] p-1.5">
            {[
              { id: 'OVERVIEW', label: 'Rank Overview' },
              { id: 'LEADERBOARD', label: 'Season Leaderboard' },
              { id: 'MATCHES', label: 'Match History' },
              { id: 'REWARDS', label: 'Season Rewards' },
              { id: 'RULES', label: 'Rules & Fair Play' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-[#8b8bff] text-[#111323] shadow-sm'
                    : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Season dropdown selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="season-select" className="text-xs text-white/40 whitespace-nowrap">
              Season:
            </label>
            <select
              id="season-select"
              value={selectedSeasonId || ''}
              onChange={(e) => {
                setSelectedSeasonId(Number(e.target.value))
                setHistoryPage(1)
              }}
              className="rounded-lg border border-white/10 bg-[#171a2b] px-3 py-1.5 text-xs font-semibold text-white outline-none"
            >
              {seasonsList.map((s) => (
                <option key={s.id} value={s.id}>
                  Season {s.season_number}: {s.title} {s.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── Loading State ─── */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl border border-white/[0.08] bg-[#171a2b] p-5 animate-pulse" />
            ))}
          </div>
        )}

        {/* ─── Error State ─── */}
        {!loading && error && (
          <div className="rounded-xl border border-[#ef8b72]/30 bg-[#ef8b72]/10 p-6 text-center">
            <p className="text-sm font-semibold text-[#ef8b72]">{error}</p>
            <button
              onClick={() => loadData(selectedSeasonId, page, selectedTierFilter, historyPage)}
              className="mt-4 rounded-lg bg-[#ef8b72] px-4 py-2 text-xs font-bold text-[#111323]"
            >
              Retry
            </button>
          </div>
        )}

        {/* ─── TAB: OVERVIEW ─── */}
        {!loading && !error && activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Stat Cards */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#171a2b] p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Rank Rating</span>
              <p className="mt-2 text-3xl font-black text-white font-mono">{player?.rp ?? 0} RP</p>
              <p className="mt-1 text-xs text-white/50">
                Peak this season: <span className="font-semibold text-[#8b8bff]">{player?.peakRp ?? 0} RP</span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#171a2b] p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Matches & Record</span>
              <p className="mt-2 text-3xl font-black text-white font-mono">
                {player?.matchesPlayed ?? 0} <span className="text-sm text-white/40 font-normal">games</span>
              </p>
              <p className="mt-1 text-xs text-white/50">
                <span className="text-emerald-400 font-semibold">{player?.wins ?? 0} Wins</span> •{' '}
                <span className="text-[#ef8b72] font-semibold">{player?.losses ?? 0} Losses</span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#171a2b] p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Competitive Tier</span>
              <p className={`mt-2 text-3xl font-black font-mono ${tierMeta.color}`}>{player?.tier}</p>
              <p className="mt-1 text-xs text-white/50">Standardized across all verified arcade mini games</p>
            </div>

            {/* Quick Play Action Banner */}
            <div className="md:col-span-3 rounded-2xl border border-[#8b8bff]/30 bg-gradient-to-r from-[#8b8bff]/10 via-[#171a2b] to-[#7dd3fc]/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-xl bg-[#8b8bff] text-[#111323] font-black">
                  <Swords className="size-6" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Ready for Ranked Matches?</h3>
                  <p className="text-xs text-white/55">
                    Every valid score submitted in Reaction Test, Number Rush, or Memory Match automatically contributes to your RP and season standing.
                  </p>
                </div>
              </div>

              <Link
                to="/games"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8b8bff] px-6 py-3 text-xs font-bold text-[#111323] shadow-lg shadow-[#8b8bff]/20 transition hover:bg-[#d9dbff] shrink-0"
              >
                <Gamepad2 className="size-4" /> Play Ranked Games
              </Link>
            </div>
          </div>
        )}

        {/* ─── TAB: LEADERBOARD ─── */}
        {!loading && !error && activeTab === 'LEADERBOARD' && (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3 rounded-xl border border-white/[0.08] bg-[#171a2b] p-3">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Filter className="size-3.5" /> Tier Filter:
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {['', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedTierFilter(t)
                      setPage(1)
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      selectedTierFilter === t
                        ? 'bg-[#8b8bff] text-[#111323]'
                        : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {t || 'All Tiers'}
                  </button>
                ))}
              </div>
            </div>

            {/* Current user sticky banner */}
            {leaderboardData?.currentUser && (
              <div className="flex items-center justify-between rounded-xl border border-[#8b8bff]/40 bg-[#8b8bff]/10 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-[#8b8bff] font-mono font-bold text-sm text-[#111323]">
                    #{leaderboardData.currentUser.rank}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      {leaderboardData.currentUser.username} (You)
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${TIER_META[leaderboardData.currentUser.tier]?.badge}`}>
                        {leaderboardData.currentUser.tier}
                      </span>
                    </p>
                    <p className="text-xs text-white/60">
                      {leaderboardData.currentUser.rp} RP • {leaderboardData.currentUser.wins}W - {leaderboardData.currentUser.losses}L ({leaderboardData.currentUser.winRate}%)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#171a2b]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-white/80">
                  <thead className="border-b border-white/[0.08] bg-[#111323] text-[10px] font-bold uppercase tracking-wider text-white/40">
                    <tr>
                      <th className="px-5 py-3.5">Rank</th>
                      <th className="px-5 py-3.5">Player</th>
                      <th className="px-5 py-3.5">Tier</th>
                      <th className="px-5 py-3.5">Rating (RP)</th>
                      <th className="px-5 py-3.5">Matches</th>
                      <th className="px-5 py-3.5">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {leaderboardData?.entries?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-xs text-white/40">
                          No ranked players found for this season / tier filter.
                        </td>
                      </tr>
                    ) : (
                      leaderboardData?.entries?.map((row) => {
                        const m = TIER_META[row.tier] || TIER_META.BRONZE
                        return (
                          <tr key={row.id} className="transition hover:bg-white/[0.02]">
                            <td className="px-5 py-4 font-mono font-bold text-white/90">
                              {row.rank === 1 ? '🥇 #1' : row.rank === 2 ? '🥈 #2' : row.rank === 3 ? '🥉 #3' : `#${row.rank}`}
                            </td>
                            <td className="px-5 py-4 font-semibold text-white">
                              {row.username}
                              {row.selectedTitle && (
                                <span className="ml-2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50">
                                  {row.selectedTitle}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${m.badge}`}>
                                {row.tier}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-mono font-bold text-white tracking-tight">
                              {row.rp.toLocaleString('id-ID')} RP
                            </td>
                            <td className="px-5 py-4 text-xs text-white/60 font-mono">
                              {row.matchesPlayed} games ({row.wins}W / {row.losses}L)
                            </td>
                            <td className="px-5 py-4 font-mono font-bold text-[#8b8bff]">
                              {row.winRate}%
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {leaderboardData?.pagination?.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/[0.08] px-5 py-3 text-xs text-white/50">
                  <span>
                    Page {leaderboardData.pagination.page} of {leaderboardData.pagination.totalPages} ({leaderboardData.pagination.total} players)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!leaderboardData.pagination.hasPrev}
                      className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-30"
                    >
                      <ChevronLeft className="size-3.5 inline mr-1" /> Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!leaderboardData.pagination.hasNext}
                      className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-30"
                    >
                      Next <ChevronRight className="size-3.5 inline ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: MATCH HISTORY ─── */}
        {!loading && !error && activeTab === 'MATCHES' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#171a2b] p-5">
              <h3 className="text-base font-bold text-white">Ranked Session History</h3>
              <p className="mt-1 text-xs text-white/50">
                Score validation, duration, and RP/tier changes for each ranked session in this season.
              </p>

              {profileData?.recentMatches?.length === 0 ? (
                <div className="py-12 text-center text-xs text-white/40">
                  <History className="mx-auto size-10 text-white/20 mb-3" />
                  No ranked matches played in this season yet. Start playing mini games to see rating logs!
                </div>
              ) : (
                <div className="mt-5 divide-y divide-white/[0.06]">
                  {profileData?.recentMatches?.map((m) => {
                    const isWin = m.result === 'WIN'
                    const isLoss = m.result === 'LOSS'
                    return (
                      <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-lg font-bold text-xs ${
                              isWin
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : isLoss
                                ? 'bg-[#ef8b72]/15 text-[#ef8b72] border border-[#ef8b72]/30'
                                : 'bg-white/10 text-white/60 border border-white/10'
                            }`}
                          >
                            {m.result}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-white flex items-center gap-2">
                              {m.game.name}
                              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
                                Score: {m.score.toLocaleString('id-ID')}
                              </span>
                            </p>
                            <p className="mt-0.5 text-[11px] text-white/35 font-mono">
                              {new Date(m.createdAt).toLocaleString()} • Duration: {m.duration}s
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p
                              className={`text-sm font-mono font-black ${
                                m.rpChange > 0
                                  ? 'text-emerald-400'
                                  : m.rpChange < 0
                                  ? 'text-[#ef8b72]'
                                  : 'text-white/60'
                              }`}
                            >
                              {m.rpChange > 0 ? `+${m.rpChange}` : m.rpChange} RP
                            </p>
                            <p className="text-[10px] font-mono text-white/40">
                              {m.rpBefore} → {m.rpAfter} RP
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase rounded border px-2 py-1 ${TIER_META[m.tierAfter]?.badge}`}>
                            {m.tierAfter}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {profileData?.matchesPagination?.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3 text-xs text-white/50">
                  <span>
                    Page {profileData.matchesPagination.page} of {profileData.matchesPagination.totalPages} ({profileData.matchesPagination.total} sessions)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                      disabled={!profileData.matchesPagination.hasPrev}
                      className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-30"
                    >
                      <ChevronLeft className="mr-1 inline size-3.5" /> Previous
                    </button>
                    <button
                      onClick={() => setHistoryPage((current) => current + 1)}
                      disabled={!profileData.matchesPagination.hasNext}
                      className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-30"
                    >
                      Next <ChevronRight className="ml-1 inline size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: REWARDS ─── */}
        {!loading && !error && activeTab === 'REWARDS' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#171a2b] p-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gift className="size-4 text-[#8b8bff]" /> Season {season?.seasonNumber} End-of-Season Rewards
              </h3>
              <p className="mt-1 text-xs text-white/50">
                Rewards are awarded based on your highest peak tier achieved during the season once the season has concluded.
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {profileData?.seasonRewards?.map((rew) => {
                  const m = TIER_META[rew.minTier] || TIER_META.BRONZE
                  return (
                    <div
                      key={rew.minTier}
                      className={`rounded-xl border p-4 flex flex-col justify-between ${
                        rew.isEligible ? `${m.border} bg-white/[0.02]` : 'border-white/[0.06] opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${m.badge}`}>
                            {rew.minTier}
                          </span>
                          {rew.isEligible && (
                            <span className="text-[10px] font-bold text-[#8b8bff] flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> Eligible
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-1.5 text-xs">
                          {rew.badge && (
                            <p className="text-white/80 flex items-center gap-1.5">
                              <Award className="size-3.5 text-[#ef8b72]" /> {rew.badge}
                            </p>
                          )}
                          {rew.title && (
                            <p className="text-purple-300 flex items-center gap-1.5">
                              <Crown className="size-3.5" /> Title: "{rew.title}"
                            </p>
                          )}
                          {rew.frame && (
                            <p className="text-[#7dd3fc] flex items-center gap-1.5">
                              <Sparkles className="size-3.5" /> Frame: {rew.frame}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                        <span className="text-[#8b8bff]">+{rew.xpReward} XP</span>
                        <span className="text-[#7dd3fc]">+{rew.bonusScore} pts</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: RULES ─── */}
        {!loading && !error && activeTab === 'RULES' && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#171a2b] p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="size-4 text-[#8b8bff]" /> Transparent Ranked Rules & Rating Math
              </h3>
              <p className="mt-1 text-xs text-white/50">
                How GameHub computes fair competitive ratings across disparate arcade mini games.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white/70">
              <div className="rounded-xl border border-white/[0.08] bg-[#111323] p-4 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Shield className="size-4 text-[#8b8bff]" /> Anti-Cross-Game Distortion Benchmark
                </h4>
                <p>
                  Games have distinct score scales. Raw scores are never compared directly: the backend applies a separate valid range and score band to each eligible game. These are score-band results, not head-to-head matches.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#111323] p-4 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Zap className="size-4 text-[#7dd3fc]" /> Tier Progression & Protection
                </h4>
                <p>
                  RP changes by current tier and score-band result. A win at 85% or higher of that game's valid maximum can add up to 9 RP; session duration is validated but does not change rating.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#111323] p-4 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Calendar className="size-4 text-[#ef8b72]" /> Seasonal Integrity & Retention
                </h4>
                <p>
                  Seasons operate on strict UTC schedules. When a new season starts, previous season records are preserved indefinitely. Peak RP earned during a season determines end-of-season rewards.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#111323] p-4 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" /> Idempotent Anti-Cheat Validation
                </h4>
                <p>
                  All RP math is executed in backend database transactions with unique constraints per session. Duplicate score submissions or network retries are detected and rejected without award duplication.
                </p>
              </div>
            </div>

            {rankedRules && (
              <div className="space-y-5 text-xs text-white/70">
                <div>
                  <h4 className="mb-2 font-bold text-white">Eligible Games and Score Bands</h4>
                  <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                    <table className="w-full min-w-[700px] text-left">
                      <thead className="bg-[#111323] text-[10px] uppercase tracking-wider text-white/45">
                        <tr>
                          <th className="px-4 py-3">Game</th>
                          <th className="px-4 py-3">Valid Score</th>
                          <th className="px-4 py-3">Valid Duration</th>
                          <th className="px-4 py-3">Loss</th>
                          <th className="px-4 py-3">Draw</th>
                          <th className="px-4 py-3">Win</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {rankedRules.games.map((game) => (
                          <tr key={game.slug}>
                            <td className="px-4 py-3 font-semibold text-white">{game.name}</td>
                            <td className="px-4 py-3 font-mono">{game.minScore}–{game.maxScore}</td>
                            <td className="px-4 py-3 font-mono">{game.minDuration}–{game.maxDuration}s</td>
                            <td className="px-4 py-3">&lt; {game.drawLow}</td>
                            <td className="px-4 py-3">{game.drawLow}–{game.drawHigh}</td>
                            <td className="px-4 py-3">&gt; {game.drawHigh}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-bold text-white">Base RP per Ranked Session</h4>
                  <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                    <table className="w-full min-w-[540px] text-left">
                      <thead className="bg-[#111323] text-[10px] uppercase tracking-wider text-white/45">
                        <tr>
                          <th className="px-4 py-3">Tier</th>
                          <th className="px-4 py-3">RP Range</th>
                          <th className="px-4 py-3">Win</th>
                          <th className="px-4 py-3">Draw</th>
                          <th className="px-4 py-3">Loss</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {rankedRules.tiers.map((tier) => {
                          const changes = rankedRules.baseRpChanges[tier.tier]
                          return (
                            <tr key={tier.tier}>
                              <td className="px-4 py-3 font-semibold text-white">{TIER_META[tier.tier]?.label || tier.tier}</td>
                              <td className="px-4 py-3 font-mono">{tier.maxRp === null ? `${tier.minRp}+` : `${tier.minRp}–${tier.maxRp}`}</td>
                              <td className="px-4 py-3 font-mono text-emerald-300">+{changes.WIN}</td>
                              <td className="px-4 py-3 font-mono">{changes.DRAW > 0 ? `+${changes.DRAW}` : changes.DRAW}</td>
                              <td className="px-4 py-3 font-mono text-[#ef8b72]">{changes.LOSS}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2">
                    On wins, if score ÷ that game's maximum score is at least 0.85, bonus RP is round((normalized score − 0.85) × 60), capped at +{rankedRules.performanceBonus.maxRp}. Losses cannot reduce RP below {rankedRules.floorRp}. Draws include both score-band boundaries.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
