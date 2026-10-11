import { api } from './api.js'

/**
 * Get user quests with progress, progression info, and countdowns.
 */
export async function getQuests(type = null) {
  const params = type ? { type } : {}
  const response = await api.get('/quests', { params })
  return response.data.data
}

/**
 * Atomically claim reward for a completed quest.
 */
export async function claimQuestReward(userQuestId) {
  const response = await api.post(`/quests/${userQuestId}/claim`)
  return response.data.data
}

/**
 * Get completed quest history with pagination.
 */
export async function getQuestHistory({ page = 1, limit = 20 } = {}) {
  const response = await api.get('/quests/history', { params: { page, limit } })
  return response.data.data
}

/**
 * Get XP audit trail.
 */
export async function getXpLogs(limit = 20) {
  const response = await api.get('/quests/xp-logs', { params: { limit } })
  return response.data.data
}

/**
 * Get user unlocked cosmetics (badges, titles, frames) and equipped state.
 */
export async function getUserCosmetics() {
  const response = await api.get('/quests/cosmetics')
  return response.data.data
}

/**
 * Equip or unequip cosmetic item (type: 'TITLE' | 'FRAME', value: string | null).
 */
export async function equipCosmetic({ type, value }) {
  const response = await api.post('/quests/cosmetics/equip', { type, value })
  return response.data.data
}
