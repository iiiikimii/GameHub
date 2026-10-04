import pool from '../config/database.js'

export async function getDashboardData(userId) {
  const [statsResult, challengesResult, recentGamesResult, recommendedGamesResult, achievementsResult] = await Promise.all([
    pool.execute(
      `SELECT u.total_score,
        (SELECT COUNT(*) FROM game_sessions gs WHERE gs.user_id = u.id) AS games_played,
        (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) AS achievements_unlocked,
        (SELECT COUNT(*) FROM achievements) AS achievements_total,
        (SELECT COUNT(*) + 1 FROM users other
          WHERE other.total_score > u.total_score
            OR (other.total_score = u.total_score AND other.id < u.id)) AS current_rank
       FROM users u
       WHERE u.id = ?`,
      [userId],
    ),
    pool.execute(
      `SELECT c.id, c.title, c.description, c.target_score, c.reward_points,
        c.end_date, g.name AS game_name,
        COALESCE(cp.progress, 0) AS progress,
        COALESCE(cp.completed, 0) AS completed
       FROM challenges c
       LEFT JOIN games g ON g.id = c.game_id
       LEFT JOIN challenge_progress cp ON cp.challenge_id = c.id AND cp.user_id = ?
       WHERE c.is_active = 1
         AND c.start_date <= UTC_TIMESTAMP(3)
         AND c.end_date >= UTC_TIMESTAMP(3)
       ORDER BY c.end_date ASC, c.id ASC
       LIMIT 1`,
      [userId],
    ),
    pool.execute(
      `SELECT s.id, s.score, s.duration, s.created_at,
        g.id AS game_id, g.name, g.slug, g.category, g.difficulty
       FROM scores s
       INNER JOIN games g ON g.id = s.game_id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC, s.id DESC
       LIMIT 4`,
      [userId],
    ),
    pool.execute(
      `SELECT g.id, g.name, g.slug, g.description, g.category,
        g.difficulty, g.thumbnail,
        (SELECT COUNT(*) FROM scores s WHERE s.game_id = g.id AND s.user_id = ?) AS play_count
       FROM games g
       WHERE g.is_active = 1
       ORDER BY play_count ASC, g.id ASC
       LIMIT 3`,
      [userId],
    ),
    pool.execute(
      `SELECT a.id, a.name, a.description, a.icon, ua.unlocked_at
       FROM achievements a
       LEFT JOIN user_achievements ua
         ON ua.achievement_id = a.id AND ua.user_id = ?
       ORDER BY ua.unlocked_at IS NULL, ua.unlocked_at DESC, a.id ASC
       LIMIT 3`,
      [userId],
    ),
  ])

  const stats = statsResult[0][0]

  return {
    stats: {
      totalScore: Number(stats.total_score),
      gamesPlayed: Number(stats.games_played),
      currentRank: Number(stats.current_rank),
      achievementsUnlocked: Number(stats.achievements_unlocked),
      achievementsTotal: Number(stats.achievements_total),
    },
    dailyChallenge: challengesResult[0][0] || null,
    recentGames: recentGamesResult[0].map((game) => ({
      ...game,
      score: Number(game.score),
      duration: Number(game.duration),
    })),
    recommendedGames: recommendedGamesResult[0].map((game) => ({
      ...game,
      play_count: Number(game.play_count),
    })),
    achievements: achievementsResult[0],
  }
}
