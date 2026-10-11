import pool from '../config/database.js'
import { addXp, calculateLevelInfo } from './progressionService.js'

function httpError(statusCode, message) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

/**
 * Calculates current UTC period keys and time left until reset.
 */
export function getPeriodInfo(now = new Date()) {

  // Daily UTC: YYYY-MM-DD
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const date = String(now.getUTCDate()).padStart(2, '0')
  const dailyPeriodKey = `${year}-${month}-${date}`

  // Keep the period bounds explicit so session counts use the same UTC reset.
  const dailyStart = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
  const nextDailyReset = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0))
  const dailyResetSeconds = Math.max(0, Math.floor((nextDailyReset.getTime() - now.getTime()) / 1000))

  // Weekly UTC: ISO Week format YYYY-Www (Monday to Sunday)
  // Calculate ISO week number
  const tempDate = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate()))
  // Thursday in current week decides the year
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  const weeklyPeriodKey = `${tempDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`

  // ISO weeks start Monday at 00:00 UTC.
  const currentUtcDate = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate()))
  const daysSinceMonday = (currentUtcDate.getUTCDay() + 6) % 7
  const weeklyStart = new Date(currentUtcDate)
  weeklyStart.setUTCDate(weeklyStart.getUTCDate() - daysSinceMonday)
  const nextWeeklyReset = new Date(weeklyStart)
  nextWeeklyReset.setUTCDate(nextWeeklyReset.getUTCDate() + 7)
  const weeklyResetSeconds = Math.max(0, Math.floor((nextWeeklyReset.getTime() - now.getTime()) / 1000))
  const toMysqlUtc = (value) => value.toISOString().slice(0, 23).replace('T', ' ')

  return {
    nowUtc: now.toISOString(),
    dailyPeriodKey,
    dailyStartUtc: toMysqlUtc(dailyStart),
    nextDailyStartUtc: toMysqlUtc(nextDailyReset),
    dailyResetSeconds,
    weeklyPeriodKey,
    weeklyStartUtc: toMysqlUtc(weeklyStart),
    nextWeeklyStartUtc: toMysqlUtc(nextWeeklyReset),
    weeklyResetSeconds,
  }
}

/**
 * Ensures user has active records in user_quests for the current periods.
 */
export async function ensureUserQuests(connectionOrPool, userId) {
  const { dailyPeriodKey, weeklyPeriodKey } = getPeriodInfo()

  // 1. Get all active quests
  const [quests] = await connectionOrPool.query(
    `SELECT id, quest_key, quest_type, requirement_target, start_date, end_date
     FROM quests
     WHERE is_active = 1
       AND (start_date IS NULL OR start_date <= UTC_TIMESTAMP(3))
       AND (end_date IS NULL OR end_date >= UTC_TIMESTAMP(3))`
  )

  for (const q of quests) {
    let periodKey
    if (q.quest_type === 'DAILY') {
      periodKey = dailyPeriodKey
    } else if (q.quest_type === 'WEEKLY') {
      periodKey = weeklyPeriodKey
    } else {
      // Preserve existing event IDs and cap the key length supported by schema.
      periodKey = q.quest_key.length <= 44 ? `EVENT-${q.quest_key}` : `EVENT-${q.id}`
    }

    await connectionOrPool.query(
      `INSERT IGNORE INTO user_quests
        (user_id, quest_id, period_key, progress, target, is_completed, is_claimed)
       VALUES (?, ?, ?, 0, ?, 0, 0)`,
      [userId, q.id, periodKey, q.requirement_target],
    )
  }
}

/**
 * Retrieve user quests with progress, reward statuses, and countdowns.
 */
