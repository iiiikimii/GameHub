import pool from '../config/database.js'

/**
 * Get all achievements with unlock status for a specific user.
 * Also computes progress toward each achievement where possible.
 */
export async function getUserAchievements(userId) {
  // Get user stats needed for progress calculation
  const [statsRows] = await pool.query(
    `SELECT
       u.total_score,
       (SELECT COUNT(*) FROM game_sessions gs WHERE gs.user_id = u.id) AS games_played,
       (SELECT MIN(s.duration)
        FROM scores s
        INNER JOIN games g ON g.id = s.game_id
        WHERE s.user_id = u.id AND g.slug = 'reaction-test'
       ) AS best_reaction_s,
       (SELECT COUNT(DISTINCT DATE(gs2.played_at))
        FROM game_sessions gs2
        WHERE gs2.user_id = u.id
          AND gs2.played_at >= UTC_TIMESTAMP(3) - INTERVAL 30 DAY
       ) AS active_days,
       (SELECT COUNT(*) + 1
        FROM users other
        WHERE other.total_score > u.total_score
          OR (other.total_score = u.total_score AND other.id < u.id)
       ) AS global_rank,
       (SELECT COUNT(*)
        FROM scores s3
        INNER JOIN games g3 ON g3.id = s3.game_id
        WHERE s3.user_id = u.id AND g3.slug = 'memory-match'
          AND s3.score >= 1200
       ) AS memory_match_hard_count
     FROM users u
     WHERE u.id = ?`,
    [userId],
  )

  const stats = statsRows[0]
  const gamesPlayed = Number(stats.games_played)
  const totalScore = Number(stats.total_score)
  const bestReactionMs = stats.best_reaction_s != null ? Math.round(Number(stats.best_reaction_s) * 1000) : null
  const activeDays = Number(stats.active_days)
  const globalRank = Number(stats.global_rank)
  const memoryMatchHardCount = Number(stats.memory_match_hard_count)

  // Get all achievements + unlock status for this user
  const [achievements] = await pool.query(
    `SELECT
       a.id,
       a.name,
       a.description,
       a.icon,
       a.requirement_type,
       a.requirement_value,
       ua.unlocked_at
     FROM achievements a
     LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
     ORDER BY ua.unlocked_at IS NULL ASC, ua.unlocked_at DESC, a.id ASC`,
    [userId],
  )

  // Build progress map based on requirement_type
  const progressMap = {
    games_played: { current: gamesPlayed },
    total_score: { current: totalScore },
    reaction_time_ms: {
      current: bestReactionMs != null ? bestReactionMs : null,
      lessThan: true,
    },
    memory_match_hard: { current: memoryMatchHardCount },
    daily_player: { current: activeDays },
    global_rank_top3: { current: globalRank <= 3 ? 1 : 0 },
  }

  return achievements.map((a) => {
    const isUnlocked = a.unlocked_at != null
    const prog = progressMap[a.requirement_type]
    let progress = null

    if (prog) {
      if (prog.lessThan) {
        // reaction_time_ms: unlocked if current <= requirement_value
        if (prog.current != null) {
          const req = Number(a.requirement_value)
          // Show progress as percentage: closer to 0ms = 100%
          // Display: "Best: Xms / Target: Yms"
          progress = {
            current: prog.current,
            target: req,
            percent: isUnlocked ? 100 : Math.max(0, Math.min(99, Math.round((1 - (prog.current - req) / req) * 100))),
            label: `Best: ${prog.current}ms / Target: ≤${req}ms`,
          }
        }
      } else {
        const req = Number(a.requirement_value)
        const cur = prog.current ?? 0
        progress = {
          current: cur,
          target: req,
          percent: isUnlocked ? 100 : Math.min(99, Math.round((cur / req) * 100)),
          label: `${cur.toLocaleString('en')} / ${req.toLocaleString('en')}`,
        }
      }
    }

    return {
      id: Number(a.id),
      name: a.name,
      description: a.description,
      icon: a.icon,
      requirementType: a.requirement_type,
      requirementValue: Number(a.requirement_value),
      isUnlocked,
      unlockedAt: a.unlocked_at ?? null,
      progress,
    }
  })
}

/**
 * Get all achievements (admin-style: no user context).
 */
export async function getAllAchievements() {
  const [rows] = await pool.query(
    `SELECT id, name, description, icon, requirement_type, requirement_value
     FROM achievements
     ORDER BY id ASC`,
  )
  return rows.map((a) => ({
    id: Number(a.id),
    name: a.name,
    description: a.description,
    icon: a.icon,
    requirementType: a.requirement_type,
    requirementValue: Number(a.requirement_value),
  }))
}

/**
 * Manually trigger achievement check for a user (called after login or profile load).
 * Returns array of newly unlocked achievement names.
 */
export async function checkAndAwardAchievements(userId) {
  const [statsRows] = await pool.query(
    `SELECT
       u.total_score,
       (SELECT COUNT(*) FROM game_sessions gs WHERE gs.user_id = u.id) AS games_played,
       (SELECT MIN(s.duration)
        FROM scores s
        INNER JOIN games g ON g.id = s.game_id
        WHERE s.user_id = u.id AND g.slug = 'reaction-test'
       ) AS best_reaction_s,
       (SELECT COUNT(DISTINCT DATE(gs2.played_at))
        FROM game_sessions gs2
        WHERE gs2.user_id = u.id
          AND gs2.played_at >= UTC_TIMESTAMP(3) - INTERVAL 30 DAY
       ) AS active_days,
       (SELECT COUNT(*) + 1
        FROM users other
        WHERE other.total_score > u.total_score
          OR (other.total_score = u.total_score AND other.id < u.id)
       ) AS global_rank,
       (SELECT COUNT(*)
        FROM scores s3
        INNER JOIN games g3 ON g3.id = s3.game_id
        WHERE s3.user_id = u.id AND g3.slug = 'memory-match' AND s3.score >= 1200
       ) AS memory_match_hard_count
     FROM users u WHERE u.id = ?`,
    [userId],
  )

  const stats = statsRows[0]
  const gamesPlayed = Number(stats.games_played)
  const totalScore = Number(stats.total_score)
  const bestReactionMs = stats.best_reaction_s != null ? Math.round(Number(stats.best_reaction_s) * 1000) : null
  const activeDays = Number(stats.active_days)
  const globalRank = Number(stats.global_rank)
  const memoryMatchHardCount = Number(stats.memory_match_hard_count)

  // Get unearned achievements
  const [achievements] = await pool.query(
    `SELECT a.id, a.name, a.requirement_type, a.requirement_value
     FROM achievements a
     WHERE a.id NOT IN (
       SELECT achievement_id FROM user_achievements WHERE user_id = ?
     )`,
    [userId],
  )

  const newlyUnlocked = []

  for (const a of achievements) {
    const req = Number(a.requirement_value)
    let earned = false

    switch (a.requirement_type) {
      case 'games_played':
        earned = gamesPlayed >= req
        break
      case 'total_score':
        earned = totalScore >= req
        break
      case 'reaction_time_ms':
        earned = bestReactionMs != null && bestReactionMs <= req
        break
      case 'memory_match_hard':
        earned = memoryMatchHardCount >= req
        break
      case 'daily_player':
        earned = activeDays >= req
        break
      case 'global_rank_top3':
        earned = globalRank <= 3
        break
    }

    if (earned) {
      await pool.query(
        'INSERT IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
        [userId, a.id],
      )
      newlyUnlocked.push(a.name)
    }
  }

  return newlyUnlocked
}
