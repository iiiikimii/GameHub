import rateLimit from 'express-rate-limit'

const responseFor = (message) => ({ success: false, message })

export function createRouteRateLimiter({ max, windowMs, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: responseFor(message),
  })
}

export const loginRateLimiter = createRouteRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again later.',
})

export const registrationRateLimiter = createRouteRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many registration attempts. Please try again later.',
})

export const socialSearchRateLimiter = createRouteRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many user searches. Please slow down and try again shortly.',
})

export const friendRequestRateLimiter = createRouteRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many friend requests. Please try again later.',
})
