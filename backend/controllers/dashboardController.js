import { getDashboardData } from '../services/dashboardService.js'
import { successResponse } from '../utils/apiResponse.js'

export async function getDashboard(request, response, next) {
  try {
    const data = await getDashboardData(request.user.id)
    response.status(200).json(successResponse('Dashboard data loaded successfully', data))
  } catch (error) {
    next(error)
  }
}
