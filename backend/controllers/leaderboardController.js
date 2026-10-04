import { getGameLeaderboard, getGlobalLeaderboard } from '../services/leaderboardService.js'
import { successResponse } from '../utils/apiResponse.js'

export async function globalLeaderboard(request, response, next) {
  try {
    const data = await getGlobalLeaderboard(request.user.id, request.query)
    response.status(200).json(successResponse('Leaderboard retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}

export async function gameLeaderboard(request, response, next) {
  try {
    const gameId = parseInt(request.params.gameId, 10)
    if (!Number.isFinite(gameId) || gameId < 1) {
      const err = new Error('Invalid game ID')
      err.statusCode = 400
      return next(err)
    }
    const data = await getGameLeaderboard(request.user.id, gameId, request.query)
    response.status(200).json(successResponse('Game leaderboard retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}
