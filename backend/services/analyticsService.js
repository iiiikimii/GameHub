import pool from '../config/database.js'

function httpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function queryString(query, key) {
  const value = query[key]
  if (value === undefined || value === '') return null
  if (typeof value !== 'string') {
    throw httpError(400, `Filter '${key}' must be a single string`)
  }
  return value.trim() || null
}

function parseDate(value, key) {
  if (value === null) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw httpError(400, `Filter '${key}' must use YYYY-MM-DD format`)
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (year < 1000 || date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw httpError(400, `Filter '${key}' is not a valid calendar date`)
  }
  return value
}

async function getAnalyticsFilters(query = {}) {
  const rawGame = queryString(query, 'game')
  const game = rawGame?.toLowerCase() ?? null
  if (game && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game)) {
    throw httpError(400, 'Filter game must be a valid game slug')
  }

  const dateFrom = parseDate(queryString(query, 'date_from'), 'date_from')
  const dateTo = parseDate(queryString(query, 'date_to'), 'date_to')
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw httpError(400, 'date_from must be on or before date_to')
  }

  if (game) {
    const [rows] = await pool.execute('SELECT id FROM games WHERE slug = ? LIMIT 1', [game])
    if (rows.length === 0) throw httpError(400, 'Filter game does not match a known game')
  }

  return { game, dateFrom, dateTo }
}

function addSessionFilters(conditions, params, filters, { gameAlias = 'g', sessionAlias = 'gs' } = {}) {
  if (filters.game) {
    conditions.push(`${gameAlias}.slug = ?`)
    params.push(filters.game)
  }
  if (filters.dateFrom) {
    conditions.push(`${sessionAlias}.played_at >= ?`)
    params.push(filters.dateFrom)
  }
  if (filters.dateTo) {
    conditions.push(`${sessionAlias}.played_at < DATE_ADD(?, INTERVAL 1 DAY)`)
    params.push(filters.dateTo)
  }
}

function serializeDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function serializeSessionDate(value) {
  return value instanceof Date ? value.toISOString() : value
}

// ────────────────────────────────────────────────────────────
// PLAYER ANALYTICS
// ────────────────────────────────────────────────────────────

/**
 * Player totals and per-game scores are derived from completed game_sessions.
 * The player's leaderboard rank and achievement/challenge counts remain all-time.
 */
export async function getPlayerSummary(userId) {
  const [userRows] = await pool.execute(
    `SELECT
       u.created_at AS member_since,
       (SELECT COUNT(*) FROM users other
         WHERE other.total_score > u.total_score
            OR (other.total_score = u.total_score AND other.id < u.id)) AS global_rank,
       (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) AS achievements_unlocked,
       (SELECT COUNT(*) FROM achievements) AS achievements_total,
       (SELECT COUNT(*) FROM challenge_progress cp
         WHERE cp.user_id = u.id AND cp.completed = 1) AS challenges_completed
     FROM users u
     WHERE u.id = ?`,
    [userId],
  )

  if (!userRows[0]) throw httpError(404, 'User not found')
  const user = userRows[0]

  const [perGameRows] = await pool.execute(
    `SELECT
       g.id,
       g.name,
       g.slug,
       g.category,
       COUNT(gs.id) AS play_count,
       MAX(gs.score) AS best_score,
       MIN(gs.score) AS worst_score,
       AVG(gs.score) AS avg_score,
       MIN(gs.duration) AS best_duration
     FROM game_sessions gs
     INNER JOIN games g ON g.id = gs.game_id
     WHERE gs.user_id = ?
     GROUP BY g.id, g.name, g.slug, g.category
     ORDER BY play_count DESC, g.name ASC`,
    [userId],
  )

  return {
    totalSessions: perGameRows.reduce((sum, game) => sum + Number(game.play_count), 0),
    gamesPlayed: perGameRows.length,
    globalRank: Number(user.global_rank),
    achievementsUnlocked: Number(user.achievements_unlocked),
    achievementsTotal: Number(user.achievements_total),
    challengesCompleted: Number(user.challenges_completed),
    memberSince: user.member_since,
    perGame: perGameRows.map((game) => ({
      id: Number(game.id),
      name: game.name,
      slug: game.slug,
      category: game.category,
      playCount: Number(game.play_count),
      bestScore: Number(game.best_score),
      worstScore: Number(game.worst_score),
      avgScore: Number(Number(game.avg_score).toFixed(2)),
      bestDurationSec: Number(game.best_duration),
    })),
  }
}

/**
 * Daily trend and recent session history for the signed-in player.
 * Date filters are inclusive and use the session's played_at timestamp.
 */
