import pool from '../config/database.js'

function httpError(statusCode, message) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

/**
 * Get all active + upcoming challenges with user's progress.
 */
export async function getChallenges(userId) {
  const [rows] = await pool.query(
    `SELECT
       c.id,
       c.title,
       c.description,
       c.target_score,
       c.reward_points,
       c.start_date,
       c.end_date,
       c.is_active,
       g.id   AS game_id,
       g.name AS game_name,
       g.slug AS game_slug,
       g.category AS game_category,
       COALESCE(cp.progress, 0) AS progress,
       COALESCE(cp.completed, 0) AS completed,
       cp.completed_at
     FROM challenges c
     LEFT JOIN games g ON g.id = c.game_id
     LEFT JOIN challenge_progress cp
       ON cp.challenge_id = c.id AND cp.user_id = ?
     ORDER BY
       c.is_active DESC,
       c.end_date ASC,
       c.id ASC`,
    [userId],
  )

  return rows.map(normalizeChallenge)
}

/**
 * Get only today's / currently-active challenges.
 */
export async function getTodayChallenges(userId) {
  const [rows] = await pool.query(
    `SELECT
       c.id,
       c.title,
       c.description,
       c.target_score,
       c.reward_points,
       c.start_date,
       c.end_date,
       c.is_active,
       g.id   AS game_id,
       g.name AS game_name,
       g.slug AS game_slug,
       g.category AS game_category,
       COALESCE(cp.progress, 0) AS progress,
       COALESCE(cp.completed, 0) AS completed,
       cp.completed_at
     FROM challenges c
     LEFT JOIN games g ON g.id = c.game_id
     LEFT JOIN challenge_progress cp
       ON cp.challenge_id = c.id AND cp.user_id = ?
     WHERE c.is_active = 1
       AND c.start_date <= UTC_TIMESTAMP(3)
       AND c.end_date   >= UTC_TIMESTAMP(3)
     ORDER BY c.end_date ASC, c.id ASC`,
    [userId],
  )

  return rows.map(normalizeChallenge)
}

/**
 * Validate and complete a challenge for a user.
 *
 * Trusts ONLY the database: reads the user's best score from the `scores`
 * table, never the progress value sent by the frontend.
 */
export async function completeChallenge(userId, challengeId) {
  // 1. Load challenge
  const [challenges] = await pool.query(
    `SELECT c.id, c.title, c.target_score, c.reward_points,
            c.is_active, c.start_date, c.end_date,
            c.game_id
     FROM challenges c
     WHERE c.id = ?
     LIMIT 1`,
    [challengeId],
  )

  if (challenges.length === 0) throw httpError(404, 'Challenge not found')

  const challenge = challenges[0]

  // 2. Make sure it's currently active
  const now = new Date()
  if (!challenge.is_active || new Date(challenge.start_date) > now || new Date(challenge.end_date) < now) {
    throw httpError(400, 'This challenge is not currently active')
  }

  // 3. Check existing progress record
  const [progRows] = await pool.query(
    'SELECT id, progress, completed FROM challenge_progress WHERE user_id = ? AND challenge_id = ? LIMIT 1',
    [userId, challengeId],
  )
  const existing = progRows[0] ?? null

  if (existing?.completed) {
    throw httpError(409, 'Challenge already completed')
  }

  // 4. Verify from the DB — get user's actual best score for this game
  //    Never trust frontend-supplied progress.
  let actualBest = 0
  if (challenge.game_id) {
    const [bestRows] = await pool.query(
      'SELECT COALESCE(MAX(score), 0) AS best FROM scores WHERE user_id = ? AND game_id = ?',
      [userId, challenge.game_id],
    )
    actualBest = Number(bestRows[0].best)
  }

  if (actualBest < challenge.target_score) {
    // Update progress to reflect current actual best, but don't complete
    if (existing) {
      await pool.query(
        'UPDATE challenge_progress SET progress = ? WHERE id = ?',
        [actualBest, existing.id],
      )
    } else {
      await pool.query(
        'INSERT INTO challenge_progress (user_id, challenge_id, progress, completed) VALUES (?, ?, ?, 0)',
        [userId, challengeId, actualBest],
      )
    }
    throw httpError(400, `Score required: ${challenge.target_score}. Your best: ${actualBest}`)
  }

  // 5. Mark completed in a transaction + award reward points
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    if (existing) {
      await connection.execute(
        `UPDATE challenge_progress
         SET progress = ?, completed = 1, completed_at = UTC_TIMESTAMP(3)
         WHERE id = ?`,
        [actualBest, existing.id],
      )
    } else {
      await connection.execute(
        `INSERT INTO challenge_progress
           (user_id, challenge_id, progress, completed, completed_at)
         VALUES (?, ?, ?, 1, UTC_TIMESTAMP(3))`,
        [userId, challengeId, actualBest],
      )
    }

    let newTotalScore = null
    if (challenge.reward_points > 0) {
      await connection.execute(
        'UPDATE users SET total_score = total_score + ? WHERE id = ?',
        [challenge.reward_points, userId],
      )
      const [[user]] = await connection.execute(
        'SELECT total_score FROM users WHERE id = ? LIMIT 1',
        [userId],
      )
      newTotalScore = Number(user.total_score)
    }

    await connection.commit()

    return {
      challengeId: Number(challenge.id),
      title: challenge.title,
      rewardPoints: Number(challenge.reward_points),
      newTotalScore,
    }
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

function normalizeChallenge(row) {
  const now = Date.now()
  const start = new Date(row.start_date).getTime()
  const end = new Date(row.end_date).getTime()

  let status = 'upcoming'
  if (row.completed) status = 'completed'
  else if (row.is_active && start <= now && end >= now) status = 'active'
  else if (end < now) status = 'expired'

  const progress = Number(row.progress)
  const target = Number(row.target_score)

  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    targetScore: target,
    rewardPoints: Number(row.reward_points),
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: Boolean(row.is_active),
    status,
    progress,
    progressPercent: target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0,
    completed: Boolean(row.completed),
    completedAt: row.completed_at ?? null,
    game: row.game_id
      ? {
          id: Number(row.game_id),
          name: row.game_name,
          slug: row.game_slug,
          category: row.game_category,
        }
      : null,
  }
}