export async function getUserQuests(userId, typeFilter = null) {
  await ensureUserQuests(pool, userId)
  const periods = getPeriodInfo()

  // Load user progression
  const [[user]] = await pool.query(
    'SELECT id, username, total_score, xp, level, selected_title, selected_frame FROM users WHERE id = ? LIMIT 1',
    [userId],
  )
  if (!user) throw httpError(404, 'User not found')

  const levelInfo = calculateLevelInfo(user.xp)

  let query = `
    SELECT
      uq.id AS user_quest_id,
      uq.period_key,
      uq.progress,
      uq.target,
      uq.is_completed,
      uq.completed_at,
      uq.is_claimed,
      uq.claimed_at,
      q.id AS quest_id,
      q.quest_key,
      q.title,
      q.description,
      q.quest_type,
      q.game_id,
      q.requirement_type,
      q.requirement_target,
      q.xp_reward,
      q.bonus_score_reward,
      q.badge_reward,
      q.cosmetic_reward_type,
      q.cosmetic_reward_value,
      q.cosmetic_reward_label,
      q.start_date,
      q.end_date,
      g.name AS game_name,
      g.slug AS game_slug,
      g.category AS game_category
    FROM user_quests uq
    JOIN quests q ON q.id = uq.quest_id
    LEFT JOIN games g ON g.id = q.game_id
    WHERE uq.user_id = ?
      AND (
        (q.quest_type = 'DAILY' AND uq.period_key = ?)
        OR (q.quest_type = 'WEEKLY' AND uq.period_key = ?)
        OR (q.quest_type = 'SPECIAL'
          AND (q.start_date IS NULL OR q.start_date <= UTC_TIMESTAMP(3))
          AND (q.end_date IS NULL OR q.end_date >= UTC_TIMESTAMP(3)))
      )
  `

  const params = [userId, periods.dailyPeriodKey, periods.weeklyPeriodKey]

  if (typeFilter) {
    query += ' AND q.quest_type = ?'
    params.push(typeFilter.toUpperCase())
  }

  query += ' ORDER BY q.quest_type ASC, uq.is_claimed ASC, uq.is_completed DESC, q.id ASC'

  const [rows] = await pool.query(query, params)

  let readyToClaimCount = 0
  let completedCount = 0

  const quests = rows.map((r) => {
    const isCompleted = Number(r.is_completed) === 1
    const isClaimed = Number(r.is_claimed) === 1
    const progress = Number(r.progress)
    const target = Number(r.target)
    const progressPercent = target > 0 ? Math.min(100, Math.floor((progress / target) * 100)) : 0

    if (isCompleted && !isClaimed) readyToClaimCount += 1
    if (isCompleted) completedCount += 1

    return {
      userQuestId: Number(r.user_quest_id),
      questId: Number(r.quest_id),
      questKey: r.quest_key,
      title: r.title,
      description: r.description,
      questType: r.quest_type,
      periodKey: r.period_key,
      requirementType: r.requirement_type,
      progress,
      target,
      progressPercent,
      isCompleted,
      completedAt: r.completed_at,
      isClaimed,
      claimedAt: r.claimed_at,
      rewards: {
        xp: Number(r.xp_reward),
        bonusScore: Number(r.bonus_score_reward),
        badge: r.badge_reward,
        cosmeticType: r.cosmetic_reward_type,
        cosmeticValue: r.cosmetic_reward_value,
        cosmeticLabel: r.cosmetic_reward_label,
      },
      game: r.game_id
        ? {
            id: Number(r.game_id),
            name: r.game_name,
            slug: r.game_slug,
            category: r.game_category,
          }
        : null,
      startDate: r.start_date,
      endDate: r.end_date,
    }
  })

  return {
    player: {
      userId: Number(user.id),
      username: user.username,
      totalScore: Number(user.total_score),
      xp: Number(user.xp),
      level: Number(user.level),
      selectedTitle: user.selected_title,
      selectedFrame: user.selected_frame,
      levelInfo,
    },
    resets: {
      dailyPeriodKey: periods.dailyPeriodKey,
      dailyResetSeconds: periods.dailyResetSeconds,
      weeklyPeriodKey: periods.weeklyPeriodKey,
      weeklyResetSeconds: periods.weeklyResetSeconds,
    },
    summary: {
      total: quests.length,
      readyToClaimCount,
      completedCount,
    },
    quests,
  }
}

/**
 * Process quest progress for a valid game session.
 * Guaranteed idempotency: a session ID can only be processed once.
 */
