import { api } from './api.js'

export async function getLeaderboard({ page = 1, limit = 20, search = '' } = {}) {
  const params = new URLSearchParams()
  params.set('page', page)
  params.set('limit', limit)
  if (search) params.set('search', search)
  const response = await api.get(`/leaderboard?${params}`)
  return response.data.data
}

export async function getGameLeaderboard(gameId, { page = 1, limit = 20, search = '' } = {}) {
  const params = new URLSearchParams()
  params.set('page', page)
  params.set('limit', limit)
  if (search) params.set('search', search)
  const response = await api.get(`/leaderboard/${gameId}?${params}`)
  return response.data.data
}
