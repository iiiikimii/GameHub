import {
  Activity,
  BarChart2,
  Brain,
  Grid2X2,
  RefreshCw,
  Target,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import {
  getAdminActivityTrend,
  getAdminAnalyticsSummary,
  getAdminChallengeStats,
  getAdminGamePopularity,
} from '../services/analyticsService.js'

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const CATEGORY_META = {
  Reflex: { icon: Zap,      color: '#8b8bff' },
  Puzzle: { icon: Grid2X2,  color: '#7dd3fc' },
  Memory: { icon: Brain,    color: '#ef8b72' },
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString('id-ID')
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// ────────────────────────────────────────────────────────────
// Skeleton
// ────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded ${className}`} />
}

function SkeletonStatCard() {
  return (
    <div className="border border-white/[0.08] bg-[#171a2b] p-5">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="mt-4 h-8 w-28" />
      <Skeleton className="mt-2 h-2 w-36" />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Stat card
// ────────────────────────────────────────────────────────────

function StatCard({ label, value, detail, icon: Icon, accentColor = '#8b8bff', badge }) {
  return (
    <div className="border border-white/[0.08] bg-[#171a2b] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{label}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: `${accentColor}18` }}>
          <Icon className="size-4" style={{ color: accentColor }} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-xs text-white/35">{detail}</p>
      {badge && (
        <span className="mt-2.5 inline-block rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-semibold text-white/50">
          {badge}
        </span>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Bar chart (inline SVG — reusable)
// ────────────────────────────────────────────────────────────

function BarChartInline({ data, metricKey, color = '#8b8bff', label, formatValue = fmt }) {
  const svgRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const values = data.map((d) => Number(d[metricKey] ?? 0))
  const maxVal = Math.max(...values, 1)

  const W = 800
  const H = 180
  const PAD_T = 12
  const PAD_B = 28
  const barWidth = values.length > 0 ? W / values.length : 0
  const barGap = Math.min(barWidth * 0.25, 6)
  const barFill = barWidth - barGap

  if (data.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-white/30">
        Tidak ada data untuk periode ini
      </div>
    )
  }

  function handleMove(e, i) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, i })
  }

  return (
    <div className="relative">
      {label && <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">{label}</p>}
      <div className="relative overflow-hidden rounded-lg bg-white/[0.02]">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" onMouseLeave={() => setTooltip(null)}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={0} x2={W} y1={PAD_T + (1 - f) * (H - PAD_T - PAD_B)} y2={PAD_T + (1 - f) * (H - PAD_T - PAD_B)} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
          ))}

          {values.map((val, i) => {
            const x = i * barWidth + barGap / 2
            const barH = (val / maxVal) * (H - PAD_T - PAD_B)
            const y = PAD_T + (H - PAD_T - PAD_B) - barH
            const isHovered = tooltip?.i === i

            return (
              <g key={i}>
                <rect x={x} y={y} width={barFill} height={barH} rx={3}
                  fill={isHovered ? color : `${color}55`}
                  onMouseMove={(e) => handleMove(e, i)} style={{ cursor: 'pointer' }} />
                <rect x={x} y={PAD_T} width={barFill} height={H - PAD_T - PAD_B} fill="transparent"
                  onMouseMove={(e) => handleMove(e, i)} onMouseLeave={() => setTooltip(null)} />
              </g>
            )
          })}

          {data.length > 0 && (() => {
            const indices = data.length <= 7 ? data.map((_, i) => i) : [0, Math.floor(data.length / 2), data.length - 1]
            return indices.map((i) => (
              <text key={i} x={i * barWidth + barWidth / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.3)">
                {String(data[i].date ?? '').slice(5)}
              </text>
            ))
          })()}
        </svg>

        {tooltip != null && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-[#1a1d30] px-3 py-2 text-xs shadow-xl"
            style={{ left: Math.min(tooltip.x + 10, W - 130), top: Math.max(tooltip.y - 60, 4) }}
          >
            <p className="font-semibold text-white/80">{data[tooltip.i]?.date}</p>
            <p className="mt-0.5" style={{ color }}>{label}: <strong>{formatValue(values[tooltip.i])}</strong></p>
            {data[tooltip.i]?.uniquePlayers != null && (
              <p className="text-white/40">Players unik: {fmt(data[tooltip.i].uniquePlayers)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Completion rate pill
// ────────────────────────────────────────────────────────────

function RatePill({ rate }) {
  const color = rate >= 60 ? '#8b8bff' : rate >= 30 ? '#7dd3fc' : '#ef8b72'
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${color}18`, color }}>
      {rate.toFixed(1)}%
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// Filter bar (admin)
// ────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '7 hari', days: 7 },
  { label: '30 hari', days: 30 },
  { label: '90 hari', days: 90 },
]

function AdminFilterBar({ games, filters, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Filter game analytics"
        value={filters.game}
        onChange={(event) => onChange({ ...filters, game: event.target.value })}
        className="h-8 rounded-lg border border-white/10 bg-[#171a2b] px-3 text-xs text-white/70 focus:border-[#8b8bff]/50 focus:outline-none"
      >
        <option value="">Semua game</option>
        {games.map((game) => <option key={game.slug} value={game.slug}>{game.name}</option>)}
      </select>
      {PRESETS.map(({ label, days }) => {
        const from = daysAgo(days - 1)
        const active = filters.date_from === from && filters.date_to === todayStr()
        return (
          <button
            key={label}
            onClick={() => onChange({ ...filters, date_from: from, date_to: todayStr() })}
            className={`h-8 rounded-lg border px-3 text-xs transition ${active ? 'border-[#8b8bff]/40 bg-[#8b8bff]/10 font-semibold text-[#8b8bff]' : 'border-white/10 text-white/40 hover:text-white/70'}`}
          >
            {label}
          </button>
        )
      })}
      <div className="flex items-center gap-1.5">
        <input type="date" aria-label="Dari" value={filters.date_from} max={filters.date_to || todayStr()}
          onChange={(e) => onChange({ ...filters, date_from: e.target.value })}
          className="h-8 rounded-lg border border-white/10 bg-[#171a2b] px-2 text-xs text-white/60 focus:border-[#8b8bff]/50 focus:outline-none" />
        <span className="text-white/20 text-xs">—</span>
        <input type="date" aria-label="Sampai" value={filters.date_to} min={filters.date_from || undefined} max={todayStr()}
          onChange={(e) => onChange({ ...filters, date_to: e.target.value })}
          className="h-8 rounded-lg border border-white/10 bg-[#171a2b] px-2 text-xs text-white/60 focus:border-[#8b8bff]/50 focus:outline-none" />
      </div>
      {(filters.game || filters.date_from || filters.date_to) && (
        <button onClick={() => onChange({ game: '', date_from: daysAgo(29), date_to: todayStr() })}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs text-white/40 hover:text-white/70 transition">
          <X className="size-3" /> Reset
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState('')

  const [games, setGames] = useState([])
  const [gameOptions, setGameOptions] = useState([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [gamesError, setGamesError] = useState('')

  const [challenges, setChallenges] = useState([])
  const [challengesLoading, setChallengesLoading] = useState(true)
  const [challengesError, setChallengesError] = useState('')

  const [trend, setTrend] = useState(null)
  const [trendLoading, setTrendLoading] = useState(true)
  const [trendError, setTrendError] = useState('')

  const [trendMetric, setTrendMetric] = useState('sessions')
  const [trendFilters, setTrendFilters] = useState({ game: '', date_from: daysAgo(29), date_to: todayStr() })

  // ── Load summary + games + challenges once ──
  useEffect(() => {
    let alive = true

    getAdminAnalyticsSummary()
      .then((d) => { if (alive) setSummary(d) })
      .catch((e) => { if (alive) setSummaryError(e.response?.data?.message ?? 'Gagal memuat summary.') })
      .finally(() => { if (alive) setSummaryLoading(false) })

    getAdminGamePopularity()
      .then((d) => { if (alive) setGameOptions(d.map(({ id, name, slug }) => ({ id, name, slug }))) })
      .catch(() => {})

    return () => { alive = false }
  }, [])

  // ── Reload trend when filters change ──
  useEffect(() => {
    let alive = true
    const params = {}
    if (trendFilters.game)      params.game      = trendFilters.game
    if (trendFilters.date_from) params.date_from = trendFilters.date_from
    if (trendFilters.date_to)   params.date_to   = trendFilters.date_to

    getAdminActivityTrend(params)
      .then((d) => { if (alive) setTrend(d) })
      .catch((e) => { if (alive) setTrendError(e.response?.data?.message ?? 'Gagal memuat tren.') })
      .finally(() => { if (alive) setTrendLoading(false) })

    getAdminGamePopularity(params)
      .then((d) => { if (alive) setGames(d) })
      .catch((e) => { if (alive) setGamesError(e.response?.data?.message ?? 'Gagal memuat popularitas game.') })
      .finally(() => { if (alive) setGamesLoading(false) })

    getAdminChallengeStats(params)
      .then((d) => { if (alive) setChallenges(d) })
      .catch((e) => { if (alive) setChallengesError(e.response?.data?.message ?? 'Gagal memuat statistik challenge.') })
      .finally(() => { if (alive) setChallengesLoading(false) })

    return () => { alive = false }
  }, [trendFilters])

  const metricOptions = [
    { key: 'sessions',      label: 'Sesi',          color: '#8b8bff' },
    { key: 'uniquePlayers', label: 'Players unik',   color: '#7dd3fc' },
    { key: 'avgScore',      label: 'Avg skor',       color: '#b8a4ff' },
  ]
  const visibleMetricOptions = trendFilters.game
    ? metricOptions
    : metricOptions.filter((metric) => metric.key !== 'avgScore')
  const activeMetric = visibleMetricOptions.find((metric) => metric.key === trendMetric)

  function handleFilterChange(nextFilters) {
    setTrendLoading(true)
    setTrendError('')
    setGamesLoading(true)
    setGamesError('')
    setChallengesLoading(true)
    setChallengesError('')
    if (!nextFilters.game) setTrendMetric('sessions')
    setTrendFilters(nextFilters)
  }

  return (
    <DashboardLayout>
      <div className="animate-rise pb-12">

        {/* ── Header ───────────────────────────────────────────── */}
        <header className="mb-7">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ef8b72]">Admin · Analytics</p>
          <h1 className="mt-1.5 text-3xl font-bold">Platform Analytics</h1>
          <p className="mt-1 text-sm text-white/40">
            Statistik platform, aktivitas pemain, dan performa game secara keseluruhan.
          </p>
        </header>

        {/* ── Summary stat cards ─────────────────────────────── */}
        <section aria-label="Platform statistics">
          {summaryLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)}
            </div>
          ) : summaryError ? (
            <div className="flex items-center gap-3 rounded-lg border border-[#ef8b72]/20 bg-[#ef8b72]/5 px-5 py-4 text-sm text-[#ef8b72]">
              <RefreshCw className="size-4 shrink-0" /> {summaryError}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <div className="animate-rise-1">
                <StatCard label="Total pengguna" value={fmt(summary.totalUsers)} detail="Akun terdaftar" icon={Users} accentColor="#8b8bff" />
              </div>
              <div className="animate-rise-2">
                <StatCard label="Aktif 30 hari" value={fmt(summary.activeUsers30d)} detail="≥1 sesi dalam 30 hari" icon={Activity} accentColor="#7dd3fc"
                  badge={`7 hari: ${fmt(summary.activeUsers7d)}`} />
              </div>
              <div className="animate-rise-3">
                <StatCard label="Total sesi" value={fmt(summary.totalSessions)} detail="Semua game session" icon={BarChart2} accentColor="#b8a4ff" />
              </div>
              <div className="animate-rise-4">
                <StatCard label="Challenge selesai" value={fmt(summary.totalChallengeCompletions)} detail={`Dari ${fmt(summary.activeChallenges)} challenge aktif`} icon={Target} accentColor="#ef8b72" />
              </div>
            </div>
          )}
        </section>

        {/* ── Activity trend ─────────────────────────────────── */}
        <section aria-labelledby="trend-heading" className="mt-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Aktivitas</p>
              <h2 id="trend-heading" className="mt-1 text-lg font-semibold">Tren Aktivitas Platform</h2>
            </div>
            {/* Metric selector */}
            <div className="flex gap-1.5 flex-wrap">
              {visibleMetricOptions.map(({ key, label, color }) => (
                <button key={key} onClick={() => setTrendMetric(key)}
                  className={`h-7 rounded-full border px-3 text-[11px] transition ${trendMetric === key ? 'border-transparent font-semibold' : 'border-white/10 text-white/40 hover:text-white/70'}`}
                  style={trendMetric === key ? { background: `${color}20`, color, borderColor: `${color}40` } : {}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <AdminFilterBar games={gameOptions} filters={trendFilters} onChange={handleFilterChange} />
            <p className="mt-2 text-[10px] text-white/30">Filter tanggal dan game berlaku untuk tren, popularitas, dan challenge yang jadwalnya sesuai.</p>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-[#171a2b] p-5">
            {trendLoading ? (
              <Skeleton className="h-44 w-full rounded-lg" />
            ) : trendError ? (
              <div className="flex items-center gap-3 rounded-lg border border-[#ef8b72]/20 bg-[#ef8b72]/5 px-4 py-3 text-sm text-[#ef8b72]">
                <RefreshCw className="size-4 shrink-0" /> {trendError}
              </div>
            ) : (
              <BarChartInline
                data={trend?.trend ?? []}
                metricKey={trendMetric}
                color={activeMetric?.color ?? '#8b8bff'}
                label={activeMetric?.label}
              />
            )}

            {/* Trend summary row */}
            {!trendLoading && !trendError && (trend?.trend?.length ?? 0) > 0 && (() => {
              const t = trend.trend
              const totalSessions = t.reduce((a, b) => a + b.sessions, 0)
              const totalPlayers = t.reduce((a, b) => Math.max(a, b.uniquePlayers), 0)
              return (
                <div className="mt-4 flex flex-wrap gap-4 border-t border-white/[0.06] pt-4">
                  <div><p className="text-[10px] text-white/30">Total sesi (periode)</p><p className="mt-0.5 text-sm font-bold">{fmt(totalSessions)}</p></div>
                  <div><p className="text-[10px] text-white/30">Puncak player unik/hari</p><p className="mt-0.5 text-sm font-bold">{fmt(totalPlayers)}</p></div>
                  <div><p className="text-[10px] text-white/30">Hari berdata</p><p className="mt-0.5 text-sm font-bold">{t.length}</p></div>
                </div>
              )
            })()}
          </div>
        </section>

        {/* ── Game popularity ───────────────────────────────── */}
        <section aria-labelledby="games-heading" className="mt-10">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Games</p>
            <h2 id="games-heading" className="mt-1 text-lg font-semibold">Popularitas Game</h2>
          </div>

          {gamesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : gamesError ? (
            <div className="rounded-lg border border-[#ef8b72]/20 bg-[#ef8b72]/5 px-5 py-4 text-sm text-[#ef8b72]">{gamesError}</div>
          ) : games.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 py-12 text-center">
              <BarChart2 className="mb-3 size-8 text-white/15" />
              <p className="text-sm text-white/30">Belum ada data game</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#171a2b]">
              {/* Header */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-white/[0.06] px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">
                <span>Game</span>
                <span className="w-20 text-right">Sesi</span>
                <span className="w-20 text-right">Players</span>
              </div>

              {games.map((g, idx) => {
                const meta = CATEGORY_META[g.category] ?? CATEGORY_META.Reflex
                const Icon = meta.icon
                const maxSessions = games[0]?.totalSessions ?? 1
                const barPct = Math.round((g.totalSessions / maxSessions) * 100)

                return (
                  <div key={g.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/[0.04] px-5 py-4 last:border-b-0">
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Rank */}
                      <span className="shrink-0 text-sm font-bold text-white/20 w-4">{idx + 1}</span>
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `${meta.color}18` }}>
                        <Icon className="size-4" style={{ color: meta.color }} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{g.name}</p>
                        {/* Mini bar */}
                        <div className="mt-1 h-1 w-full max-w-[160px] overflow-hidden rounded-full bg-white/[0.07]">
                          <div className="h-full rounded-full animate-progress" style={{ width: `${barPct}%`, background: meta.color }} />
                        </div>
                      </div>
                    </div>
                    <span className="w-20 text-right text-sm font-semibold">{fmt(g.totalSessions)}</span>
                    <span className="w-20 text-right text-sm text-white/50">{fmt(g.uniquePlayers)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Challenge stats ───────────────────────────────── */}
        <section aria-labelledby="challenges-heading" className="mt-10">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Challenges</p>
            <h2 id="challenges-heading" className="mt-1 text-lg font-semibold">Statistik Partisipasi Challenge</h2>
            <p className="mt-1 text-xs text-white/30">Menampilkan challenge dengan game yang cocok (termasuk challenge umum) dan jadwal yang beririsan. Partisipasi/penyelesaian dihitung sepanjang riwayat karena waktu partisipasi tidak disimpan.</p>
          </div>

          {challengesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : challengesError ? (
            <div className="rounded-lg border border-[#ef8b72]/20 bg-[#ef8b72]/5 px-5 py-4 text-sm text-[#ef8b72]">{challengesError}</div>
          ) : challenges.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 py-12 text-center">
              <Target className="mb-3 size-8 text-white/15" />
              <p className="text-sm text-white/30">Belum ada data challenge</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#171a2b]">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-white/[0.06] px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">
                <span>Challenge</span>
                <span className="w-24 text-right">Peserta</span>
                <span className="w-24 text-right">Selesai</span>
                <span className="w-20 text-right">Rate</span>
              </div>

              {challenges.map((c) => (
                <div key={c.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-white/[0.04] px-5 py-4 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.title}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {c.gameName ? `${c.gameName} · ` : ''}Target: {fmt(c.targetScore)} pts
                      {!c.isActive && <span className="ml-2 text-white/20">· Berakhir</span>}
                    </p>
                  </div>
                  <span className="w-24 text-right text-sm font-semibold">{fmt(c.totalParticipants)}</span>
                  <span className="w-24 text-right text-sm text-white/50">{fmt(c.completions)}</span>
                  <span className="w-20 flex justify-end"><RatePill rate={c.completionRate} /></span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </DashboardLayout>
  )
}