export async function getPlayerTrend(userId, query = {}) {
  const filters = await getAnalyticsFilters(query)
  const conditions = ['gs.user_id = ?']
  const params = [userId]
  addSessionFilters(conditions, params, filters)
  const where = `WHERE ${conditions.join(' AND ')}`
  const scoreAggregates = filters.game
    ? 'MAX(gs.score) AS best_score, AVG(gs.score) AS avg_score, SUM(gs.score) AS total_score'
    : 'NULL AS best_score, NULL AS avg_score, NULL AS total_score'

  const [trendRows] = await pool.execute(
    `SELECT
       DATE(gs.played_at) AS date,
       COUNT(*) AS sessions,
       ${scoreAggregates}
     FROM game_sessions gs
     INNER JOIN games g ON g.id = gs.game_id
     ${where}
     GROUP BY DATE(gs.played_at)
     ORDER BY date ASC`,
    params,
  )

  const [historyRows] = await pool.execute(
    `SELECT gs.id, gs.score, gs.duration, gs.played_at,
            g.name AS game_name, g.slug AS game_slug
     FROM game_sessions gs
     INNER JOIN games g ON g.id = gs.game_id
     ${where}
     ORDER BY gs.played_at DESC, gs.id DESC
     LIMIT 50`,
    params,
  )

  return {
    trend: trendRows.map((row) => ({
      date: serializeDate(row.date),
      sessions: Number(row.sessions),
      bestScore: row.best_score === null ? null : Number(row.best_score),
      avgScore: row.avg_score === null ? null : Number(Number(row.avg_score).toFixed(2)),
      totalScore: row.total_score === null ? null : Number(row.total_score),
    })),
    recentSessions: historyRows.map((row) => ({
      id: Number(row.id),
      score: Number(row.score),
      durationSec: Number(row.duration),
      playedAt: serializeSessionDate(row.played_at),
      game: { name: row.game_name, slug: row.game_slug },
    })),
    filters,
  }
}

// ────────────────────────────────────────────────────────────
// ADMIN ANALYTICS
// ────────────────────────────────────────────────────────────

/**
 * Active-user definition: distinct users with at least one completed
 * game_session in the previous 7 or 30 days (UTC).
 */
