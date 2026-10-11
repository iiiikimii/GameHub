import { api } from './api.js'

/**
 * Get player's ranked profile (RP, Tier, recent matches, season details)
 */
export async function getRankedProfile(seasonId = null, matchesPage = 1) {
  const params = { matchesPage, matchesLimit: 10 }
  if (seasonId) params.seasonId = seasonId
  const response = await api.get('/ranked/profile', { params })
  return response.data.data
}

/**
 * Get season ranked leaderboard with pagination and tier filter
 */
export async function getRankedLeaderboard({ seasonId = null, page = 1, limit = 20, tier = null } = {}) {
  const params = { page, limit }
  if (seasonId) params.seasonId = seasonId
  if (tier) params.tier = tier
  const response = await api.get('/ranked/leaderboard', { params })
  return response.data.data
}

/**
 * Get all seasons list
 */
export async function getRankedSeasons() {
  const response = await api.get('/ranked/seasons')
  return response.data.data
}

/**
 * Claim rewards for a completed season
 */
export async function claimSeasonRewards(seasonId) {
  const response = await api.post(`/ranked/seasons/${seasonId}/claim-rewards`)
  return response.data.data
}
