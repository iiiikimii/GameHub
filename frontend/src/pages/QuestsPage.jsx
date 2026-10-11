import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Crown,
  Flame,
  Gamepad2,
  Gift,
  History,
  Loader2,
  PartyPopper,
  RefreshCw,
  Sparkles,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import {
  claimQuestReward,
  equipCosmetic,
  getQuestHistory,
  getQuests,
  getUserCosmetics,
} from '../services/questService.js'

// ─── Format Helpers ──────────────────────────────────────────

function formatSecondsCountdown(seconds) {
  if (seconds <= 0) return 'Resetting now…'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (d > 0) {
    return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
  }
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

const TYPE_CONFIG = {
  DAILY: {
    label: 'Daily Quest',
    badge: 'bg-[#8b8bff]/10 text-[#8b8bff] border-[#8b8bff]/30',
    accent: '#8b8bff',
    icon: Flame,
    sub: 'Resets daily at 00:00 UTC',
  },
  WEEKLY: {
    label: 'Weekly Quest',
    badge: 'bg-[#7dd3fc]/10 text-[#7dd3fc] border-[#7dd3fc]/30',
    accent: '#7dd3fc',
    icon: Calendar,
    sub: 'Resets Mondays at 00:00 UTC',
  },
  SPECIAL: {
    label: 'Special Event',
    badge: 'bg-[#ef8b72]/10 text-[#ef8b72] border-[#ef8b72]/30',
    accent: '#ef8b72',
    icon: Sparkles,
    sub: 'Limited-time challenge',
  },
}

// ─── Reward Claim Modal ──────────────────────────────────────

function ClaimRewardModal({ claimData, onClose }) {
  if (!claimData) return null

  const { questTitle, rewards, progression } = claimData
  const isLevelUp = progression?.leveledUp

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-modal-title"
    >
      <div className="relative w-full max-w-md overflow-hidden border border-[#8b8bff]/40 bg-[#171a2b] p-6 shadow-2xl shadow-[#8b8bff]/10 text-center animate-rise">
        {/* Glow accent */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-48 rounded-full bg-[#8b8bff]/20 blur-3xl" />

        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#8b8bff]/15 text-[#8b8bff] border border-[#8b8bff]/30">
          {isLevelUp ? <PartyPopper className="size-8" /> : <Gift className="size-8" />}
        </div>

        {isLevelUp && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#8b8bff]/20 to-[#7dd3fc]/20 px-3 py-1 text-xs font-bold text-[#8b8bff] border border-[#8b8bff]/30">
            <Sparkles className="size-3.5" /> LEVEL UP! REACHED LEVEL {progression.newLevel}!
          </div>
        )}

        <h3 id="claim-modal-title" className="mt-2 text-2xl font-bold tracking-tight text-white">
          Reward Claimed!
        </h3>
        <p className="mt-1 text-xs text-white/50">{questTitle}</p>

        {/* Rewards earned list */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {rewards.xpClaimed > 0 && (
            <div className="border border-[#8b8bff]/20 bg-[#8b8bff]/5 p-3 rounded-lg">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block">Experience</span>
              <p className="mt-1 text-lg font-bold text-[#8b8bff]">+{rewards.xpClaimed} XP</p>
            </div>
          )}

          {rewards.bonusScoreClaimed > 0 && (
            <div className="border border-[#7dd3fc]/20 bg-[#7dd3fc]/5 p-3 rounded-lg">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block">Score Bonus</span>
              <p className="mt-1 text-lg font-bold text-[#7dd3fc]">+{rewards.bonusScoreClaimed} pts</p>
            </div>
          )}
        </div>

        {rewards.cosmeticsAwarded?.length > 0 && (
          <div className="mt-3 border border-white/10 bg-white/[0.03] p-3 rounded-lg text-left">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block">Item Unlocked</span>
            {rewards.cosmeticsAwarded.map((c, i) => (
              <p key={i} className="mt-1 text-sm font-semibold text-[#ef8b72] flex items-center gap-1.5">
                <Crown className="size-3.5" /> {c.label}
              </p>
            ))}
          </div>
        )}

        {/* Level progression bar */}
        {progression?.levelInfo && (
          <div className="mt-5 border border-white/[0.08] bg-[#111323] p-3.5 rounded-lg text-left">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-white/80">Level {progression.levelInfo.level}</span>
              <span className="text-white/40 font-mono text-[11px]">
                {progression.levelInfo.xpInLevel} / {progression.levelInfo.xpRequiredForNext} XP ({progression.levelInfo.progressPercent}%)
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#8b8bff] to-[#7dd3fc] transition-all duration-500"
                style={{ width: `${progression.levelInfo.progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-[#8b8bff] py-3 text-sm font-bold text-[#172015] shadow-lg shadow-[#8b8bff]/20 transition hover:bg-[#d9dbff]"
        >
          Awesome! Continue
        </button>
      </div>
    </div>
  )
}

// ─── Main Quests Page ────────────────────────────────────────

export default function QuestsPage() {
  const [data, setData] = useState(null)
  const [historyData, setHistoryData] = useState(null)
  const [cosmeticsData, setCosmeticsData] = useState(null)
  const [activeTab, setActiveTab] = useState('ALL') // ALL | DAILY | WEEKLY | SPECIAL | HISTORY | COSMETICS
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState(null)
  const [claimModalData, setClaimModalData] = useState(null)
  const [error, setError] = useState('')
  const [equipping, setEquipping] = useState(false)

  // Countdown state
  const [dailySeconds, setDailySeconds] = useState(0)
  const [weeklySeconds, setWeeklySeconds] = useState(0)

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [questsRes, historyRes, cosmeticsRes] = await Promise.all([
        getQuests(),
        getQuestHistory({ page: 1, limit: 15 }),
        getUserCosmetics(),
      ])

      setData(questsRes)
      setHistoryData(historyRes)
      setCosmeticsData(cosmeticsRes)

      if (questsRes?.resets) {
        setDailySeconds(questsRes.resets.dailyResetSeconds)
        setWeeklySeconds(questsRes.resets.weeklyResetSeconds)
      }
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load quests data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setDailySeconds((prev) => (prev > 0 ? prev - 1 : 0))
      setWeeklySeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Refresh period keys and quest rows when a UTC reset is reached.
  useEffect(() => {
    if (!data || (dailySeconds > 0 && weeklySeconds > 0)) return undefined
    const timeout = setTimeout(loadAllData, 1000)
    return () => clearTimeout(timeout)
  }, [data, dailySeconds, weeklySeconds, loadAllData])

  // Handle claim
  const handleClaim = async (userQuestId) => {
    try {
      setClaimingId(userQuestId)
      const claimResult = await claimQuestReward(userQuestId)
      setClaimModalData(claimResult)
      // Refresh state
      await loadAllData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to claim reward')
    } finally {
      setClaimingId(null)
    }
  }

  // Handle equip cosmetic
  const handleEquipCosmetic = async (type, value) => {
    try {
      setEquipping(true)
      await equipCosmetic({ type, value })
      const [freshCosmetics, freshQuests] = await Promise.all([
        getUserCosmetics(),
        getQuests(),
      ])
      setCosmeticsData(freshCosmetics)
      setData(freshQuests)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update cosmetic')
    } finally {
      setEquipping(false)
    }
  }

  // Filtered quest list
  const filteredQuests = useMemo(() => {
    if (!data?.quests) return []
    if (activeTab === 'ALL') return data.quests
    return data.quests.filter((q) => q.questType === activeTab)
  }, [data, activeTab])

  const player = data?.player
  const levelInfo = player?.levelInfo

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Claim Modal */}
        <ClaimRewardModal
          claimData={claimModalData}
          onClose={() => setClaimModalData(null)}
        />

        {/* ─── Hero Progression Header ─── */}
        <section
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#171a2b] p-6 shadow-xl"
          aria-label="Player Progression Overview"
        >
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-[#8b8bff]/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 size-72 rounded-full bg-[#7dd3fc]/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Player Level & Identity */}
            <div className="flex items-center gap-4">
              {/* Avatar with equipped frame effect */}
              <div
                className={`relative flex size-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-black transition-all ${
                  player?.selectedFrame === 'frame_cyber_lime'
                    ? 'border-2 border-[#8b8bff] bg-[#8b8bff]/15 shadow-[0_0_20px_rgba(139, 139, 255,0.4)] text-[#8b8bff]'
                    : player?.selectedFrame === 'frame_genesis_gold'
                    ? 'border-2 border-amber-400 bg-amber-400/15 shadow-[0_0_20px_rgba(251,191,36,0.4)] text-amber-300'
                    : 'border border-white/10 bg-[#111323] text-[#8b8bff]'
                }`}
              >
                {player?.username ? player.username.slice(0, 2).toUpperCase() : 'GH'}
                {/* Level badge pill */}
                <span className="absolute -bottom-2.5 rounded-full border border-black bg-gradient-to-r from-[#8b8bff] to-[#7dd3fc] px-2.5 py-0.5 text-[10px] font-black uppercase text-[#111323]">
                  LVL {player?.level ?? 1}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight text-white">{player?.username ?? 'Player'}</h1>
                  {player?.selectedTitle && (
                    <span className="rounded-full border border-[#ef8b72]/30 bg-[#ef8b72]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#ef8b72]">
                      {player.selectedTitle}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-white/50">
                  Total XP: <span className="font-semibold text-white/90 font-mono">{player?.xp?.toLocaleString('id-ID') ?? 0}</span> • Total Score: <span className="font-semibold text-white/90 font-mono">{player?.totalScore?.toLocaleString('id-ID') ?? 0}</span>
                </p>

                {/* Progress bar towards next level */}
                <div className="mt-3 w-64 sm:w-80">
                  <div className="flex justify-between text-[11px] font-medium text-white/50">
                    <span>Progress to Level {(player?.level ?? 1) + 1}</span>
                    <span className="font-mono text-white/70">
                      {levelInfo?.xpInLevel ?? 0} / {levelInfo?.xpRequiredForNext ?? 200} XP ({levelInfo?.progressPercent ?? 0}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full bg-gradient-to-r from-[#8b8bff] to-[#7dd3fc] transition-all duration-500"
                      style={{ width: `${levelInfo?.progressPercent ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Countdown timers & rules */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-white/[0.08] bg-[#111323]/90 p-3.5 min-w-[170px]">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8b8bff]">
                  <Clock className="size-3.5" /> Daily Reset
                </div>
                <p className="mt-1 font-mono text-lg font-bold text-white tracking-tight">
                  {formatSecondsCountdown(dailySeconds)}
                </p>
                <span className="text-[10px] text-white/35">Every 00:00 UTC</span>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#111323]/90 p-3.5 min-w-[170px]">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7dd3fc]">
                  <Timer className="size-3.5" /> Weekly Reset
                </div>
                <p className="mt-1 font-mono text-lg font-bold text-white tracking-tight">
                  {formatSecondsCountdown(weeklySeconds)}
                </p>
                <span className="text-[10px] text-white/35">Monday 00:00 UTC</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Navigation Tabs & Refresh ─── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex overflow-x-auto pb-1 sm:pb-0 gap-1.5 rounded-xl border border-white/[0.08] bg-[#171a2b] p-1.5">
            {[
              { id: 'ALL', label: 'All Quests', count: data?.quests?.length },
              { id: 'DAILY', label: 'Daily', count: data?.quests?.filter((q) => q.questType === 'DAILY').length },
              { id: 'WEEKLY', label: 'Weekly', count: data?.quests?.filter((q) => q.questType === 'WEEKLY').length },
              { id: 'SPECIAL', label: 'Events', count: data?.quests?.filter((q) => q.questType === 'SPECIAL').length },
              { id: 'HISTORY', label: 'History', count: historyData?.total },
              { id: 'COSMETICS', label: 'Cosmetics', count: cosmeticsData?.badges?.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-[#8b8bff] text-[#111323] shadow-sm'
                    : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      activeTab === tab.id ? 'bg-[#111323]/20 text-[#111323]' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={loadAllData}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-white/10 bg-[#171a2b] px-3.5 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin text-[#8b8bff]' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ─── Ready to Claim Banner ─── */}
        {data?.summary?.readyToClaimCount > 0 && activeTab !== 'HISTORY' && activeTab !== 'COSMETICS' && (
          <div className="flex items-center justify-between rounded-xl border border-[#8b8bff]/40 bg-[#8b8bff]/10 p-4 shadow-lg shadow-[#8b8bff]/5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-[#8b8bff] text-[#111323]">
                <Gift className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-[#8b8bff]">
                  {data.summary.readyToClaimCount} Quest Reward Ready to Claim!
                </p>
                <p className="text-xs text-white/60">
                  Objective complete. Claim now to receive your XP, score bonus, and exclusive rewards.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Loading Skeleton ─── */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 rounded-xl border border-white/[0.08] bg-[#171a2b] p-5 animate-pulse">
                <div className="h-4 w-28 bg-white/10 rounded" />
                <div className="mt-3 h-5 w-48 bg-white/10 rounded" />
                <div className="mt-2 h-3 w-64 bg-white/5 rounded" />
                <div className="mt-6 h-2 w-full bg-white/10 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* ─── Error State ─── */}
        {!loading && error && (
          <div className="rounded-xl border border-[#ef8b72]/30 bg-[#ef8b72]/10 p-6 text-center">
            <p className="text-sm font-semibold text-[#ef8b72]">{error}</p>
            <button
              onClick={loadAllData}
              className="mt-4 rounded-lg bg-[#ef8b72] px-4 py-2 text-xs font-bold text-[#111323]"
            >
              Retry
            </button>
          </div>
        )}

        {/* ─── Quests Cards Grid (ALL, DAILY, WEEKLY, SPECIAL) ─── */}
        {!loading && !error && activeTab !== 'HISTORY' && activeTab !== 'COSMETICS' && (
          <div className="space-y-4">
            {filteredQuests.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#171a2b] p-12 text-center">
                <Compass className="mx-auto size-12 text-white/20" />
                <h3 className="mt-4 text-base font-semibold text-white">No Quests Available</h3>
                <p className="mt-1 text-xs text-white/40">Check back after the next scheduled reset period.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredQuests.map((quest) => {
                  const typeCfg = TYPE_CONFIG[quest.questType] || TYPE_CONFIG.DAILY
                  const TypeIcon = typeCfg.icon
                  const isReady = quest.isCompleted && !quest.isClaimed
                  const isClaimed = quest.isClaimed

                  return (
                    <div
                      key={quest.userQuestId}
                      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-[#171a2b] p-5 transition hover:border-white/20 ${
                        isReady
                          ? 'border-[#8b8bff]/50 shadow-lg shadow-[#8b8bff]/5 bg-gradient-to-b from-[#1c221e] to-[#171a2b]'
                          : isClaimed
                          ? 'border-white/[0.06] opacity-75'
                          : 'border-white/[0.08]'
                      }`}
                    >
                      <div>
                        {/* Card Header: Type Pill & Target game */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${typeCfg.badge}`}>
                            <TypeIcon className="size-3" />
                            {typeCfg.label}
                          </span>

                          {quest.game ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-white/60">
                              <Gamepad2 className="size-3" />
                              {quest.game.name}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-white/35">Any Mini Game</span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h3 className="mt-3 text-base font-bold text-white tracking-tight">{quest.title}</h3>
                        <p className="mt-1 text-xs text-white/55 leading-relaxed">{quest.description}</p>
                      </div>

                      <div className="mt-5 space-y-3">
                        {/* Progress Header & Target Value */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/45 text-[11px]">Progress</span>
                          <span className="font-mono font-semibold text-white/90">
                            {quest.progress.toLocaleString('id-ID')} / {quest.target.toLocaleString('id-ID')}
                            <span className="ml-1 text-[11px] text-white/40">({quest.progressPercent}%)</span>
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isClaimed
                                ? 'bg-white/30'
                                : quest.isCompleted
                                ? 'bg-[#8b8bff]'
                                : 'bg-gradient-to-r from-[#8b8bff] to-[#7dd3fc]'
                            }`}
                            style={{ width: `${quest.progressPercent}%` }}
                          />
                        </div>

                        {/* Rewards row */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] uppercase font-bold text-white/30 mr-1">Rewards:</span>
                          {quest.rewards.xp > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#8b8bff]/10 border border-[#8b8bff]/20 px-2 py-0.5 text-[10px] font-bold text-[#8b8bff]">
                              <Zap className="size-2.5" /> +{quest.rewards.xp} XP
                            </span>
                          )}

                          {quest.rewards.bonusScore > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#7dd3fc]/10 border border-[#7dd3fc]/20 px-2 py-0.5 text-[10px] font-bold text-[#7dd3fc]">
                              <Trophy className="size-2.5" /> +{quest.rewards.bonusScore} pts
                            </span>
                          )}

                          {quest.rewards.badge && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#ef8b72]/10 border border-[#ef8b72]/20 px-2 py-0.5 text-[10px] font-bold text-[#ef8b72]">
                              <Award className="size-2.5" /> {quest.rewards.badge}
                            </span>
                          )}

                          {quest.rewards.cosmeticType !== 'NONE' && quest.rewards.cosmeticLabel && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                              <Crown className="size-2.5" /> {quest.rewards.cosmeticLabel}
                            </span>
                          )}
                        </div>

                        {/* Action Area */}
                        <div className="pt-2">
                          {isReady ? (
                            <button
                              onClick={() => handleClaim(quest.userQuestId)}
                              disabled={claimingId === quest.userQuestId}
                              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#8b8bff] py-2.5 text-xs font-bold text-[#111323] shadow-md shadow-[#8b8bff]/20 transition hover:bg-[#d9dbff] hover:-translate-y-0.5"
                            >
                              {claimingId === quest.userQuestId ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <>
                                  <Gift className="size-4" />
                                  Claim Reward
                                </>
                              )}
                            </button>
                          ) : isClaimed ? (
                            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/40">
                              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                <CheckCircle2 className="size-3.5" /> Claimed
                              </span>
                              <span className="text-[10px] font-mono">
                                {new Date(quest.claimedAt || quest.completedAt).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-xs text-white/50">
                              <span className="flex items-center gap-1.5">
                                <Clock className="size-3.5 text-white/40" /> In Progress
                              </span>
                              <Link
                                to={quest.game ? `/games/${quest.game.slug}` : '/games'}
                                className="flex items-center gap-1 font-semibold text-[#8b8bff] hover:underline"
                              >
                                Play Game <ChevronRight className="size-3" />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── History Tab ─── */}
        {!loading && !error && activeTab === 'HISTORY' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#171a2b] p-5">
              <h3 className="text-base font-bold text-white">Quest Completion History</h3>
              <p className="mt-1 text-xs text-white/50">
                Log of all verified quests completed and claimed through valid gameplay sessions.
              </p>

              {historyData?.history?.length === 0 ? (
                <div className="py-12 text-center">
                  <History className="mx-auto size-10 text-white/20" />
                  <p className="mt-3 text-sm text-white/40">No completed quests recorded yet.</p>
                </div>
              ) : (
                <div className="mt-5 divide-y divide-white/[0.06]">
                  {historyData?.history?.map((item) => (
                    <div key={item.userQuestId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] uppercase font-bold text-white/40">
                            {item.questType}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-white/50">{item.description}</p>
                        <p className="mt-1 text-[11px] text-white/30 font-mono">
                          Completed: {new Date(item.completedAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.rewards.xp > 0 && (
                          <span className="rounded-md bg-[#8b8bff]/10 px-2 py-1 text-xs font-bold text-[#8b8bff]">
                            +{item.rewards.xp} XP
                          </span>
                        )}
                        {item.rewards.bonusScore > 0 && (
                          <span className="rounded-md bg-[#7dd3fc]/10 px-2 py-1 text-xs font-bold text-[#7dd3fc]">
                            +{item.rewards.bonusScore} pts
                          </span>
                        )}
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                          Claimed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Cosmetics & Badges Tab ─── */}
        {!loading && !error && activeTab === 'COSMETICS' && (
          <div className="space-y-6">
            {/* Badges Collection */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#171a2b] p-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="size-4 text-[#8b8bff]" /> Quest Badges Collection
              </h3>
              <p className="mt-1 text-xs text-white/50">Special badges earned by mastering daily and weekly quests.</p>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {cosmeticsData?.badges?.length === 0 ? (
                  <p className="col-span-full py-6 text-center text-xs text-white/40">
                    No quest badges unlocked yet. Complete weekly or event quests to unlock badges!
                  </p>
                ) : (
                  cosmeticsData?.badges?.map((badge) => (
                    <div key={badge.id} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#111323] p-3.5">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#8b8bff]/15 text-[#8b8bff]">
                        <Award className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">{badge.label}</p>
                        <p className="text-[10px] text-white/40">Unlocked</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Profile Titles */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#171a2b] p-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="size-4 text-[#ef8b72]" /> Unlocked Profile Titles
              </h3>
              <p className="mt-1 text-xs text-white/50">Equip an earned title to display beside your player name.</p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {cosmeticsData?.titles?.length === 0 ? (
                  <p className="col-span-full py-6 text-center text-xs text-white/40">
                    No titles unlocked yet. Complete quest milestones to earn titles like "Score Hunter" or "Grand Tactician"!
                  </p>
                ) : (
                  cosmeticsData?.titles?.map((title) => (
                    <div key={title.id} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#111323] p-3.5">
                      <div>
                        <p className="text-sm font-bold text-white">{title.label}</p>
                        <span className="text-[10px] text-white/40">Title</span>
                      </div>

                      <button
                        onClick={() => handleEquipCosmetic('TITLE', title.isEquipped ? null : title.value)}
                        disabled={equipping}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          title.isEquipped
                            ? 'bg-[#8b8bff] text-[#111323]'
                            : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {title.isEquipped ? 'Equipped' : 'Equip'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Profile Frames */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#171a2b] p-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="size-4 text-[#7dd3fc]" /> Profile Frames / Borders
              </h3>
              <p className="mt-1 text-xs text-white/50">Custom avatar aura borders earned from special events and weekly challenges.</p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {cosmeticsData?.frames?.length === 0 ? (
                  <p className="col-span-full py-6 text-center text-xs text-white/40">
                    No custom frames unlocked yet. Complete the weekly variety quest to unlock "Cyber Lime Neon"!
                  </p>
                ) : (
                  cosmeticsData?.frames?.map((frame) => (
                    <div key={frame.id} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#111323] p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                            frame.value === 'frame_cyber_lime'
                              ? 'border-2 border-[#8b8bff] shadow-[0_0_12px_rgba(139, 139, 255,0.4)] text-[#8b8bff] bg-[#8b8bff]/10'
                              : 'border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)] text-amber-300 bg-amber-400/10'
                          }`}
                        >
                          GH
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{frame.label}</p>
                          <span className="text-[10px] text-white/40">Avatar Border Frame</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleEquipCosmetic('FRAME', frame.isEquipped ? null : frame.value)}
                        disabled={equipping}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          frame.isEquipped
                            ? 'bg-[#8b8bff] text-[#111323]'
                            : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {frame.isEquipped ? 'Equipped' : 'Equip'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
