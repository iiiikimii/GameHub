import {
  claimQuestReward,
  getQuestHistory,
  getUserQuests,
} from '../services/questService.js'
import { getXpHistory } from '../services/progressionService.js'
import {
  equipCosmetic,
  getUserCosmetics,
} from '../services/cosmeticService.js'
import { successResponse } from '../utils/apiResponse.js'

function httpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function parsePositiveInteger(value, name, { fallback, max } = {}) {
  if (value === undefined && fallback !== undefined) return fallback
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw httpError(400, `${name} must be a positive integer`)
  }

  const normalized = String(value)
  if (!/^\d+$/.test(normalized)) throw httpError(400, `${name} must be a positive integer`)
  const parsed = Number(normalized)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (max !== undefined && parsed > max)) {
    throw httpError(400, `${name} must be between 1 and ${max ?? Number.MAX_SAFE_INTEGER}`)
  }
  return parsed
}

/**
 * GET /api/quests
 * Returns user's active quests (daily, weekly, special) with progress & resets.
 */
export async function getQuests(request, response, next) {
  try {
    const { type } = request.query
    if (type !== undefined && (typeof type !== 'string' || !['DAILY', 'WEEKLY', 'SPECIAL'].includes(type.toUpperCase()))) {
      throw httpError(400, 'type must be DAILY, WEEKLY, or SPECIAL')
    }
    const result = await getUserQuests(request.user.id, type?.toUpperCase() ?? null)
    response.json(successResponse('Quests fetched successfully', result))
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/quests/:userQuestId/claim
 * Atomically claims rewards for a completed quest.
 */
export async function claimReward(request, response, next) {
  try {
    const { userQuestId } = request.params
    const parsedId = parsePositiveInteger(userQuestId, 'userQuestId', { max: Number.MAX_SAFE_INTEGER })
    const result = await claimQuestReward(request.user.id, parsedId)
    response.json(successResponse('Quest reward claimed successfully', result))
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/quests/history
 * Returns user's completed quest history with pagination.
 */
export async function getHistory(request, response, next) {
  try {
    const { page, limit } = request.query
    const parsedPage = parsePositiveInteger(page, 'page', { fallback: 1, max: 100000 })
    const parsedLimit = parsePositiveInteger(limit, 'limit', { fallback: 20, max: 50 })
    const result = await getQuestHistory(request.user.id, { page: parsedPage, limit: parsedLimit })
    response.json(successResponse('Quest history fetched successfully', result))
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/quests/xp-logs
 * Returns user's XP audit log.
 */
export async function getXpLogs(request, response, next) {
  try {
    const { limit } = request.query
    const parsedLimit = parsePositiveInteger(limit, 'limit', { fallback: 20, max: 100 })
    const result = await getXpHistory(request.user.id, parsedLimit)
    response.json(successResponse('XP history fetched successfully', result))
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/quests/cosmetics
 * Returns user's unlocked badges, titles, and frames.
 */
export async function getCosmetics(request, response, next) {
  try {
    const result = await getUserCosmetics(request.user.id)
    response.json(successResponse('Cosmetics fetched successfully', result))
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/quests/cosmetics/equip
 * Equips or unequips a title or profile frame.
 */
export async function equipCosmeticItem(request, response, next) {
  try {
    const { type, value } = request.body ?? {}
    if (value !== null && value !== undefined && (typeof value !== 'string' || value.length > 100)) {
      throw httpError(400, 'value must be a string of at most 100 characters or null')
    }
    const result = await equipCosmetic(request.user.id, { type, value })
    response.json(successResponse('Cosmetic updated successfully', result))
  } catch (error) {
    next(error)
  }
}
