import { failureResponse } from '../utils/apiResponse.js'

export function errorMiddleware(error, _request, response, _next) {
  const errorStatus = error.statusCode ?? error.status
  const statusCode = Number.isInteger(errorStatus) ? errorStatus : 500
  const message = statusCode === 500 ? 'Internal server error' : error.message

  if (statusCode === 500) {
    console.error(error)
  }

  response.status(statusCode).json(failureResponse(message))
}
