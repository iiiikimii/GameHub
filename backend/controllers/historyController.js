import { getHistory } from '../services/historyService.js'
import { successResponse } from '../utils/apiResponse.js'

export async function showHistory(request, response, next) {
  try {
    const data = await getHistory(request.user.id, request.query)
    response.status(200).json(successResponse('History retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}
