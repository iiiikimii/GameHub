import pool from '../config/database.js'

function httpError(statusCode, message) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

function paginationMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return { total, page, limit, totalPages, hasPrev: page > 1, hasNext: page < totalPages }
}

// ──────────────────────────── STATS ────────────────────────────

export async function getAdminStats() {
  const [rows] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)                              AS total_users,
      (SELECT COUNT(*) FROM game_sessions)                      AS total_sessions,
      (SELECT COUNT(*) FROM scores)                             AS total_scores,
      (SELECT COUNT(*) FROM challenges WHERE is_active = 1
         AND start_date <= UTC_TIMESTAMP(3)
         AND end_date   >= UTC_TIMESTAMP(3))                    AS active_challenges,
      (SELECT COALESCE(SUM(total_score),0) FROM users)          AS total_score_sum,
      (SELECT COUNT(*) FROM users WHERE role = 'ADMIN')         AS admin_count,
      (SELECT COUNT(*) FROM games WHERE is_active = 1)          AS active_games,
      (SELECT COUNT(*) FROM user_achievements)                  AS total_achievements_unlocked
  `)
  const r = rows[0]
  return {
    totalUsers: Number(r.total_users),
    totalSessions: Number(r.total_sessions),
    totalScores: Number(r.total_scores),
    activeChallenges: Number(r.active_challenges),
    totalScoreSum: Number(r.total_score_sum),
    adminCount: Number(r.admin_count),
    activeGames: Number(r.active_games),
    totalAchievementsUnlocked: Number(r.total_achievements_unlocked),
  }
}

// ──────────────────────────── USERS ────────────────────────────

export async function adminListUsers(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20))
  const offset = (page - 1) * limit
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const role = query.role || ''

  const conditions = []
  const params = []
  if (search) { conditions.push('(u.username LIKE ? OR u.email LIKE ?)'); params.push(`%${search}%`, `%${search}%`) }
  if (role)   { conditions.push('u.role = ?'); params.push(role) }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${where}`, params)
  const total = Number(countRows[0].total)

  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.avatar, u.role, u.total_score,
            u.is_active, u.created_at,
            (SELECT COUNT(*) FROM game_sessions gs WHERE gs.user_id = u.id) AS games_played
     FROM users u ${where}
     ORDER BY u.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  )

  return {
    users: rows.map((u) => ({ ...u, id: Number(u.id), total_score: Number(u.total_score), games_played: Number(u.games_played), is_active: Boolean(u.is_active) })),
    pagination: paginationMeta(total, page, limit),
  }
}

