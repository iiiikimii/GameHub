import { getAllGames, getGameBySlug } from '../services/gameService.js'
import { successResponse } from '../utils/apiResponse.js'

export async function listGames(request, response, next) {
  try {
    const games = await getAllGames()
    response.status(200).json(successResponse('Games retrieved successfully', games))
  } catch (error) {
    next(error)
  }
}

export async function getGame(request, response, next) {
  try {
    const game = await getGameBySlug(request.params.slug)
    if (!game) {
      const err = new Error('Game not found')
      err.statusCode = 404
      return next(err)
    }
    response.status(200).json(successResponse('Game retrieved successfully', game))
  } catch (error) {
    next(error)
  }
}
