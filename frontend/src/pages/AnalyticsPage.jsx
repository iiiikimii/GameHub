import {
  BarChart2,
  Brain,
  Gamepad2,
  Grid2X2,
  RefreshCw,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getGames } from '../services/gameService.js'
import { getPlayerSummary, getPlayerTrend } from '../services/analyticsService.js'

// ────────────────────────────────────────────────────────────
// Constants & helpers
// ────────────────────────────────────────────────────────────

const CATEGORY_META = {
  Reflex: { icon: Zap,      color: '#8b8bff', label: 'Reflex' },
  Puzzle: { icon: Grid2X2,  color: '#7dd3fc', label: 'Puzzle' },
  Memory: { icon: Brain,    color: '#ef8b72', label: 'Memory' },
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString('id-ID')
}

function fmtDuration(sec) {
  if (sec == null) return '—'
  const s = Number(sec)
  if (s < 1) return `${Math.round(s * 1000)}ms`
  if (s < 60) return `${s.toFixed(2)}s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

function fmtDateTime(value) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
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
// Skeleton components
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

function StatCard({ label, value, detail, icon: Icon, accentColor = '#8b8bff' }) {
  return (
    <div className="border border-white/[0.08] bg-[#171a2b] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{label}</p>
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl"
          style={{ background: `${accentColor}18` }}
        >
          <Icon className="size-4" style={{ color: accentColor }} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold leading-none">{value}</p>
      {detail && <p className="mt-1.5 text-xs text-white/35">{detail}</p>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Per-game breakdown card
// ────────────────────────────────────────────────────────────

function GameBreakdownCard({ game }) {
  const meta = CATEGORY_META[game.category] ?? CATEGORY_META.Reflex
  const Icon = meta.icon
  const pct = game.bestScore > 0
    ? Math.round((game.avgScore / game.bestScore) * 100)
    : 0

  return (
    <div className="border border-white/[0.08] bg-[#171a2b] p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ background: `${meta.color}18` }}
        >
          <Icon className="size-5" style={{ color: meta.color }} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-none">{game.name}</p>
          <p className="mt-0.5 text-[11px] text-white/35">{game.category} · {game.playCount} games</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Best', value: fmt(game.bestScore) },
          { label: 'Avg',  value: fmt(game.avgScore) },
          { label: game.category === 'Reflex' ? 'Best time' : 'Worst', value: game.category === 'Reflex' ? fmtDuration(game.bestDurationSec) : fmt(game.worstScore) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-white/[0.03] p-2.5">
            <p className="text-[10px] text-white/35">{label}</p>
            <p className="mt-0.5 text-sm font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Avg vs best progress bar */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-[10px] text-white/35">
          <span>Avg / Best</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="animate-progress h-full rounded-full"
            style={{ width: `${pct}%`, background: meta.color }}
          />
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Inline SVG bar-chart (no library needed)
// ────────────────────────────────────────────────────────────

function TrendChart({ data, metricKey = 'avgScore', color = '#8b8bff', label = 'Avg Score' }) {
  const svgRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const values = data.map((d) => Number(d[metricKey]))
  const maxVal = Math.max(...values, 1)

  const W = 800
  const H = 180
  const PAD_L = 0
  const PAD_R = 0
  const PAD_T = 12
  const PAD_B = 28

  const barWidth = values.length > 0 ? (W - PAD_L - PAD_R) / values.length : 0
  const barGap = Math.min(barWidth * 0.25, 6)
  const barFill = barWidth - barGap

  if (data.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-white/30">
        Tidak ada data untuk filter ini
      </div>
    )
  }

  function handleMouseMove(e, i) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      date: data[i].date,
      value: values[i],
      sessions: data[i].sessions,
    })
  }

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">{label}</p>
      <div className="relative overflow-hidden rounded-lg bg-white/[0.02]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-44 w-full"
          aria-label={`${label} trend chart`}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Horizontal guide lines */}
          {[0.25, 0.5, 0.75, 1].map((fraction) => (
            <line
              key={fraction}
              x1={PAD_L}
              x2={W - PAD_R}
              y1={PAD_T + (1 - fraction) * (H - PAD_T - PAD_B)}
              y2={PAD_T + (1 - fraction) * (H - PAD_T - PAD_B)}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4 4"
            />
          ))}

          {/* Bars */}
          {values.map((val, i) => {
            const x = PAD_L + i * barWidth + barGap / 2
            const barH = ((val / maxVal) * (H - PAD_T - PAD_B))
            const y = PAD_T + (H - PAD_T - PAD_B) - barH

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barFill}
                  height={barH}
                  rx={3}
                  fill={`${color}60`}
                  className="transition-all duration-150"
                  onMouseMove={(e) => handleMouseMove(e, i)}
                  style={{ cursor: 'pointer' }}
                />
                {/* Hover highlight overlay */}
                <rect
                  x={x}
                  y={PAD_T}
                  width={barFill}
                  height={H - PAD_T - PAD_B}
                  fill="transparent"
                  onMouseMove={(e) => handleMouseMove(e, i)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: 'crosshair' }}
                />
              </g>
            )
          })}

          {/* X-axis labels — show only start, middle, end */}
          {data.length > 0 && (() => {
            const indices = data.length <= 7
              ? data.map((_, i) => i)
              : [0, Math.floor(data.length / 2), data.length - 1]

            return indices.map((i) => (
              <text
                key={i}
                x={PAD_L + i * barWidth + barWidth / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize={10}
                fill="rgba(255,255,255,0.3)"
              >
                {data[i].date.slice(5)} {/* MM-DD */}
              </text>
            ))
          })()}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-[#1a1d30] px-3 py-2 text-xs shadow-xl"
            style={{ left: Math.min(tooltip.x + 10, W - 120), top: Math.max(tooltip.y - 60, 4) }}
          >
            <p className="font-semibold text-white/80">{tooltip.date}</p>
            <p className="mt-0.5" style={{ color }}>{label}: <strong>{fmt(tooltip.value)}</strong></p>
            <p className="text-white/40">Sessions: {tooltip.sessions}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Date range picker strip
// ────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '7 hari', from: daysAgo(6) },
  { label: '30 hari', from: daysAgo(29) },
  { label: '90 hari', from: daysAgo(89) },
  { label: 'Semua', from: null },
]

function FilterBar({ games, filters, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Game filter */}
      <select
        id="analytics-game-filter"
        aria-label="Filter analytics by game"
        value={filters.game}
        onChange={(e) => onChange({ ...filters, game: e.target.value })}
        className="h-8 rounded-lg border border-white/10 bg-[#171a2b] px-3 text-xs text-white/70 focus:border-[#8b8bff]/50 focus:outline-none"
      >
        <option value="">Semua Game</option>
        {games.map((g) => (
          <option key={g.id} value={g.slug}>{g.name}</option>
        ))}
      </select>

      {/* Preset buttons */}
      {PRESETS.map(({ label, from }) => {
        const active = filters.date_from === (from ?? '')
        return (
          <button
            key={label}
            onClick={() => onChange({ ...filters, date_from: from ?? '', date_to: from ? todayStr() : '' })}
            className={`h-8 rounded-lg border px-3 text-xs transition ${
              active
                ? 'border-[#8b8bff]/40 bg-[#8b8bff]/10 font-semibold text-[#8b8bff]'
                : 'border-white/10 bg-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {label}
          </button>
        )
      })}

      {/* Custom date inputs */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          aria-label="Dari tanggal"
          value={filters.date_from}
          max={todayStr()}
          onChange={(e) => onChange({ ...filters, date_from: e.target.value })}
          className="h-8 rounded-lg border border-white/10 bg-[#171a2b] px-2 text-xs text-white/60 focus:border-[#8b8bff]/50 focus:outline-none"
        />
        <span className="text-white/20 text-xs">—</span>
        <input
          type="date"
          aria-label="Sampai tanggal"
          value={filters.date_to}
          max={todayStr()}
          onChange={(e) => onChange({ ...filters, date_to: e.target.value })}
          className="h-8 rounded-lg border border-white/10 bg-[#171a2b] px-2 text-xs text-white/60 focus:border-[#8b8bff]/50 focus:outline-none"
        />
      </div>

      {/* Clear filter */}
      {(filters.game || filters.date_from || filters.date_to) && (
        <button
          onClick={() => onChange({ game: '', date_from: '', date_to: '' })}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs text-white/40 hover:text-white/70 transition"
        >
          <X className="size-3" /> Reset
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Empty state
// ────────────────────────────────────────────────────────────

function EmptyState({ message, icon: Icon = BarChart2 }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 py-14 text-center">
      <Icon className="mb-3 size-8 text-white/15" aria-hidden="true" />
      <p className="text-sm text-white/30">{message}</p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null)
  const [gameOptions, setGameOptions] = useState([])
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState('')

  const [trend, setTrend] = useState(null)
  const [trendLoading, setTrendLoading] = useState(true)
  const [trendError, setTrendError] = useState('')

  const [filters, setFilters] = useState({ game: '', date_from: daysAgo(29), date_to: todayStr() })
  const [trendMetric, setTrendMetric] = useState('sessions')

  // ── Load summary once ──
  useEffect(() => {
    let alive = true
    getGames()
      .then((data) => { if (alive) setGameOptions(data) })
      .catch(() => {})
    getPlayerSummary()
      .then((d) => { if (alive) setSummary(d) })
      .catch((e) => { if (alive) setSummaryError(e.response?.data?.message ?? 'Gagal memuat statistik.') })
      .finally(() => { if (alive) setSummaryLoading(false) })
    return () => { alive = false }
  }, [])

  // ── Load trend when filters change ──
  useEffect(() => {
    let alive = true
    const params = {}
    if (filters.game)      params.game      = filters.game
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to)   params.date_to   = filters.date_to

    getPlayerTrend(params)
      .then((d) => { if (alive) setTrend(d) })
      .catch((e) => { if (alive) setTrendError(e.response?.data?.message ?? 'Gagal memuat tren.') })
      .finally(() => { if (alive) setTrendLoading(false) })
    return () => { alive = false }
  }, [filters])

  // games list derived from summary
  const games = useMemo(() => summary?.perGame ?? [], [summary])

  function handleFilterChange(nextFilters) {
    setTrendLoading(true)
    setTrendError('')
    if (!nextFilters.game) setTrendMetric('sessions')
    setFilters(nextFilters)
  }

  const metricOptions = [
    { key: 'avgScore',   label: 'Rata-rata skor', color: '#8b8bff' },
    { key: 'bestScore',  label: 'Best skor',       color: '#7dd3fc' },
    { key: 'totalScore', label: 'Total skor',       color: '#b8a4ff' },
    { key: 'sessions',   label: 'Sesi bermain',     color: '#ef8b72' },
  ]
  const visibleMetricOptions = filters.game
    ? metricOptions
    : metricOptions.filter((metric) => metric.key === 'sessions')
  const activeMetric = visibleMetricOptions.find((metric) => metric.key === trendMetric)

  // ────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="animate-rise pb-12">

        {/* ── Page header ──────────────────────────────────────── */}
        <header className="mb-7">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8b8bff]">
            Personal · Analytics
          </p>
          <h1 className="mt-1.5 text-3xl font-bold">Statistik Kamu</h1>
          <p className="mt-1 text-sm text-white/40">
            Analisis performa dan perkembangan permainanmu dari waktu ke waktu.
          </p>
          <p className="mt-1 text-xs text-white/30">Skor diringkas per game karena skala penilaian berbeda; filter game dan tanggal berlaku untuk grafik serta riwayat terbaru.</p>
        </header>

        {/* ── Summary stat cards ────────────────────────────────── */}
        <section aria-label="Summary statistics">
          {summaryLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)}
            </div>
          ) : summaryError ? (
            <div className="flex items-center gap-3 rounded-lg border border-[#ef8b72]/20 bg-[#ef8b72]/5 px-5 py-4 text-sm text-[#ef8b72]">
              <RefreshCw className="size-4 shrink-0" />
              {summaryError}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <div className="animate-rise-1">
                <StatCard
                  label="Jenis game"
                  value={fmt(summary.gamesPlayed)}
                  detail="Game dengan sesi tercatat"
                  icon={Zap}
                  accentColor="#8b8bff"
                />
              </div>
              <div className="animate-rise-2">
                <StatCard
                  label="Permainan selesai"
                  value={fmt(summary.totalSessions)}
                  detail="Sesi tercatat"
                  icon={Gamepad2}
                  accentColor="#7dd3fc"
                />
              </div>
              <div className="animate-rise-3">
                <StatCard
                  label="Rank global"
                  value={`#${fmt(summary.globalRank)}`}
                  detail="Posisi di leaderboard"
                  icon={Trophy}
                  accentColor="#ef8b72"
                />
              </div>
              <div className="animate-rise-4">
                <StatCard
                  label="Challenges"
                  value={fmt(summary.challengesCompleted)}
                  detail="Challenge diselesaikan"
                  icon={Target}
                  accentColor="#b8a4ff"
                />
              </div>
            </div>
          )}
        </section>

        {/* ── Per-game breakdown ────────────────────────────────── */}
        <section aria-labelledby="breakdown-heading" className="mt-8">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Per game</p>
            <h2 id="breakdown-heading" className="mt-1 text-lg font-semibold">Statistik Per Game</h2>
          </div>

          {summaryLoading ? (
            <div className="grid gap-3 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-white/[0.08] bg-[#171a2b] p-5 space-y-3">
                  <div className="flex gap-3"><Skeleton className="size-10 rounded-xl" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-2 w-16" /></div></div>
                  <div className="grid grid-cols-3 gap-2">{[...Array(3)].map((_, j) => <Skeleton key={j} className="h-12 rounded-lg" />)}</div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : games.length === 0 ? (
            <EmptyState message="Belum ada data. Mainkan game untuk melihat statistik per game." icon={Gamepad2} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {games.map((g) => <GameBreakdownCard key={g.id} game={g} />)}
            </div>
          )}
        </section>

        {/* ── Trend chart ───────────────────────────────────────── */}
        <section aria-labelledby="trend-heading" className="mt-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Tren</p>
              <h2 id="trend-heading" className="mt-1 text-lg font-semibold">Performa dari Waktu ke Waktu</h2>
            </div>

            {/* Metric selector */}
            <div className="flex gap-1.5 flex-wrap">
              {visibleMetricOptions.map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setTrendMetric(key)}
                  className={`h-7 rounded-full border px-3 text-[11px] transition ${
                    trendMetric === key
                      ? 'border-transparent font-semibold'
                      : 'border-white/10 text-white/40 hover:text-white/70'
                  }`}
                  style={trendMetric === key ? { background: `${color}20`, color, borderColor: `${color}40` } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter bar */}
          <div className="mb-4">
            <FilterBar
              games={gameOptions}
              filters={filters}
              onChange={handleFilterChange}
            />
          </div>

          {/* Chart */}
          <div className="rounded-lg border border-white/[0.08] bg-[#171a2b] p-5">
            {trendLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-44 w-full rounded-lg" />
              </div>
            ) : trendError ? (
              <div className="flex items-center gap-3 rounded-lg border border-[#ef8b72]/20 bg-[#ef8b72]/5 px-4 py-3 text-sm text-[#ef8b72]">
                <RefreshCw className="size-4 shrink-0" /> {trendError}
              </div>
            ) : (
              <TrendChart
                data={trend?.trend ?? []}
                metricKey={trendMetric}
                color={activeMetric?.color ?? '#8b8bff'}
                label={activeMetric?.label ?? ''}
              />
            )}

            {/* Summary below chart */}
            {!trendLoading && !trendError && trend?.trend?.length > 0 && (() => {
              const t = trend.trend
              const totalSessions = t.reduce((s, d) => s + d.sessions, 0)
              const peakDay = t.reduce((a, b) => (filters.game ? b.bestScore > a.bestScore : b.sessions > a.sessions) ? b : a, t[0])
              return (
                <div className="mt-4 flex flex-wrap gap-4 border-t border-white/[0.06] pt-4">
                  <div>
                    <p className="text-[10px] text-white/30">Total sesi (periode)</p>
                    <p className="mt-0.5 text-sm font-bold">{fmt(totalSessions)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30">Hari aktif</p>
                    <p className="mt-0.5 text-sm font-bold">{t.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30">{filters.game ? 'Hari dengan best skor' : 'Hari tersibuk'}</p>
                    <p className="mt-0.5 text-sm font-bold">{peakDay.date} · {filters.game ? `${fmt(peakDay.bestScore)} pts` : `${fmt(peakDay.sessions)} sesi`}</p>
                  </div>
                </div>
              )
            })()}
          </div>

          <div className="mt-5">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Riwayat permainan terbaru</h3>
                <p className="text-[10px] text-white/30">Maksimal 50 sesi sesuai filter yang dipilih.</p>
              </div>
            </div>
            {trendLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : trendError ? (
              <div className="rounded-lg border border-[#ef8b72]/20 bg-[#ef8b72]/5 px-4 py-3 text-sm text-[#ef8b72]">{trendError}</div>
            ) : trend?.recentSessions?.length ? (
              <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#171a2b]">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-widest text-white/30">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tanggal</th>
                      <th className="px-4 py-3 font-medium">Game</th>
                      <th className="px-4 py-3 text-right font-medium">Skor</th>
                      <th className="px-4 py-3 text-right font-medium">Durasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.recentSessions.map((session) => (
                      <tr key={session.id} className="border-b border-white/[0.04] last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-white/50">{fmtDateTime(session.playedAt)}</td>
                        <td className="px-4 py-3 font-medium">{session.game.name}</td>
                        <td className="px-4 py-3 text-right font-semibold">{fmt(session.score)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-white/50">{fmtDuration(session.durationSec)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="Belum ada sesi game pada rentang filter ini." icon={Gamepad2} />
            )}
          </div>
        </section>

      </div>
    </DashboardLayout>
  )
}
