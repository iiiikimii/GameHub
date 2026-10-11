import cors from 'cors'

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173']

export function getAllowedOrigins(value = process.env.CORS_ORIGINS) {
  const origins = typeof value === 'string'
    ? value.split(',').map((origin) => origin.trim()).filter(Boolean)
    : []

  return origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS
}

export function createCorsMiddleware(origins = getAllowedOrigins()) {
  return cors({ origin: origins })
}
