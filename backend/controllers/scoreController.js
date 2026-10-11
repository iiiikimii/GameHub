import { submitScore } from '../services/scoreService.js'
import { successResponse } from '../utils/apiResponse.js'

export async function postScore(request, response, next) {
  try {
    const { gameSlug, score, duration, submissionKey } = request.body
    const result = await submitScore({
      userId: request.user.id,
      gameSlug,
      score,
      duration,
      submissionKey,
    })
    response.status(result.duplicate ? 200 : 201).json(successResponse('Score submitted successfully', result))
  } catch (error) {
    next(error)
  }
}
