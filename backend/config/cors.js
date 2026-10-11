import cors from 'cors'

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173']

function deploymentOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    return url.origin
  } catch {
    return null
  }
}

export function getAllowedOrigins(
  value = process.env.CORS_ORIGINS,
  deploymentUrls = [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL],
) {
  const origins = typeof value === 'string'
    ? value.split(',').map((origin) => origin.trim()).filter(Boolean)
    : []
  const vercelOrigins = deploymentUrls.map(deploymentOrigin).filter(Boolean)
  const allowedOrigins = [...new Set([...origins, ...vercelOrigins])]

  return allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS
}

export function createCorsMiddleware(origins = getAllowedOrigins()) {
  return cors({ origin: origins })
}
