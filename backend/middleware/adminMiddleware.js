import { failureResponse } from '../utils/apiResponse.js'

export function adminMiddleware(request, response, next) {
  if (!request.user) {
    return response.status(401).json(failureResponse('Authentication is required'))
  }

  if (request.user.role !== 'ADMIN') {
    return response.status(403).json(failureResponse('Administrator access is required'))
  }

  return next()
}
