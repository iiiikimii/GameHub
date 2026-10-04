import jwt from 'jsonwebtoken'
import pool from '../config/database.js'
import { failureResponse } from '../utils/apiResponse.js'

const publicUserFields = 'id, username, email, avatar, role, total_score, created_at, updated_at'

export async function authMiddleware(request, response, next) {
  const authorization = request.get('authorization') || ''
  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return response.status(401).json(failureResponse('Authentication token is required'))
  }

  if (!process.env.JWT_SECRET) {
    const error = new Error('Authentication is not configured')
    error.statusCode = 500
    return next(error)
  }

  let payload

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return response.status(401).json(failureResponse('Authentication token is invalid or expired'))
  }

  if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
    return response.status(401).json(failureResponse('Authentication token is invalid'))
  }

  try {
    const [users] = await pool.execute(
      `SELECT ${publicUserFields} FROM users WHERE id = ? LIMIT 1`,
      [payload.sub],
    )

    if (users.length === 0) {
      return response.status(401).json(failureResponse('User account no longer exists'))
    }

    request.user = users[0]
    return next()
  } catch (error) {
    return next(error)
  }
}
