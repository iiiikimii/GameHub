import {
  completeChallenge,
  getChallenges,
  getTodayChallenges,
} from '../services/challengeService.js'
import { successResponse } from '../utils/apiResponse.js'

export async function listChallenges(request, response, next) {
  try {
    const data = await getChallenges(request.user.id)
    response.status(200).json(successResponse('Challenges retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}

export async function todayChallenges(request, response, next) {
  try {
    const data = await getTodayChallenges(request.user.id)
    response.status(200).json(successResponse('Today challenges retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}

export async function finishChallenge(request, response, next) {
  try {
    const challengeId = parseInt(request.params.id, 10)
    if (!Number.isFinite(challengeId) || challengeId < 1) {
      const err = new Error('Invalid challenge ID')
      err.statusCode = 400
      return next(err)
    }
    const result = await completeChallenge(request.user.id, challengeId)
    response.status(200).json(successResponse('Challenge completed!', result))
  } catch (error) {
    next(error)
  }
}
