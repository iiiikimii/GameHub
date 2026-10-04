import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../config/database.js'

const publicUserFields = 'id, username, email, avatar, role, total_score, created_at, updated_at'
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const usernamePattern = /^[A-Za-z0-9_]{3,50}$/

function httpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function createToken(userId) {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw httpError(500, 'Authentication is not configured')
  }

  return jwt.sign({}, secret, { subject: String(userId), expiresIn: '1h' })
}

function createAuthResult(user) {
  return {
    token: createToken(user.id),
    user,
  }
}

export async function registerUser(input = {}) {
  input = input && typeof input === 'object' ? input : {}
  const username = typeof input.username === 'string' ? input.username.trim() : ''
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  const confirmPassword = typeof input.confirmPassword === 'string' ? input.confirmPassword : ''

  if (!usernamePattern.test(username)) {
    throw httpError(400, 'Username must be 3-50 characters and contain only letters, numbers, or underscores')
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    throw httpError(400, 'A valid email address is required')
  }

  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw httpError(400, 'Password must be at least 8 characters and no more than 72 bytes')
  }

  if (password !== confirmPassword) {
    throw httpError(400, 'Password confirmation does not match')
  }

  const [existingUser] = await pool.execute(
    'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
    [username, email],
  )

  if (existingUser.length > 0) {
    throw httpError(409, 'Username or email is already registered')
  }

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash],
    )
    const [users] = await pool.execute(
      `SELECT ${publicUserFields} FROM users WHERE id = ? LIMIT 1`,
      [result.insertId],
    )

    return createAuthResult(users[0])
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw httpError(409, 'Username or email is already registered')
    }

    throw error
  }
}

export async function loginUser(input = {}) {
  input = input && typeof input === 'object' ? input : {}
  const rawIdentifier = input.identifier ?? input.email ?? input.username
  const identifier = typeof rawIdentifier === 'string' ? rawIdentifier.trim() : ''
  const password = typeof input.password === 'string' ? input.password : ''

  if (!identifier || !password) {
    throw httpError(400, 'Username or email and password are required')
  }

  const [users] = await pool.execute(
    `SELECT ${publicUserFields}, password_hash
     FROM users
     WHERE email = ? OR username = ?
     LIMIT 1`,
    [identifier.toLowerCase(), identifier],
  )
  const user = users[0]

  if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    throw httpError(401, 'Invalid username/email or password')
  }

  const { password_hash: _passwordHash, ...publicUser } = user
  return createAuthResult(publicUser)
}