export async function processSessionForQuests({ connection, userId, sessionId }) {
  if (!sessionId || !userId) return null

  // Read the session and its submitted score from the database. Quest progress
  // must never be based on values supplied separately by a caller.
  const [[session]] = await connection.execute(
    `SELECT gs.id, gs.user_id, gs.game_id, gs.score, gs.duration, g.slug
     FROM game_sessions gs
     JOIN games g ON g.id = gs.game_id AND g.is_active = 1
     JOIN scores s
       ON s.user_id = gs.user_id
      AND s.game_id = gs.game_id
      AND s.score = gs.score
      AND s.duration = gs.duration
     WHERE gs.id = ? AND gs.user_id = ?
     LIMIT 1
     FOR UPDATE`,
    [sessionId, userId],
  )

  if (!session) {
    throw httpError(400, 'A validated game session and score are required for quest progress')
  }

  const gameId = Number(session.game_id)
  const gameSlug = session.slug
  const rawScore = Number(session.score)
  const rawDuration = Number(session.duration)

  // 1. Idempotency check in quest_session_logs
  try {
    const [existing] = await connection.execute(
      'SELECT id FROM quest_session_logs WHERE session_id = ? LIMIT 1',
      [sessionId],
    )
    if (existing.length > 0) {
      // Already processed!
      return { processed: false, reason: 'Session already processed' }
    }

    // Insert to log table
    await connection.execute(
      'INSERT INTO quest_session_logs (session_id, user_id) VALUES (?, ?)',
      [sessionId, userId],
    )
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return { processed: false, reason: 'Duplicate session log entry' }
    }
    throw err
  }

  // 2. Ensure user_quests rows exist for this user in current periods
  await ensureUserQuests(connection, userId)

  const periods = getPeriodInfo()

  // 3. Award base participation XP for a valid completed game session
  // Base 20 XP + bonus based on score (up to 30 XP)
  const baseSessionXp = 20 + Math.min(30, Math.floor(rawScore / 100))
  const xpAwardResult = await addXp({
    connection,
    userId,
    amount: baseSessionXp,
    sourceType: 'GAME_SESSION',
    sourceId: sessionId,
    description: `Completed game: ${gameSlug} (Score: ${rawScore})`,
  })

  // 4. Load all active uncompleted user_quests for this user in current periods
  const [activeUserQuests] = await connection.execute(
    `SELECT uq.id, uq.progress, uq.target, uq.is_completed,
            q.id AS quest_id, q.quest_key, q.title, q.quest_type, q.game_id,
            q.requirement_type, q.requirement_target, q.start_date, q.end_date
     FROM user_quests uq
     JOIN quests q ON q.id = uq.quest_id
     WHERE uq.user_id = ?
       AND uq.is_completed = 0
       AND (
         (q.quest_type = 'DAILY' AND uq.period_key = ?)
         OR (q.quest_type = 'WEEKLY' AND uq.period_key = ?)
         OR (q.quest_type = 'SPECIAL'
           AND (q.start_date IS NULL OR q.start_date <= UTC_TIMESTAMP(3))
           AND (q.end_date IS NULL OR q.end_date >= UTC_TIMESTAMP(3)))
       )`,
    [userId, periods.dailyPeriodKey, periods.weeklyPeriodKey],
  )

  const newlyCompleted = []

  for (const uq of activeUserQuests) {
    // If quest is specific to a game, verify game match
    if (uq.game_id && Number(uq.game_id) !== Number(gameId)) {
      continue
    }

    let updatedProgress = Number(uq.progress)
    const target = Number(uq.target)

    switch (uq.requirement_type) {
      case 'PLAY_GAMES':
        updatedProgress += 1
        break

      case 'ACCUMULATE_SCORE':
        updatedProgress += rawScore
        break

      case 'SINGLE_SCORE':
        if (rawScore > updatedProgress) {
          updatedProgress = rawScore
        }
        break

      case 'PLAY_TIME':
        updatedProgress += Math.round(rawDuration)
        break

      case 'PLAY_DIFFERENT_GAMES': {
        let periodStart = null
        let periodEnd = null
        if (uq.quest_type === 'DAILY') {
          periodStart = periods.dailyStartUtc
          periodEnd = periods.nextDailyStartUtc
        } else if (uq.quest_type === 'WEEKLY') {
          periodStart = periods.weeklyStartUtc
          periodEnd = periods.nextWeeklyStartUtc
        } else {
          periodStart = uq.start_date
          periodEnd = uq.end_date
        }

        const timeConditions = []
        const queryParams = [userId, userId]
        if (periodStart) {
          timeConditions.push('AND gs.played_at >= ?')
          queryParams.push(periodStart)
        }
        if (periodEnd) {
          timeConditions.push('AND gs.played_at <= ?')
          queryParams.push(periodEnd)
        }
        const [[{ distinctCount }]] = await connection.execute(
          `SELECT COUNT(DISTINCT gs.game_id) AS distinctCount
           FROM game_sessions gs
           JOIN quest_session_logs qsl ON qsl.session_id = gs.id
           WHERE gs.user_id = ?
             AND qsl.user_id = ?
             ${timeConditions.join('\n             ')}`,
          queryParams,
        )
        updatedProgress = Number(distinctCount) || 0
        break
      }

      default:
        break
    }

    updatedProgress = Math.min(target, updatedProgress)
    const isNowCompleted = updatedProgress >= target ? 1 : 0
    const completedAt = isNowCompleted ? new Date() : null

    await connection.execute(
      `UPDATE user_quests
       SET progress = ?,
           is_completed = ?,
           completed_at = COALESCE(completed_at, ?)
       WHERE id = ?`,
      [updatedProgress, isNowCompleted, completedAt, uq.id],
    )

    if (isNowCompleted) {
      newlyCompleted.push({
        userQuestId: uq.id,
        questKey: uq.quest_key,
        title: uq.title,
      })
    }
  }

  return {
    processed: true,
    baseXpAwarded: baseSessionXp,
    leveledUp: xpAwardResult?.leveledUp || false,
    newLevel: xpAwardResult?.newLevel,
    newXp: xpAwardResult?.newXp,
    newlyCompletedQuests: newlyCompleted,
  }
}

