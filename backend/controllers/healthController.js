import { getHealthStatus } from '../services/healthService.js'
import { successResponse } from '../utils/apiResponse.js'

export async function getHealth(_request, response, next) {
  try {
    const data = await getHealthStatus()
    response.status(200).json(successResponse('GameHub API is healthy', data))
  } catch (error) {
    next(error)
  }
}
