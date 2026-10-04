import pool from '../config/database.js'

const PAGE_LIMIT = 20

function parseQuery(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || PAGE_LIMIT))
  const offset = (page - 1) * limit
  const gameSlug = typeof query.game === 'string' ? query.game.trim() : ''
  const sort = ['score_desc', 'score_asc', 'date_desc', 'date_asc'].includes(query.sort)
    ? query.sort
    : 'date_desc'
  const minScore = parseInt(query.min_score, 10) || null
  const maxScore = parseInt(query.max_score, 10) || null
  const dateFrom = query.date_from || null
  const dateTo = query.date_to || null
  return { page, limit, offset, gameSlug, sort, minScore, maxScore, dateFrom, dateTo }
}

const SORT_MAP = {
  score_desc: 's.score DESC, s.id DESC',
  score_asc:  's.score ASC, s.id ASC',
  date_desc:  's.created_at DESC, s.id DESC',
  date_asc:   's.created_at ASC, s.id ASC',
}

/**
 * Paginated game history for a specific user.
 * Supports filters: game slug, score range, date range, sort order.
 */
export async function getHistory(userId, query) {
  const { page, limit, offset, gameSlug, sort, minScore, maxScore, dateFrom, dateTo } = parseQuery(query)

  const conditions = ['s.user_id = ?']
  const params = [userId]

  if (gameSlug) {
    conditions.push('g.slug = ?')
    params.push(gameSlug)
  }
  if (minScore !== null) {
    conditions.push('s.score >= ?')
    params.push(minScore)
  }
  if (maxScore !== null) {
    conditions.push('s.score <= ?')
    params.push(maxScore)
  }
  if (dateFrom) {
    conditions.push('DATE(s.created_at) >= ?')
    params.push(dateFrom)
  }
  if (dateTo) {
    conditions.push('DATE(s.created_at) <= ?')
    params.push(dateTo)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`
  const orderClause = `ORDER BY ${SORT_MAP[sort]}`

  // Count total matching rows
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM scores s
     INNER JOIN games g ON g.id = s.game_id
     ${whereClause}`,
    params,
  )
  const total = Number(countRows[0].total)

  // Fetch page
  const [rows] = await pool.query(
    `SELECT
       s.id,
       s.score,
       s.duration,
       s.created_at,
       g.id AS game_id,
       g.name AS game_name,
       g.slug AS game_slug,
       g.category AS game_category,
       g.difficulty AS game_difficulty
     FROM scores s
     INNER JOIN games g ON g.id = s.game_id
     ${whereClause}
     ${orderClause}
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  )

  // Per-game stats for sidebar summary
  const [gameStatsRows] = await pool.query(
    `SELECT
       g.id, g.name, g.slug,
       COUNT(*) AS play_count,
       MAX(s.score) AS best_score,
       AVG(s.score) AS avg_score
     FROM scores s
     INNER JOIN games g ON g.id = s.game_id
     WHERE s.user_id = ?
     GROUP BY g.id, g.name, g.slug`,
    [userId],
  )

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return {
    entries: rows.map((r) => ({
      id: Number(r.id),
      score: Number(r.score),
      duration: Number(r.duration),
      createdAt: r.created_at,
      game: {
        id: Number(r.game_id),
        name: r.game_name,
        slug: r.game_slug,
        category: r.game_category,
        difficulty: r.game_difficulty,
      },
    })),
    gameStats: gameStatsRows.map((g) => ({
      id: Number(g.id),
      name: g.name,
      slug: g.slug,
      playCount: Number(g.play_count),
      bestScore: Number(g.best_score),
      avgScore: Math.round(Number(g.avg_score)),
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    },
    filters: { gameSlug, sort, minScore, maxScore, dateFrom, dateTo },
  }
}