/**
 * Claim reward for a completed quest.
 * Atomic transaction: grants XP, bonus points, badges, and cosmetics.
 */
export async function claimQuestReward(userId, userQuestId) {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // 1. Lock and load user quest
    const [rows] = await connection.execute(
      `SELECT
         uq.id AS user_quest_id,
         uq.user_id,
         uq.is_completed,
         uq.is_claimed,
         q.id AS quest_id,
         q.quest_key,
         q.title,
         q.xp_reward,
         q.bonus_score_reward,
         q.badge_reward,
         q.cosmetic_reward_type,
         q.cosmetic_reward_value,
         q.cosmetic_reward_label
       FROM user_quests uq
       JOIN quests q ON q.id = uq.quest_id
       WHERE uq.id = ? AND uq.user_id = ?
       FOR UPDATE`,
      [userQuestId, userId],
    )

    if (rows.length === 0) {
      throw httpError(404, 'Quest not found or does not belong to you')
    }

    const uq = rows[0]

    if (Number(uq.is_completed) !== 1) {
      throw httpError(400, 'Quest is not yet completed. Complete the objectives first.')
    }

    if (Number(uq.is_claimed) === 1) {
      throw httpError(409, 'Reward has already been claimed')
    }

    // 2. Mark as claimed
    await connection.execute(
      'UPDATE user_quests SET is_claimed = 1, claimed_at = UTC_TIMESTAMP(3) WHERE id = ?',
      [uq.user_quest_id],
    )
    const [[claimTimestamp]] = await connection.execute(
      'SELECT claimed_at FROM user_quests WHERE id = ?',
      [uq.user_quest_id],
    )

    // 3. Grant XP Reward
    const xpReward = Number(uq.xp_reward) || 0
    let xpResult = null
    if (xpReward > 0) {
      xpResult = await addXp({
        connection,
        userId,
        amount: xpReward,
        sourceType: 'QUEST_REWARD',
        // Keep the exact daily/weekly quest instance in the XP audit trail.
        sourceId: uq.user_quest_id,
        description: `Quest Reward: ${uq.title}`,
      })
    }

    // 4. Grant Bonus Score Reward (Total Score)
    const bonusScore = Number(uq.bonus_score_reward) || 0
    if (bonusScore > 0) {
      await connection.execute(
        'UPDATE users SET total_score = total_score + ? WHERE id = ?',
        [bonusScore, userId],
      )
    }

    // 5. Grant Badge or Cosmetic Reward if configured
    const cosmeticsAwarded = []

    if (uq.badge_reward) {
      await connection.execute(
        `INSERT IGNORE INTO user_cosmetics (user_id, cosmetic_type, cosmetic_value, label, icon)
         VALUES (?, 'BADGE', ?, ?, 'award')`,
        [userId, uq.badge_reward, `Badge: ${uq.badge_reward}`],
      )
      cosmeticsAwarded.push({ type: 'BADGE', value: uq.badge_reward, label: uq.badge_reward })
    }

    if (uq.cosmetic_reward_type && uq.cosmetic_reward_type !== 'NONE' && uq.cosmetic_reward_value) {
      await connection.execute(
        `INSERT IGNORE INTO user_cosmetics (user_id, cosmetic_type, cosmetic_value, label, icon)
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          uq.cosmetic_reward_type,
          uq.cosmetic_reward_value,
          uq.cosmetic_reward_label || uq.cosmetic_reward_value,
          uq.cosmetic_reward_type === 'FRAME' ? 'sparkles' : 'crown',
        ],
      )
      cosmeticsAwarded.push({
        type: uq.cosmetic_reward_type,
        value: uq.cosmetic_reward_value,
        label: uq.cosmetic_reward_label || uq.cosmetic_reward_value,
      })
    }

    await connection.commit()

    // 6. Fetch updated user summary
    const [[freshUser]] = await pool.query(
      'SELECT total_score, xp, level FROM users WHERE id = ? LIMIT 1',
      [userId],
    )

    return {
      userQuestId: Number(uq.user_quest_id),
      questTitle: uq.title,
      claimedAt: claimTimestamp.claimed_at,
      rewards: {
        xpClaimed: xpReward,
        bonusScoreClaimed: bonusScore,
        cosmeticsAwarded,
      },
      progression: {
        newTotalScore: Number(freshUser?.total_score || 0),
        newXp: Number(freshUser?.xp || 0),
        newLevel: Number(freshUser?.level || 1),
        leveledUp: xpResult?.leveledUp || false,
        levelInfo: calculateLevelInfo(freshUser?.xp || 0),
      },
    }
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

/**
 * Get completed quest history
 */
export async function getQuestHistory(userId, { limit = 20, page = 1 } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Math.floor(Number(limit) || 20)))
  const safePage = Math.min(100000, Math.max(1, Math.floor(Number(page) || 1)))
  const offset = (safePage - 1) * safeLimit

  const [totalRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM user_quests uq
     WHERE uq.user_id = ? AND uq.is_completed = 1`,
    [userId],
  )
  const total = Number(totalRows[0]?.total || 0)

  const [rows] = await pool.query(
    `SELECT
       uq.id AS user_quest_id,
       uq.period_key,
       uq.progress,
       uq.target,
       uq.completed_at,
       uq.is_claimed,
       uq.claimed_at,
       q.id AS quest_id,
       q.title,
       q.description,
       q.quest_type,
       q.xp_reward,
       q.bonus_score_reward,
       q.badge_reward,
       q.cosmetic_reward_type,
       q.cosmetic_reward_value,
       q.cosmetic_reward_label
     FROM user_quests uq
     JOIN quests q ON q.id = uq.quest_id
     WHERE uq.user_id = ? AND uq.is_completed = 1
     ORDER BY uq.completed_at DESC, uq.id DESC
     LIMIT ? OFFSET ?`,
    [userId, safeLimit, offset],
  )

  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
    history: rows.map((r) => ({
      userQuestId: Number(r.user_quest_id),
      questId: Number(r.quest_id),
      title: r.title,
      description: r.description,
      questType: r.quest_type,
      periodKey: r.period_key,
      progress: Number(r.progress),
      target: Number(r.target),
      completedAt: r.completed_at,
      isClaimed: Number(r.is_claimed) === 1,
      claimedAt: r.claimed_at,
      rewards: {
        xp: Number(r.xp_reward),
        bonusScore: Number(r.bonus_score_reward),
        badge: r.badge_reward,
        cosmeticType: r.cosmetic_reward_type,
        cosmeticValue: r.cosmetic_reward_value,
        cosmeticLabel: r.cosmetic_reward_label,
      },
    })),
  }
}
