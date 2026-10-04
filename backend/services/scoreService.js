import pool from '../config/database.js'

// Score limits per game category to prevent cheating
const SCORE_LIMITS = {
  'reaction-test': { min: 0, max: 1000, minDuration: 0.1, maxDuration: 60 },
  'number-rush': { min: 0, max: 2000, minDuration: 3, maxDuration: 300 },
  'memory-match': { min: 0, max: 3000, minDuration: 5, maxDuration: 600 },
}

function httpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export async function submitScore({ userId, gameSlug, score, duration }) {
  // Validate inputs
  const rawScore = Number(score)
  const rawDuration = Number(duration)

  if (!Number.isFinite(rawScore) || !Number.isFinite(rawDuration)) {
    throw httpError(400, 'Score and duration must be valid numbers')
  }

  const limits = SCORE_LIMITS[gameSlug]
  if (!limits) {
    throw httpError(400, 'Unknown game')
  }

  if (rawScore < limits.min || rawScore > limits.max) {
    throw httpError(400, `Score must be between ${limits.min} and ${limits.max}`)
  }

  if (rawDuration < limits.minDuration || rawDuration > limits.maxDuration) {
    throw httpError(400, `Duration ${rawDuration}s is outside valid range`)
  }

  // Get game record
  const [games] = await pool.execute(
    'SELECT id FROM games WHERE slug = ? AND is_active = 1 LIMIT 1',
    [gameSlug],
  )

  if (games.length === 0) {
    throw httpError(404, 'Game not found or inactive')
  }

  const gameId = games[0].id
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // Insert score record
    const [scoreResult] = await connection.execute(
      'INSERT INTO scores (user_id, game_id, score, duration) VALUES (?, ?, ?, ?)',
      [userId, gameId, rawScore, rawDuration.toFixed(3)],
    )

    // Insert game session record
    await connection.execute(
      'INSERT INTO game_sessions (user_id, game_id, score, duration) VALUES (?, ?, ?, ?)',
      [userId, gameId, rawScore, rawDuration.toFixed(3)],
    )

    // Update user total_score
    await connection.execute(
      'UPDATE users SET total_score = total_score + ? WHERE id = ?',
      [rawScore, userId],
    )

    // Update challenge progress for active challenges linked to this game or generic
    const [challenges] = await connection.execute(
      `SELECT c.id, c.target_score
       FROM challenges c
       WHERE c.is_active = 1
         AND c.start_date <= UTC_TIMESTAMP(3)
         AND c.end_date >= UTC_TIMESTAMP(3)
         AND (c.game_id = ? OR c.game_id IS NULL)`,
      [gameId],
    )

    for (const challenge of challenges) {
      const [existing] = await connection.execute(
        'SELECT id, progress, completed FROM challenge_progress WHERE user_id = ? AND challenge_id = ? LIMIT 1',
        [userId, challenge.id],
      )

      if (existing.length === 0) {
        // Create progress record
        const newProgress = Math.min(rawScore, challenge.target_score)
        const completed = newProgress >= challenge.target_score ? 1 : 0
        const completedAt = completed ? new Date() : null
        await connection.execute(
          'INSERT INTO challenge_progress (user_id, challenge_id, progress, completed, completed_at) VALUES (?, ?, ?, ?, ?)',
          [userId, challenge.id, newProgress, completed, completedAt],
        )
      } else if (!existing[0].completed) {
        // Update progress if not already completed
        const newProgress = Math.max(existing[0].progress, rawScore)
        const completed = newProgress >= challenge.target_score ? 1 : 0
        const completedAt = completed && !existing[0].completed ? new Date() : null
        await connection.execute(
          `UPDATE challenge_progress
           SET progress = ?, completed = ?,
               completed_at = COALESCE(completed_at, ?)
           WHERE id = ?`,
          [newProgress, completed, completedAt, existing[0].id],
        )

        // Award reward points if just completed
        if (completed) {
          const [ch] = await connection.execute(
            'SELECT reward_points FROM challenges WHERE id = ? LIMIT 1',
            [challenge.id],
          )
          if (ch.length > 0 && ch[0].reward_points > 0) {
            await connection.execute(
              'UPDATE users SET total_score = total_score + ? WHERE id = ?',
              [ch[0].reward_points, userId],
            )
          }
        }
      }
    }

    // Check and award achievements
    await checkAchievements(connection, userId, gameSlug, rawScore, rawDuration)

    await connection.commit()

    // Return updated total score
    const [users] = await pool.execute(
      'SELECT total_score FROM users WHERE id = ? LIMIT 1',
      [userId],
    )

    return {
      scoreId: Number(scoreResult.insertId),
      score: rawScore,
      duration: rawDuration,
      newTotalScore: Number(users[0]?.total_score ?? 0),
    }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function checkAchievements(connection, userId, gameSlug, score, durationSeconds) {
  // Get stats needed for achievement checks
  const [[{ gamesPlayed }]] = await connection.execute(
    'SELECT COUNT(*) AS gamesPlayed FROM game_sessions WHERE user_id = ?',
    [userId],
  )

  const [[{ totalScore }]] = await connection.execute(
    'SELECT total_score AS totalScore FROM users WHERE id = ? LIMIT 1',
    [userId],
  )

  // Determine which achievement types to check
  const checks = []

  // games_played achievements
  checks.push({ type: 'games_played', value: Number(gamesPlayed) })

  // total_score achievements
  checks.push({ type: 'total_score', value: Number(totalScore) })

  // reaction_time_ms — only for reaction-test
  if (gameSlug === 'reaction-test' && durationSeconds > 0) {
    const reactionMs = Math.round(durationSeconds * 1000)
    checks.push({ type: 'reaction_time_ms', value: reactionMs, lessThan: true })
  }

  // memory_match_hard — only for memory-match with a good score
  if (gameSlug === 'memory-match' && score >= 1200) {
    checks.push({ type: 'memory_match_hard', value: 1 })
  }

  // Get unearned achievements
  const [achievements] = await connection.execute(
    `SELECT a.id, a.requirement_type, a.requirement_value
     FROM achievements a
     WHERE a.id NOT IN (
       SELECT achievement_id FROM user_achievements WHERE user_id = ?
     )`,
    [userId],
  )

  for (const achievement of achievements) {
    const check = checks.find((c) => c.type === achievement.requirement_type)
    if (!check) continue

    const earned = check.lessThan
      ? check.value <= Number(achievement.requirement_value)
      : check.value >= Number(achievement.requirement_value)

    if (earned) {
      await connection.execute(
        'INSERT IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
        [userId, achievement.id],
      )
    }
  }
}
