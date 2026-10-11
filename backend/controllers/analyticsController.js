import {
  getAdminActivityTrend,
  getAdminChallengeStats,
  getAdminGamePopularity,
  getAdminSummary,
  getPlayerSummary,
  getPlayerTrend,
} from '../services/analyticsService.js'
import { successResponse } from '../utils/apiResponse.js'

// ── Player endpoints ─────────────────────────────────────────

export async function playerSummary(request, response, next) {
  try {
    const data = await getPlayerSummary(request.user.id)
    response.status(200).json(successResponse('Player analytics retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}

export async function playerTrend(request, response, next) {
  try {
    const data = await getPlayerTrend(request.user.id, request.query)
    response.status(200).json(successResponse('Player trend retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}

// ── Admin endpoints ──────────────────────────────────────────

export async function adminSummary(request, response, next) {
  try {
    const data = await getAdminSummary()
    response.status(200).json(successResponse('Admin analytics summary retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}

export async function adminGamePopularity(request, response, next) {
  try {
    const data = await getAdminGamePopularity(request.query)
    response.status(200).json(successResponse('Game popularity data retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}

export async function adminChallengeStats(request, response, next) {
  try {
    const data = await getAdminChallengeStats(request.query)
    response.status(200).json(successResponse('Challenge stats retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}

export async function adminActivityTrend(request, response, next) {
  try {
    const data = await getAdminActivityTrend(request.query)
    response.status(200).json(successResponse('Activity trend retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}