export async function adminGetUser(userId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.avatar, u.role, u.total_score, u.is_active, u.created_at,
            (SELECT COUNT(*) FROM game_sessions gs WHERE gs.user_id = u.id) AS games_played,
            (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) AS achievements_unlocked
     FROM users u WHERE u.id = ? LIMIT 1`,
    [userId],
  )
  if (!rows[0]) throw httpError(404, 'User not found')
  const u = rows[0]
  return { ...u, id: Number(u.id), total_score: Number(u.total_score), games_played: Number(u.games_played), achievements_unlocked: Number(u.achievements_unlocked), is_active: Boolean(u.is_active) }
}

export async function adminUpdateUserRole(userId, role, requesterId) {
  if (!['USER', 'ADMIN'].includes(role)) throw httpError(400, 'Role must be USER or ADMIN')
  if (Number(userId) === Number(requesterId)) throw httpError(400, 'You cannot change your own role')
  const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId])
  if (result.affectedRows === 0) throw httpError(404, 'User not found')
  return { userId: Number(userId), role }
}

export async function adminToggleUserActive(userId, isActive, requesterId) {
  if (Number(userId) === Number(requesterId)) throw httpError(400, 'You cannot disable your own account')
  const [result] = await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, userId])
  if (result.affectedRows === 0) throw httpError(404, 'User not found')
  return { userId: Number(userId), isActive: Boolean(isActive) }
}

export async function adminDeleteUser(userId, requesterId) {
  if (Number(userId) === Number(requesterId)) throw httpError(400, 'You cannot delete your own account')
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId])
  if (result.affectedRows === 0) throw httpError(404, 'User not found')
  return { userId: Number(userId) }
}

// ──────────────────────────── GAMES ────────────────────────────

export async function adminListGames() {
  const [rows] = await pool.query(
    `SELECT g.id, g.name, g.slug, g.description, g.category, g.difficulty,
            g.thumbnail, g.is_active,
            (SELECT COUNT(*) FROM scores s WHERE s.game_id = g.id) AS total_scores
     FROM games g ORDER BY g.id ASC`,
  )
  return rows.map((g) => ({ ...g, id: Number(g.id), is_active: Boolean(g.is_active), total_scores: Number(g.total_scores) }))
}

export async function adminCreateGame(data) {
  const { name, slug, description, category, difficulty } = data
  if (!name || !slug || !category || !difficulty) throw httpError(400, 'name, slug, category, difficulty are required')
  const [result] = await pool.query(
    'INSERT INTO games (name, slug, description, category, difficulty, is_active) VALUES (?, ?, ?, ?, ?, 1)',
    [name.trim(), slug.trim().toLowerCase(), description || null, category, difficulty],
  )
  return { id: result.insertId, name, slug, category, difficulty }
}

export async function adminUpdateGame(gameId, data) {
  const fields = []
  const params = []
  const allowed = ['name', 'description', 'category', 'difficulty', 'thumbnail']
  for (const key of allowed) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); params.push(data[key]) }
  }
  if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active ? 1 : 0) }
  if (fields.length === 0) throw httpError(400, 'No fields to update')
  params.push(gameId)
  const [result] = await pool.query(`UPDATE games SET ${fields.join(', ')} WHERE id = ?`, params)
  if (result.affectedRows === 0) throw httpError(404, 'Game not found')
  return { gameId: Number(gameId) }
}

export async function adminDeleteGame(gameId) {
  const [result] = await pool.query('DELETE FROM games WHERE id = ?', [gameId])
  if (result.affectedRows === 0) throw httpError(404, 'Game not found')
  return { gameId: Number(gameId) }
}

// ──────────────────────────── CHALLENGES ───────────────────────

export async function adminListChallenges() {
  const [rows] = await pool.query(
    `SELECT c.id, c.title, c.description, c.target_score, c.reward_points,
            c.start_date, c.end_date, c.is_active,
            g.id AS game_id, g.name AS game_name, g.slug AS game_slug,
            (SELECT COUNT(*) FROM challenge_progress cp WHERE cp.challenge_id = c.id AND cp.completed = 1) AS completed_count
     FROM challenges c
     LEFT JOIN games g ON g.id = c.game_id
     ORDER BY c.id DESC`,
  )
  return rows.map((c) => ({ ...c, id: Number(c.id), is_active: Boolean(c.is_active), completed_count: Number(c.completed_count) }))
}

export async function adminCreateChallenge(data) {
  const { title, description, game_id, target_score, reward_points, start_date, end_date } = data
  if (!title || !target_score || !start_date || !end_date) throw httpError(400, 'title, target_score, start_date, end_date required')
  const [result] = await pool.query(
    'INSERT INTO challenges (title, description, game_id, target_score, reward_points, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [title.trim(), description || null, game_id || null, Number(target_score), Number(reward_points) || 0, start_date, end_date],
  )
  return { id: result.insertId }
}

export async function adminUpdateChallenge(challengeId, data) {
  const fields = []
  const params = []
  const allowed = ['title', 'description', 'target_score', 'reward_points', 'start_date', 'end_date', 'game_id']
  for (const key of allowed) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); params.push(data[key]) }
  }
  if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active ? 1 : 0) }
  if (fields.length === 0) throw httpError(400, 'No fields to update')
  params.push(challengeId)
  const [result] = await pool.query(`UPDATE challenges SET ${fields.join(', ')} WHERE id = ?`, params)
  if (result.affectedRows === 0) throw httpError(404, 'Challenge not found')
  return { challengeId: Number(challengeId) }
}

export async function adminDeleteChallenge(challengeId) {
  const [result] = await pool.query('DELETE FROM challenges WHERE id = ?', [challengeId])
  if (result.affectedRows === 0) throw httpError(404, 'Challenge not found')
  return { challengeId: Number(challengeId) }
}

// ──────────────────────────── SCORES ───────────────────────────

export async function adminListScores(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25))
  const offset = (page - 1) * limit
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const gameSlug = query.game || ''
  const sort = query.sort === 'score_asc' ? 's.score ASC' : query.sort === 'date_asc' ? 's.created_at ASC' : query.sort === 'score_desc' ? 's.score DESC' : 's.created_at DESC'

  const conditions = []
  const params = []
  if (search)   { conditions.push('u.username LIKE ?'); params.push(`%${search}%`) }
  if (gameSlug) { conditions.push('g.slug = ?'); params.push(gameSlug) }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM scores s INNER JOIN users u ON u.id = s.user_id INNER JOIN games g ON g.id = s.game_id ${where}`, params,
  )
  const total = Number(countRows[0].total)

  const [rows] = await pool.query(
    `SELECT s.id, s.score, s.duration, s.created_at,
            u.id AS user_id, u.username, u.avatar,
            g.id AS game_id, g.name AS game_name, g.slug AS game_slug
     FROM scores s
     INNER JOIN users u ON u.id = s.user_id
     INNER JOIN games g ON g.id = s.game_id
     ${where}
     ORDER BY ${sort}
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  )

  return {
    scores: rows.map((r) => ({
      id: Number(r.id), score: Number(r.score), duration: Number(r.duration), createdAt: r.created_at,
      user: { id: Number(r.user_id), username: r.username, avatar: r.avatar },
      game: { id: Number(r.game_id), name: r.game_name, slug: r.game_slug },
    })),
    pagination: paginationMeta(total, page, limit),
  }
}

export async function adminDeleteScore(scoreId) {
  // Also subtract the score from the user's total
  const [[score]] = await pool.query('SELECT user_id, score FROM scores WHERE id = ? LIMIT 1', [scoreId])
  if (!score) throw httpError(404, 'Score not found')
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.execute('DELETE FROM scores WHERE id = ?', [scoreId])
    await connection.execute('UPDATE users SET total_score = GREATEST(0, total_score - ?) WHERE id = ?', [score.score, score.user_id])
    await connection.commit()
    return { scoreId: Number(scoreId) }
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}
