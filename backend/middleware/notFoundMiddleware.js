export function notFoundMiddleware(request, _response, next) {
  const error = new Error(`Route ${request.originalUrl} was not found`)
  error.statusCode = 404
  next(error)
}
