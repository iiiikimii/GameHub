import pool from '../config/database.js'

const PAGE_LIMIT = 20

function parseQuery(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || PAGE_LIMIT))
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const offset = (page - 1) * limit
  return { page, limit, offset, search }
}

// Use pool.query (not pool.execute) — prepared statements don't support
// LIMIT/OFFSET via placeholders in mysql2's execute interface.

/**
 * Global leaderboard — ranked by users.total_score DESC, id ASC (tie-break).
 */
export async function getGlobalLeaderboard(userId, query) {
  const { page, limit, offset, search } = parseQuery(query)

  // Count total for pagination
  let countSql = 'SELECT COUNT(*) AS total FROM users'
  const countParams = []
  if (search) {
    countSql += ' WHERE username LIKE ?'
    countParams.push(`%${search}%`)
  }
  const [countRows] = await pool.query(countSql, countParams)
  const total = Number(countRows[0].total)

  // Main ranked query
  let mainSql = `
    SELECT
      u.id,
      u.username,
      u.avatar,
      u.total_score,
      (
        SELECT COUNT(*) + 1
        FROM users other
        WHERE other.total_score > u.total_score
          OR (other.total_score = u.total_score AND other.id < u.id)
      ) AS rank
    FROM users u
  `
  const mainParams = []
  if (search) {
    mainSql += ' WHERE u.username LIKE ?'
    mainParams.push(`%${search}%`)
  }
  mainSql += ' ORDER BY u.total_score DESC, u.id ASC'
  mainSql += ` LIMIT ${limit} OFFSET ${offset}`

  const [rows] = await pool.query(mainSql, mainParams)

  // Always return the requesting user's own row for the highlight banner
  const [selfRows] = await pool.query(
    `SELECT
       u.id,
       u.username,
       u.avatar,
       u.total_score,
       (
         SELECT COUNT(*) + 1
         FROM users other
         WHERE other.total_score > u.total_score
           OR (other.total_score = u.total_score AND other.id < u.id)
       ) AS rank
     FROM users u
     WHERE u.id = ?`,
    [userId],
  )

  return {
    entries: rows.map(normalizeEntry),
    currentUser: selfRows[0] ? normalizeEntry(selfRows[0]) : null,
    pagination: buildPagination(total, page, limit),
    gameId: null,
    gameName: null,
  }
}

/**
 * Per-game leaderboard — best score per user for that game.
 * Rank is assigned in application layer after query (avoids invalid GROUP+subquery).
 */
export async function getGameLeaderboard(userId, gameId, query) {
  const { page, limit, offset, search } = parseQuery(query)

  // Validate game exists
  const [games] = await pool.query(
    'SELECT id, name FROM games WHERE id = ? LIMIT 1',
    [gameId],
  )
  if (games.length === 0) {
    const err = new Error('Game not found')
    err.statusCode = 404
    throw err
  }

  // Count unique players who have scores for this game
  let countSql = `
    SELECT COUNT(DISTINCT s.user_id) AS total
    FROM scores s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.game_id = ?
  `
  const countParams = [gameId]
  if (search) {
    countSql += ' AND u.username LIKE ?'
    countParams.push(`%${search}%`)
  }
  const [countRows] = await pool.query(countSql, countParams)
  const total = Number(countRows[0].total)

  // Best score per user for this game (ordered by score desc)
  let mainSql = `
    SELECT
      u.id,
      u.username,
      u.avatar,
      MAX(s.score) AS best_score
    FROM scores s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.game_id = ?
  `
  const mainParams = [gameId]
  if (search) {
    mainSql += ' AND u.username LIKE ?'
    mainParams.push(`%${search}%`)
  }
  mainSql += ' GROUP BY u.id, u.username, u.avatar'
  mainSql += ' ORDER BY best_score DESC, u.id ASC'
  mainSql += ` LIMIT ${limit} OFFSET ${offset}`

  const [rows] = await pool.query(mainSql, mainParams)

  // Assign rank in application layer (offset + position)
  const entries = rows.map((row, idx) => ({
    id: Number(row.id),
    username: row.username,
    avatar: row.avatar ?? null,
    totalScore: Number(row.best_score),
    rank: offset + idx + 1,
  }))

  // Current user's best score + rank for this game
  const [selfRows] = await pool.query(
    `SELECT MAX(s.score) AS best_score
     FROM scores s
     WHERE s.user_id = ? AND s.game_id = ?`,
    [userId, gameId],
  )
  const userBestScore = selfRows[0]?.best_score != null ? Number(selfRows[0].best_score) : 0

  let userRank = null
  if (userBestScore > 0) {
    // Count how many distinct users beat the current user's best score
    // Tie break: if scores are equal, lower user_id wins.
    const [rankRows] = await pool.query(
      `SELECT COUNT(DISTINCT s2.user_id) + 1 AS r
       FROM scores s2
       WHERE s2.game_id = ?
         AND s2.user_id != ?
         AND (
           (SELECT MAX(s3.score) FROM scores s3 WHERE s3.user_id = s2.user_id AND s3.game_id = ?) > ?
           OR (
             (SELECT MAX(s4.score) FROM scores s4 WHERE s4.user_id = s2.user_id AND s4.game_id = ?) = ?
             AND s2.user_id < ?
           )
         )`,
      [gameId, userId, gameId, userBestScore, gameId, userBestScore, userId],
    )
    userRank = Number(rankRows[0].r)
  }

  // Get self user info for banner
  const [selfUserRows] = await pool.query(
    'SELECT id, username, avatar FROM users WHERE id = ? LIMIT 1',
    [userId],
  )

  const currentUser = selfUserRows[0]
    ? {
        id: Number(selfUserRows[0].id),
        username: selfUserRows[0].username,
        avatar: selfUserRows[0].avatar ?? null,
        totalScore: userBestScore,
        rank: userRank,
      }
    : null

  return {
    entries,
    currentUser,
    pagination: buildPagination(total, page, limit),
    gameId,
    gameName: games[0].name,
  }
}

function normalizeEntry(row) {
  return {
    id: Number(row.id),
    username: row.username,
    avatar: row.avatar ?? null,
    totalScore: Number(row.total_score),
    rank: Number(row.rank),
  }
}

function buildPagination(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return {
    total,
    page,
    limit,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  }
}