export async function getAdminSummary() {
  const [rows] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(DISTINCT user_id) FROM game_sessions
        WHERE played_at >= UTC_TIMESTAMP(3) - INTERVAL 30 DAY) AS active_users_30d,
      (SELECT COUNT(DISTINCT user_id) FROM game_sessions
        WHERE played_at >= UTC_TIMESTAMP(3) - INTERVAL 7 DAY) AS active_users_7d,
      (SELECT COUNT(*) FROM game_sessions) AS total_sessions,
      (SELECT COUNT(*) FROM scores) AS total_scores,
      (SELECT COUNT(*) FROM users WHERE role = 'ADMIN') AS admin_count,
      (SELECT COUNT(*) FROM games WHERE is_active = 1) AS active_games,
      (SELECT COUNT(*) FROM challenges WHERE is_active = 1
        AND start_date <= UTC_TIMESTAMP(3) AND end_date >= UTC_TIMESTAMP(3)) AS active_challenges,
      (SELECT COUNT(*) FROM challenge_progress WHERE completed = 1) AS total_challenge_completions
  `)

  const row = rows[0]
  return {
    totalUsers: Number(row.total_users),
    activeUsers30d: Number(row.active_users_30d),
    activeUsers7d: Number(row.active_users_7d),
    totalSessions: Number(row.total_sessions),
    totalScores: Number(row.total_scores),
    adminCount: Number(row.admin_count),
    activeGames: Number(row.active_games),
    activeChallenges: Number(row.active_challenges),
    totalChallengeCompletions: Number(row.total_challenge_completions),
    activeUserDefinition: 'Users with at least one completed game session in the previous N days (UTC)',
  }
}

/** Popularity is based on completed game sessions in the selected period. */
export async function getAdminGamePopularity(query = {}) {
  const filters = await getAnalyticsFilters(query)
  const joinConditions = ['gs.game_id = g.id']
  const joinParams = []
  if (filters.dateFrom) {
    joinConditions.push('gs.played_at >= ?')
    joinParams.push(filters.dateFrom)
  }
  if (filters.dateTo) {
    joinConditions.push('gs.played_at < DATE_ADD(?, INTERVAL 1 DAY)')
    joinParams.push(filters.dateTo)
  }

  const whereConditions = ['g.is_active = 1']
  const whereParams = []
  if (filters.game) {
    whereConditions.push('g.slug = ?')
    whereParams.push(filters.game)
  }

  const [rows] = await pool.execute(
    `SELECT
       g.id, g.name, g.slug, g.category, g.difficulty,
       COUNT(gs.id) AS total_sessions,
       COUNT(DISTINCT gs.user_id) AS unique_players
     FROM games g
     LEFT JOIN game_sessions gs ON ${joinConditions.join(' AND ')}
     WHERE ${whereConditions.join(' AND ')}
     GROUP BY g.id, g.name, g.slug, g.category, g.difficulty
     ORDER BY total_sessions DESC, g.name ASC`,
    [...joinParams, ...whereParams],
  )

  return rows.map((game) => ({
    id: Number(game.id),
    name: game.name,
    slug: game.slug,
    category: game.category,
    difficulty: game.difficulty,
    totalSessions: Number(game.total_sessions),
    uniquePlayers: Number(game.unique_players),
  }))
}

/** Challenge progress has no join timestamp, so participation counts are lifetime. */
export async function getAdminChallengeStats(query = {}) {
  const filters = await getAnalyticsFilters(query)
  const conditions = []
  const params = []
  if (filters.game) {
    conditions.push('(g.slug = ? OR c.game_id IS NULL)')
    params.push(filters.game)
  }
  if (filters.dateFrom) {
    conditions.push('c.end_date >= ?')
    params.push(filters.dateFrom)
  }
  if (filters.dateTo) {
    conditions.push('c.start_date < DATE_ADD(?, INTERVAL 1 DAY)')
    params.push(filters.dateTo)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [rows] = await pool.query(
    `SELECT
       c.id, c.title, c.target_score, c.reward_points,
       c.start_date, c.end_date, c.is_active,
       g.name AS game_name,
       COUNT(cp.id) AS total_participants,
       SUM(cp.completed) AS completions,
       ROUND(100 * SUM(cp.completed) / NULLIF(COUNT(cp.id), 0), 1) AS completion_rate
     FROM challenges c
     LEFT JOIN games g ON g.id = c.game_id
     LEFT JOIN challenge_progress cp ON cp.challenge_id = c.id
     ${where}
     GROUP BY c.id, c.title, c.target_score, c.reward_points,
              c.start_date, c.end_date, c.is_active, g.name
     ORDER BY c.id DESC
     LIMIT 20`,
    params,
  )

  return rows.map((challenge) => ({
    id: Number(challenge.id),
    title: challenge.title,
    gameName: challenge.game_name ?? null,
    targetScore: Number(challenge.target_score),
    rewardPoints: Number(challenge.reward_points),
    startDate: challenge.start_date,
    endDate: challenge.end_date,
    isActive: Boolean(challenge.is_active),
    totalParticipants: Number(challenge.total_participants),
    completions: Number(challenge.completions ?? 0),
    completionRate: Number(challenge.completion_rate ?? 0),
  }))
}

/** Daily platform activity trend, optionally filtered by date and game. */
export async function getAdminActivityTrend(query = {}) {
  const filters = await getAnalyticsFilters(query)
  const rawDays = queryString(query, 'days')
  let days = 30
  if (rawDays !== null) {
    if (!/^\d+$/.test(rawDays)) throw httpError(400, "Filter 'days' must be an integer from 1 to 365")
    days = Number(rawDays)
    if (days < 1 || days > 365) throw httpError(400, "Filter 'days' must be an integer from 1 to 365")
  }

  const conditions = []
  const params = []
  if (filters.game) {
    conditions.push('g.slug = ?')
    params.push(filters.game)
  }
  if (filters.dateFrom) {
    conditions.push('gs.played_at >= ?')
    params.push(filters.dateFrom)
  } else if (!filters.dateTo) {
    conditions.push(`gs.played_at >= UTC_TIMESTAMP(3) - INTERVAL ${days} DAY`)
  }
  if (filters.dateTo) {
    conditions.push('gs.played_at < DATE_ADD(?, INTERVAL 1 DAY)')
    params.push(filters.dateTo)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const scoreAggregates = filters.game
    ? 'MAX(gs.score) AS top_score, AVG(gs.score) AS avg_score'
    : 'NULL AS top_score, NULL AS avg_score'
  const [rows] = await pool.execute(
    `SELECT
       DATE(gs.played_at) AS date,
       COUNT(*) AS sessions,
       COUNT(DISTINCT gs.user_id) AS unique_players,
       ${scoreAggregates}
     FROM game_sessions gs
     INNER JOIN games g ON g.id = gs.game_id
     ${where}
     GROUP BY DATE(gs.played_at)
     ORDER BY date ASC`,
    params,
  )

  return {
    trend: rows.map((row) => ({
      date: serializeDate(row.date),
      sessions: Number(row.sessions),
      uniquePlayers: Number(row.unique_players),
      topScore: row.top_score === null ? null : Number(row.top_score),
      avgScore: row.avg_score === null ? null : Number(Number(row.avg_score).toFixed(2)),
    })),
    filters: { ...filters, days },
  }
}
