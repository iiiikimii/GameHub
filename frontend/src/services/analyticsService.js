import { api } from './api.js'

// ── Player ──────────────────────────────────────────────────

export async function getPlayerSummary() {
  const res = await api.get('/analytics/me/summary')
  return res.data.data
}

/**
 * @param {{ game?: string, date_from?: string, date_to?: string }} params
 */
export async function getPlayerTrend(params = {}) {
  const q = new URLSearchParams()
  if (params.game)      q.set('game',      params.game)
  if (params.date_from) q.set('date_from', params.date_from)
  if (params.date_to)   q.set('date_to',   params.date_to)
  const res = await api.get(`/analytics/me/trend?${q}`)
  return res.data.data
}

// ── Admin ────────────────────────────────────────────────────

export async function getAdminAnalyticsSummary() {
  const res = await api.get('/analytics/admin/summary')
  return res.data.data
}

export async function getAdminGamePopularity(params = {}) {
  const q = new URLSearchParams()
  if (params.game) q.set('game', params.game)
  if (params.date_from) q.set('date_from', params.date_from)
  if (params.date_to) q.set('date_to', params.date_to)
  const suffix = q.toString() ? `?${q.toString()}` : ''
  const res = await api.get(`/analytics/admin/games${suffix}`)
  return res.data.data
}

export async function getAdminChallengeStats(params = {}) {
  const q = new URLSearchParams()
  if (params.game) q.set('game', params.game)
  if (params.date_from) q.set('date_from', params.date_from)
  if (params.date_to) q.set('date_to', params.date_to)
  const suffix = q.toString() ? `?${q.toString()}` : ''
  const res = await api.get(`/analytics/admin/challenges${suffix}`)
  return res.data.data
}

/**
 * @param {{ game?: string, date_from?: string, date_to?: string, days?: number }} params
 */
export async function getAdminActivityTrend(params = {}) {
  const q = new URLSearchParams()
  if (params.game)      q.set('game',      params.game)
  if (params.date_from) q.set('date_from', params.date_from)
  if (params.date_to)   q.set('date_to',   params.date_to)
  if (params.days)      q.set('days',      String(params.days))
  const res = await api.get(`/analytics/admin/trend?${q}`)
  return res.data.data
}
