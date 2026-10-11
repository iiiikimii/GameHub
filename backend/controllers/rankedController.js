import {
  claimSeasonRewards,
  getAllSeasons,
  getPlayerRankedProfile,
  getRankedRules,
  getSeasonLeaderboard,
  RANK_TIERS,
} from '../services/rankedService.js'
import { successResponse } from '../utils/apiResponse.js'

const VALID_TIERS = new Set(RANK_TIERS.map(({ tier }) => tier))

function badRequest(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

function parsePositiveInteger(value, name, { optional = false, defaultValue } = {}) {
  if (value === undefined && optional) return defaultValue ?? null
  if (!/^[1-9]\d*$/.test(String(value))) throw badRequest(`${name} must be a positive integer`)
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) throw badRequest(`${name} must be a safe positive integer`)
  return parsed
}

/**
 * GET /api/ranked/profile
 * Returns user's ranked stats, tier, RP, match history, and active season details.
 */
export async function getRankedProfile(request, response, next) {
  try {
    const { seasonId, matchesPage, matchesLimit } = request.query
    const parsedSeasonId = parsePositiveInteger(seasonId, 'seasonId', { optional: true })
    const result = await getPlayerRankedProfile(request.user.id, parsedSeasonId, {
      matchesPage: parsePositiveInteger(matchesPage, 'matchesPage', { optional: true, defaultValue: 1 }),
      matchesLimit: parsePositiveInteger(matchesLimit, 'matchesLimit', { optional: true, defaultValue: 10 }),
    })
    response.json(successResponse('Ranked profile fetched successfully', result))
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/ranked/leaderboard
 * Returns season leaderboard with tier filtering and pagination.
 */
export async function getRankedLeaderboard(request, response, next) {
  try {
    const { seasonId, page, limit, tier } = request.query
    if (tier !== undefined && typeof tier !== 'string') {
      throw badRequest('tier must be a single tier value')
    }
    const parsedTier = typeof tier === 'string' && tier.trim() ? tier.trim().toUpperCase() : null
    if (parsedTier && !VALID_TIERS.has(parsedTier)) {
      throw badRequest('tier must be Bronze, Silver, Gold, Platinum, or Diamond')
    }
    const result = await getSeasonLeaderboard(request.user.id, {
      seasonId: parsePositiveInteger(seasonId, 'seasonId', { optional: true }),
      page: parsePositiveInteger(page, 'page', { optional: true, defaultValue: 1 }),
      limit: parsePositiveInteger(limit, 'limit', { optional: true, defaultValue: 20 }),
      tierFilter: parsedTier,
    })
    response.json(successResponse('Ranked leaderboard fetched successfully', result))
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/ranked/seasons
 * Returns all seasons list (for season switcher and history inspection).
 */
export async function getSeasonsList(request, response, next) {
  try {
    const seasons = await getAllSeasons()
    response.json(successResponse('Seasons fetched successfully', {
      seasons,
      tiers: RANK_TIERS,
      rules: getRankedRules(),
    }))
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/ranked/seasons/:seasonId/claim-rewards
 * Claims end-of-season rewards if eligible.
 */
export async function claimRewards(request, response, next) {
  try {
    const { seasonId } = request.params
    const result = await claimSeasonRewards(
      request.user.id,
      parsePositiveInteger(seasonId, 'seasonId'),
    )
    response.json(successResponse('Season rewards claimed successfully', result))
  } catch (error) {
    next(error)
  }
}
