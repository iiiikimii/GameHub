import pool from '../config/database.js'
import { processSessionForQuests } from './questService.js'
import { processRankedSession } from './rankedService.js'
import { recordFriendActivity } from './socialService.js'

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

export async function submitScore(input) {
  // Retrying the same key is safe: the unique submission constraint turns a
  // retry after a committed-but-uncertain response into an idempotent result.
  const maxRetries = 2
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await submitScoreAttempt(input)
    } catch (error) {
      const retryable = error.code === 'ER_LOCK_DEADLOCK' || error.code === 'ER_LOCK_WAIT_TIMEOUT'
      if (!retryable || attempt >= maxRetries) throw error
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)))
    }
  }
}

async function submitScoreAttempt({ userId, gameSlug, score, duration, submissionKey }) {
  // Validate inputs
  const rawScore = Number(score)
  const rawDuration = Number(duration)

  if (!Number.isFinite(rawScore) || !Number.isFinite(rawDuration)) {
    throw httpError(400, 'Score and duration must be valid numbers')
  }

  if (!Number.isInteger(rawScore)) {
    throw httpError(400, 'Score must be a whole number')
  }

  if (typeof submissionKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionKey)) {
    throw httpError(400, 'A valid submission key is required')
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

    // Serialize this user's score-derived milestones and verify the account is still active.
    const [accountRows] = await connection.execute(
      'SELECT id FROM users WHERE id = ? AND is_active = 1 FOR UPDATE',
      [userId],
    )
    if (!accountRows.length) throw httpError(403, 'This account is disabled')

    const [[bestScoreRow]] = await connection.execute(
      'SELECT MAX(score) AS best_score FROM scores WHERE user_id = ? AND game_id = ?',
      [userId, gameId],
    )
    const isPersonalBest = bestScoreRow.best_score == null || rawScore > Number(bestScoreRow.best_score)

    // Insert score first so the unique submission key serializes concurrent retries.
    const [scoreResult] = await connection.execute(
      'INSERT INTO scores (user_id, game_id, submission_key, score, duration) VALUES (?, ?, ?, ?, ?)',
      [userId, gameId, submissionKey, rawScore, rawDuration.toFixed(3)],
    )

    // Insert game session record
    const [sessionResult] = await connection.execute(
      'INSERT INTO game_sessions (user_id, game_id, score, duration, played_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))',
      [userId, gameId, rawScore, rawDuration.toFixed(3)],
    )
    const sessionId = sessionResult.insertId

    // Update user total_score
    await connection.execute(
      'UPDATE users SET total_score = total_score + ? WHERE id = ?',
      [rawScore, userId],
    )

    // Process quest progression & award session XP atomically
    const questResult = await processSessionForQuests({
      connection,
      userId,
      sessionId,
    })

    // Process ranked rating progression (RP, Tier, Match History) atomically
    const rankedResult = await processRankedSession({
      connection,
      userId,
      sessionId,
      scoreId: scoreResult.insertId,
    })

    // Update challenge progress for active challenges linked to this game or generic
    const [challenges] = await connection.execute(
      `SELECT c.id, c.target_score, c.reward_points
       FROM challenges c
       WHERE c.is_active = 1
         AND c.start_date <= UTC_TIMESTAMP(3)
         AND c.end_date >= UTC_TIMESTAMP(3)
         AND (c.game_id = ? OR c.game_id IS NULL)
       ORDER BY c.id ASC`,
      [gameId],
    )

    for (const challenge of challenges) {
      // Create a progress row before locking it so concurrent sessions cannot
      // both observe a missing row and award the same completion.
      await connection.execute(
        `INSERT IGNORE INTO challenge_progress (user_id, challenge_id, progress, completed)
         VALUES (?, ?, 0, 0)`,
        [userId, challenge.id],
      )
      const [existing] = await connection.execute(
        `SELECT id, progress, completed
         FROM challenge_progress
         WHERE user_id = ? AND challenge_id = ?
         FOR UPDATE`,
        [userId, challenge.id],
      )

      const progressRow = existing[0]
      if (!progressRow || progressRow.completed) continue

      const newProgress = Math.min(
        Number(challenge.target_score),
        Math.max(Number(progressRow.progress), rawScore),
      )
      const completed = newProgress >= Number(challenge.target_score)
      await connection.execute(
        `UPDATE challenge_progress
         SET progress = ?, completed = ?,
             completed_at = IF(?, COALESCE(completed_at, UTC_TIMESTAMP(3)), completed_at)
         WHERE id = ?`,
        [newProgress, completed ? 1 : 0, completed ? 1 : 0, progressRow.id],
      )

      if (completed && Number(challenge.reward_points) > 0) {
        await connection.execute(
          'UPDATE users SET total_score = total_score + ? WHERE id = ?',
          [challenge.reward_points, userId],
        )
      }
    }

    // Check and award achievements, then persist social events in the same transaction.
    const unlockedAchievements = await checkAchievements(connection, userId, gameSlug, rawScore, rawDuration)
    if (isPersonalBest) {
      await recordFriendActivity(connection, {
        actorId: userId,
        activityType: 'PERSONAL_BEST',
        gameId,
        scoreId: scoreResult.insertId,
        sourceKey: `score:${scoreResult.insertId}`,
      })
    }
    for (const achievement of unlockedAchievements) {
      await recordFriendActivity(connection, {
        actorId: userId,
        activityType: 'ACHIEVEMENT_UNLOCKED',
        achievementId: achievement.id,
        sourceKey: `achievement:${achievement.id}`,
      })
    }

    await connection.commit()

    // Return updated user stats
    const [users] = await pool.execute(
      'SELECT total_score, xp, level FROM users WHERE id = ? LIMIT 1',
      [userId],
    )

    return {
      scoreId: Number(scoreResult.insertId),
      score: rawScore,
      duration: rawDuration,
      newTotalScore: Number(users[0]?.total_score ?? 0),
      xp: Number(users[0]?.xp ?? 0),
      level: Number(users[0]?.level ?? 1),
      questUpdates: questResult,
      rankedUpdates: rankedResult,
    }
  } catch (error) {
    await connection.rollback()

    if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('uq_scores_user_submission')) {
      const [[existing]] = await pool.execute(
        `SELECT s.id, s.game_id, s.score, s.duration, u.total_score, u.xp, u.level
         FROM scores s
         JOIN users u ON u.id = s.user_id
         WHERE s.user_id = ? AND s.submission_key = ?
         LIMIT 1`,
        [userId, submissionKey],
      )

      if (existing && Number(existing.game_id) === Number(gameId)
        && Number(existing.score) === rawScore
        && Number(existing.duration) === Number(rawDuration.toFixed(3))) {
        return {
          scoreId: Number(existing.id),
          score: rawScore,
          duration: Number(existing.duration),
          newTotalScore: Number(existing.total_score ?? 0),
          xp: Number(existing.xp ?? 0),
          level: Number(existing.level ?? 1),
          duplicate: true,
        }
      }

      throw httpError(409, 'This submission key was already used for a different score')
    }
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
    `SELECT a.id, a.name, a.requirement_type, a.requirement_value
     FROM achievements a
     WHERE a.id NOT IN (
       SELECT achievement_id FROM user_achievements WHERE user_id = ?
     )`,
    [userId],
  )

  const unlocked = []
  for (const achievement of achievements) {
    const check = checks.find((c) => c.type === achievement.requirement_type)
    if (!check) continue

    const earned = check.lessThan
      ? check.value <= Number(achievement.requirement_value)
      : check.value >= Number(achievement.requirement_value)

    if (earned) {
      const [result] = await connection.execute(
        'INSERT IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
        [userId, achievement.id],
      )
      if (result.affectedRows) unlocked.push({ id: Number(achievement.id), name: achievement.name })
    }
  }
  return unlocked
}
