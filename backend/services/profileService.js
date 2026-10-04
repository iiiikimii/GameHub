import bcrypt from 'bcrypt'
import pool from '../config/database.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const usernamePattern = /^[A-Za-z0-9_]{3,50}$/

function httpError(statusCode, message) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

/**
 * Full profile for the current user — stats, favorite game, recent scores.
 */
export async function getProfile(userId) {
  const [rows] = await pool.query(
    `SELECT
       u.id,
       u.username,
       u.email,
       u.avatar,
       u.role,
       u.total_score,
       u.created_at,
       (SELECT COUNT(*) FROM game_sessions gs WHERE gs.user_id = u.id) AS games_played,
       (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) AS achievements_unlocked,
       (SELECT COUNT(*) FROM achievements) AS achievements_total,
       (SELECT COUNT(*) + 1
        FROM users other
        WHERE other.total_score > u.total_score
          OR (other.total_score = u.total_score AND other.id < u.id)
       ) AS rank
     FROM users u
     WHERE u.id = ?`,
    [userId],
  )

  if (!rows[0]) throw httpError(404, 'User not found')
  const user = rows[0]

  // Favorite game — most played (most score entries)
  const [favRows] = await pool.query(
    `SELECT g.id, g.name, g.slug, g.category, COUNT(*) AS play_count
     FROM scores s
     INNER JOIN games g ON g.id = s.game_id
     WHERE s.user_id = ?
     GROUP BY g.id, g.name, g.slug, g.category
     ORDER BY play_count DESC, g.id ASC
     LIMIT 1`,
    [userId],
  )

  // Recent 5 scores
  const [recentRows] = await pool.query(
    `SELECT s.id, s.score, s.duration, s.created_at,
            g.id AS game_id, g.name AS game_name, g.slug AS game_slug, g.category
     FROM scores s
     INNER JOIN games g ON g.id = s.game_id
     WHERE s.user_id = ?
     ORDER BY s.created_at DESC, s.id DESC
     LIMIT 5`,
    [userId],
  )

  return {
    id: Number(user.id),
    username: user.username,
    email: user.email,
    avatar: user.avatar ?? null,
    role: user.role,
    totalScore: Number(user.total_score),
    rank: Number(user.rank),
    gamesPlayed: Number(user.games_played),
    achievementsUnlocked: Number(user.achievements_unlocked),
    achievementsTotal: Number(user.achievements_total),
    createdAt: user.created_at,
    favoriteGame: favRows[0]
      ? {
          id: Number(favRows[0].id),
          name: favRows[0].name,
          slug: favRows[0].slug,
          category: favRows[0].category,
          playCount: Number(favRows[0].play_count),
        }
      : null,
    recentScores: recentRows.map((r) => ({
      id: Number(r.id),
      score: Number(r.score),
      duration: Number(r.duration),
      createdAt: r.created_at,
      game: { id: Number(r.game_id), name: r.game_name, slug: r.game_slug, category: r.category },
    })),
  }
}

/**
 * Update profile fields for the current user.
 * Only updates fields that are explicitly provided.
 */
export async function updateProfile(userId, input = {}) {
  const updates = []
  const params = []

  // Username
  if (input.username !== undefined) {
    const username = String(input.username).trim()
    if (!usernamePattern.test(username)) {
      throw httpError(400, 'Username must be 3–50 characters: letters, numbers, underscores only')
    }
    // Uniqueness check (exclude self)
    const [dupe] = await pool.query(
      'SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1',
      [username, userId],
    )
    if (dupe.length > 0) throw httpError(409, 'Username is already taken')
    updates.push('username = ?')
    params.push(username)
  }

  // Email
  if (input.email !== undefined) {
    const email = String(input.email).trim().toLowerCase()
    if (!emailPattern.test(email) || email.length > 254) {
      throw httpError(400, 'A valid email address is required')
    }
    const [dupe] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
      [email, userId],
    )
    if (dupe.length > 0) throw httpError(409, 'Email is already registered')
    updates.push('email = ?')
    params.push(email)
  }

  // Avatar (emoji or short text, max 4 chars)
  if (input.avatar !== undefined) {
    const avatar = input.avatar === null ? null : String(input.avatar).trim().slice(0, 4)
    updates.push('avatar = ?')
    params.push(avatar)
  }

  // Password change — requires currentPassword + newPassword
  if (input.newPassword !== undefined) {
    if (!input.currentPassword) {
      throw httpError(400, 'Current password is required to change your password')
    }
    const newPass = String(input.newPassword)
    if (newPass.length < 8 || Buffer.byteLength(newPass, 'utf8') > 72) {
      throw httpError(400, 'New password must be 8–72 characters')
    }

    const [userRows] = await pool.query(
      'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
      [userId],
    )
    const validCurrent = userRows[0]?.password_hash
      ? await bcrypt.compare(String(input.currentPassword), userRows[0].password_hash)
      : false

    if (!validCurrent) throw httpError(401, 'Current password is incorrect')

    const newHash = await bcrypt.hash(newPass, 12)
    updates.push('password_hash = ?')
    params.push(newHash)
  }

  if (updates.length === 0) throw httpError(400, 'No changes provided')

  params.push(userId)
  await pool.query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
    params,
  )

  // Return fresh profile
  return getProfile(userId)
}
