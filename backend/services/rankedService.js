import pool from '../config/database.js'
import { addXp } from './progressionService.js'

function httpError(statusCode, message) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

// ────────────────────────────────────────────────────────────
// TIER DEFINITIONS & THRESHOLDS
// ────────────────────────────────────────────────────────────
export const RANK_TIERS = [
  { tier: 'BRONZE',   minRp: 0,    maxRp: 499,  icon: 'shield', color: '#CD7F32', label: 'Bronze' },
  { tier: 'SILVER',   minRp: 500,  maxRp: 999,  icon: 'shield', color: '#C0C0C0', label: 'Silver' },
  { tier: 'GOLD',     minRp: 1000, maxRp: 1499, icon: 'crown',  color: '#FFD700', label: 'Gold' },
  { tier: 'PLATINUM', minRp: 1500, maxRp: 1999, icon: 'zap',    color: '#00E5FF', label: 'Platinum' },
  { tier: 'DIAMOND',  minRp: 2000, maxRp: 999999, icon: 'gem',  color: '#B388FF', label: 'Diamond' },
]

export const TIER_ORDER = {
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
  DIAMOND: 5,
}

export const RP_BASE_CHANGES = {
  BRONZE: { WIN: 35, DRAW: 15, LOSS: -5 },
  SILVER: { WIN: 30, DRAW: 10, LOSS: -15 },
  GOLD: { WIN: 25, DRAW: 5, LOSS: -20 },
  PLATINUM: { WIN: 22, DRAW: 0, LOSS: -22 },
  DIAMOND: { WIN: 20, DRAW: -5, LOSS: -25 },
}

export function getRankedRules() {
  return {
    games: Object.entries(GAME_BENCHMARKS).map(([slug, benchmark]) => ({
      slug,
      name: benchmark.name,
      minScore: benchmark.minScore,
      maxScore: benchmark.maxScore,
      drawLow: benchmark.drawLow,
      drawHigh: benchmark.drawHigh,
      minDuration: benchmark.minDuration,
      maxDuration: benchmark.maxDuration,
    })),
    tiers: RANK_TIERS.map(({ tier, minRp, maxRp }) => ({ tier, minRp, maxRp: tier === 'DIAMOND' ? null : maxRp })),
    baseRpChanges: RP_BASE_CHANGES,
    performanceBonus: {
      appliesOn: 'WIN',
      normalizedScoreThreshold: 0.85,
      formula: 'round((normalized score - 0.85) * 60)',
      maxRp: 9,
    },
    floorRp: 0,
    outcomeRule: 'score < drawLow: LOSS; drawLow <= score <= drawHigh: DRAW; score > drawHigh: WIN',
    durationAffectsRating: false,
    resultType: 'score-band result; sessions are not compared head-to-head',
  }
}

export function getTierForRp(rp) {
  const safeRp = Math.max(0, Number(rp) || 0)
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (safeRp >= RANK_TIERS[i].minRp) {
      return RANK_TIERS[i].tier
    }
  }
  return 'BRONZE'
}

export function getTierInfo(tier, rp = 0) {
  const safeTier = String(tier || 'BRONZE').toUpperCase()
  const cfg = RANK_TIERS.find((t) => t.tier === safeTier) || RANK_TIERS[0]
  const currentTierIndex = RANK_TIERS.findIndex((t) => t.tier === safeTier)
  const nextTier = RANK_TIERS[currentTierIndex + 1] || null

  let rpInTier = 0
  let rpNeededForNext = 0
  let progressPercent = 100

  if (nextTier) {
    rpInTier = Math.max(0, rp - cfg.minRp)
    rpNeededForNext = nextTier.minRp - cfg.minRp
    progressPercent = Math.min(100, Math.floor((rpInTier / rpNeededForNext) * 100))
  }

  return {
    tier: cfg.tier,
    label: cfg.label,
    color: cfg.color,
    icon: cfg.icon,
    minRp: cfg.minRp,
    maxRp: cfg.maxRp,
    nextTier: nextTier ? nextTier.tier : null,
    nextTierLabel: nextTier ? nextTier.label : null,
    nextTierMinRp: nextTier ? nextTier.minRp : null,
    rpInTier,
    rpNeededForNext,
    progressPercent,
  }
}

// ────────────────────────────────────────────────────────────
// GAME NORMALIZATION BENCHMARKS (Anti-Cross-Game Distortion)
// ────────────────────────────────────────────────────────────
// Threshold values derived from player skill distributions
export const GAME_BENCHMARKS = {
  'reaction-test': {
    minScore: 0,
    maxScore: 1000,
    drawLow: 650,
    drawHigh: 750,
    minDuration: 0.1,
    maxDuration: 60,
    name: 'Reaction Test',
  },
  'number-rush': {
    minScore: 0,
    maxScore: 2000,
    drawLow: 750,
    drawHigh: 900,
    minDuration: 3,
    maxDuration: 300,
    name: 'Number Rush',
  },
  'memory-match': {
    minScore: 0,
    maxScore: 3000,
    drawLow: 900,
    drawHigh: 1100,
    minDuration: 5,
    maxDuration: 600,
    name: 'Memory Match',
  },
}

/**
 * Calculate RP change from a verified game session
 */
export function calculateMatchRp({ gameSlug, score, currentTier, duration }) {
  const benchmark = GAME_BENCHMARKS[gameSlug]
  if (!benchmark) {
    throw httpError(400, 'Game is not eligible for ranked')
  }

  const rawScore = Number(score)
  const rawDuration = Number(duration)
  if (!Number.isInteger(rawScore) || rawScore < benchmark.minScore || rawScore > benchmark.maxScore) {
    throw httpError(400, 'Ranked score is outside the valid range')
  }
  if (!Number.isFinite(rawDuration) || rawDuration < benchmark.minDuration || rawDuration > benchmark.maxDuration) {
    throw httpError(400, 'Ranked session duration is outside the valid range')
  }

  const normScore = Math.min(1, Math.max(0, rawScore / benchmark.maxScore))
  const performancePct = Math.round(normScore * 100)

  // Determine Match Outcome
  let result = 'DRAW'
  if (rawScore > benchmark.drawHigh) {
    result = 'WIN'
  } else if (rawScore < benchmark.drawLow) {
    result = 'LOSS'
  }

  // Base RP changes are shared with the public rules response.
  const baseChange = (RP_BASE_CHANGES[currentTier] || RP_BASE_CHANGES.BRONZE)[result]

  // Performance modifier (+0 to +10 for exceptional score)
  let perfBonus = 0
  if (normScore >= 0.85) {
    perfBonus = Math.round((normScore - 0.85) * 60) // up to +9
  }

  const totalChange = baseChange + (result === 'WIN' ? perfBonus : 0)

  return {
    rpChange: totalChange,
    result,
    performancePct,
    baseChange,
    perfBonus,
  }
}

// ────────────────────────────────────────────────────────────
// SEASON MANAGEMENT
// ────────────────────────────────────────────────────────────

/**
 * Get the currently active season
 */
export async function getActiveSeason(connectionOrPool = pool) {
  const [rows] = await connectionOrPool.query(
    `SELECT id, season_number, title, description, start_date, end_date, is_active
     FROM ranked_seasons
     WHERE is_active = 1
       AND start_date <= UTC_TIMESTAMP(3)
       AND end_date >= UTC_TIMESTAMP(3)
     ORDER BY season_number DESC
     LIMIT 1`
  )

  return rows[0] || null
}

/**
 * Get all seasons list
 */
export async function getAllSeasons() {
  const [rows] = await pool.query(
    `SELECT id, season_number, title, description, start_date, end_date,
            CASE WHEN is_active = 1 AND start_date <= UTC_TIMESTAMP(3) AND end_date >= UTC_TIMESTAMP(3)
                 THEN 1 ELSE 0 END AS is_active
     FROM ranked_seasons
     ORDER BY season_number DESC`
  )
  return rows
}

async function resolveViewSeason(seasonId = null) {
  if (seasonId !== null && seasonId !== undefined) {
    if (!Number.isSafeInteger(Number(seasonId)) || Number(seasonId) < 1) {
      throw httpError(400, 'Season ID must be a positive integer')
    }
    const [rows] = await pool.query('SELECT * FROM ranked_seasons WHERE id = ? LIMIT 1', [seasonId])
    if (!rows[0]) throw httpError(404, 'Season not found')
    return rows[0]
  }

  const activeSeason = await getActiveSeason()
  if (activeSeason) return activeSeason

  const [rows] = await pool.query('SELECT * FROM ranked_seasons ORDER BY season_number DESC LIMIT 1')
  return rows[0] || null
}

function emptyRankedProfile() {
  return {
    season: null,
    player: null,
    recentMatches: [],
    matchesPagination: { total: 0, page: 1, limit: 10, totalPages: 1, hasPrev: false, hasNext: false },
    seasonRewards: [],
  }
}

/**
 * Ensures user has an initialized record in user_season_ranks for the season.
 */
export async function ensureUserSeasonRank(connectionOrPool, userId, seasonId) {
  await connectionOrPool.query(
    `INSERT IGNORE INTO user_season_ranks
      (user_id, season_id, tier, rp, peak_rp, matches_played, wins, losses, reward_claimed)
     VALUES (?, ?, 'BRONZE', 0, 0, 0, 0, 0, 0)`,
    [userId, seasonId],
  )
}

// ────────────────────────────────────────────────────────────
// RANKED SESSION PROGRESSION (Idempotent Backend Transaction)
// ────────────────────────────────────────────────────────────

/**
 * Process ranked match rating change for a valid game session.
 * Called atomically inside submitScore or as a dedicated ranked submission.
 */
export async function processRankedSession({ connection, userId, sessionId, scoreId }) {
  if (!connection) throw new Error('A database transaction connection is required for ranked processing')
  if (![userId, sessionId, scoreId].every((value) => Number.isSafeInteger(Number(value)) && Number(value) > 0)) {
    throw httpError(400, 'A valid user, session, and score record are required for ranked processing')
  }

  // Resolve submitted values from the persisted score and session. The score
  // insert and this read share the score submission transaction.
  const [sessionRows] = await connection.execute(
    `SELECT gs.id AS session_id, gs.user_id, gs.game_id, gs.score AS session_score,
            gs.duration AS session_duration, gs.played_at,
            s.id AS score_id, s.score AS recorded_score, s.duration AS score_duration,
            g.slug AS game_slug
     FROM game_sessions gs
     JOIN games g ON g.id = gs.game_id AND g.is_active = 1
     JOIN scores s ON s.id = ?
                   AND s.user_id = gs.user_id
                   AND s.game_id = gs.game_id
                   AND s.score = gs.score
                   AND s.duration = gs.duration
     WHERE gs.id = ? AND gs.user_id = ?
     LIMIT 1
     FOR UPDATE`,
    [scoreId, sessionId, userId],
  )
  const session = sessionRows[0]
  if (!session) {
    throw httpError(400, 'Ranked progression requires a valid stored score and matching game session')
  }

  const gameSlug = session.game_slug
  const score = Number(session.recorded_score)
  const duration = Number(session.score_duration)
  if (!GAME_BENCHMARKS[gameSlug]) {
    return { eligible: false, reason: 'Game not eligible for ranked' }
  }

  const benchmark = GAME_BENCHMARKS[gameSlug]
  if (!Number.isInteger(score) || score < benchmark.minScore || score > benchmark.maxScore
    || !Number.isFinite(duration) || duration < benchmark.minDuration || duration > benchmark.maxDuration) {
    throw httpError(400, 'Stored score or duration is invalid for ranked progression')
  }

  // Use the persisted UTC play time to assign sessions at a season boundary
  // to the season in which they actually occurred.
  const [seasonRows] = await connection.execute(
    `SELECT id, season_number, title, description, start_date, end_date, is_active
     FROM ranked_seasons
     WHERE is_active = 1 AND start_date <= ? AND end_date >= ?
     ORDER BY season_number DESC
     LIMIT 1`,
    [session.played_at, session.played_at],
  )
  const activeSeason = seasonRows[0] || null
  if (!activeSeason) {
    return { eligible: false, reason: 'No active ranked season at the time of this session' }
  }

  // 3. Idempotency Check in ranked_matches
  const [existingMatch] = await connection.execute(
    'SELECT id, rp_change, result, tier_after, rp_after FROM ranked_matches WHERE session_id = ? LIMIT 1',
    [sessionId],
  )

  if (existingMatch.length > 0) {
    return {
      eligible: true,
      duplicate: true,
      rpChange: existingMatch[0].rp_change,
      result: existingMatch[0].result,
      tierAfter: existingMatch[0].tier_after,
      rpAfter: existingMatch[0].rp_after,
    }
  }

  // 4. Ensure user rank row exists
  await ensureUserSeasonRank(connection, userId, activeSeason.id)

  // 5. Lock and read user's current rank
  const [[userRank]] = await connection.execute(
    `SELECT id, tier, rp, peak_rp, matches_played, wins, losses
     FROM user_season_ranks
     WHERE user_id = ? AND season_id = ?
     FOR UPDATE`,
    [userId, activeSeason.id],
  )

  const currentRp = Number(userRank.rp || 0)
  const currentTier = userRank.tier || 'BRONZE'

  // 6. Calculate RP change
  const calc = calculateMatchRp({
    gameSlug,
    score,
    currentTier,
    duration,
  })

  const newRp = Math.max(0, currentRp + calc.rpChange)
  const newPeakRp = Math.max(Number(userRank.peak_rp || 0), newRp)
  const newTier = getTierForRp(newRp)

  const isWin = calc.result === 'WIN' ? 1 : 0
  const isLoss = calc.result === 'LOSS' ? 1 : 0

  // 7. Update user_season_ranks
  await connection.execute(
    `UPDATE user_season_ranks
     SET rp = ?,
         peak_rp = ?,
         tier = ?,
         matches_played = matches_played + 1,
         wins = wins + ?,
         losses = losses + ?,
         updated_at = UTC_TIMESTAMP(3)
     WHERE id = ?`,
    [newRp, newPeakRp, newTier, isWin, isLoss, userRank.id],
  )

  // 8. Record ranked_matches log
  await connection.execute(
    `INSERT INTO ranked_matches
      (user_id, season_id, session_id, game_id, score, duration,
       rp_change, rp_before, rp_after, result, tier_before, tier_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      activeSeason.id,
      sessionId,
      session.game_id,
      score,
      duration.toFixed(3),
      calc.rpChange,
      currentRp,
      newRp,
      calc.result,
      currentTier,
      newTier,
    ],
  )

  return {
    eligible: true,
    seasonId: activeSeason.id,
    seasonNumber: activeSeason.season_number,
    rpChange: calc.rpChange,
    rpBefore: currentRp,
    rpAfter: newRp,
    result: calc.result,
    tierBefore: currentTier,
    tierAfter: newTier,
    tierPromoted: TIER_ORDER[newTier] > TIER_ORDER[currentTier],
    tierDemoted: TIER_ORDER[newTier] < TIER_ORDER[currentTier],
    performancePct: calc.performancePct,
  }
}

// ────────────────────────────────────────────────────────────
// PLAYER PROFILE & STATS
// ────────────────────────────────────────────────────────────

/**
 * Get comprehensive ranked profile for a user
 */
export async function getPlayerRankedProfile(userId, seasonIdParam = null, { matchesPage = 1, matchesLimit = 10 } = {}) {
  const safeMatchesPage = Number(matchesPage)
  const safeMatchesLimit = Number(matchesLimit)
  if (!Number.isSafeInteger(safeMatchesPage) || safeMatchesPage < 1) {
    throw httpError(400, 'Match history page must be a positive integer')
  }
  if (!Number.isSafeInteger(safeMatchesLimit) || safeMatchesLimit < 1 || safeMatchesLimit > 100) {
    throw httpError(400, 'Match history limit must be an integer between 1 and 100')
  }
  const matchesOffset = (safeMatchesPage - 1) * safeMatchesLimit
  if (!Number.isSafeInteger(matchesOffset)) throw httpError(400, 'Requested match history page is too large')

  const targetSeason = await resolveViewSeason(seasonIdParam)
  if (!targetSeason) return emptyRankedProfile()

  const now = new Date()
  const seasonStart = new Date(targetSeason.start_date)
  const seasonEnd = new Date(targetSeason.end_date)
  const isSeasonActive = Boolean(targetSeason.is_active) && seasonStart <= now && seasonEnd >= now
  const isUpcoming = seasonStart > now
  if (isSeasonActive) await ensureUserSeasonRank(pool, userId, targetSeason.id)

  // Get user rank record
  const [rankRows] = await pool.query(
    `SELECT usr.id, usr.tier, usr.rp, usr.peak_rp, usr.matches_played, usr.wins, usr.losses,
            usr.reward_claimed, usr.claimed_at,
            u.id AS user_id, u.username, u.avatar, u.selected_title, u.selected_frame
     FROM user_season_ranks usr
     JOIN users u ON u.id = usr.user_id
     WHERE usr.user_id = ? AND usr.season_id = ?
     LIMIT 1`,
    [userId, targetSeason.id],
  )

  let rankRow = rankRows[0]
  if (!rankRow) {
    const [users] = await pool.query(
      'SELECT id, username, avatar, selected_title, selected_frame FROM users WHERE id = ? LIMIT 1',
      [userId],
    )
    if (!users[0]) throw httpError(404, 'User not found')
    rankRow = {
      id: null,
      tier: 'BRONZE',
      rp: 0,
      peak_rp: 0,
      matches_played: 0,
      wins: 0,
      losses: 0,
      reward_claimed: 0,
      claimed_at: null,
      user_id: users[0].id,
      username: users[0].username,
      avatar: users[0].avatar,
      selected_title: users[0].selected_title,
      selected_frame: users[0].selected_frame,
    }
  }

  // Calculate user's placement rank in this season
  let rankPosition = null
  if (rankRow.id !== null) {
    const [[rankPos]] = await pool.query(
      `SELECT COUNT(*) + 1 AS position
       FROM user_season_ranks
       WHERE season_id = ?
         AND (rp > ? OR (rp = ? AND peak_rp > ?) OR (rp = ? AND peak_rp = ? AND user_id < ?))`,
      [targetSeason.id, rankRow.rp, rankRow.rp, rankRow.peak_rp, rankRow.rp, rankRow.peak_rp, userId],
    )
    rankPosition = Number(rankPos.position)
  }

  const [[totalPlayersRow]] = await pool.query(
    'SELECT COUNT(*) AS total FROM user_season_ranks WHERE season_id = ?',
    [targetSeason.id],
  )

  // Paginated ranked session history for the selected season
  const [[historyCountRow]] = await pool.query(
    'SELECT COUNT(*) AS total FROM ranked_matches WHERE user_id = ? AND season_id = ?',
    [userId, targetSeason.id],
  )
  const historyTotal = Number(historyCountRow.total)
  const [matches] = await pool.query(
    `SELECT rm.id, rm.score, rm.duration, rm.rp_change, rm.rp_before, rm.rp_after,
            rm.result, rm.tier_before, rm.tier_after, rm.created_at,
            g.id AS game_id, g.name AS game_name, g.slug AS game_slug, g.category AS game_category
     FROM ranked_matches rm
     JOIN games g ON g.id = rm.game_id
     WHERE rm.user_id = ? AND rm.season_id = ?
     ORDER BY rm.created_at DESC, rm.id DESC
     LIMIT ${safeMatchesLimit} OFFSET ${matchesOffset}`,
    [userId, targetSeason.id],
  )

  // Season rewards list for this season
  const [rewards] = await pool.query(
    `SELECT min_tier, reward_badge, reward_title, reward_frame, bonus_score, xp_reward
     FROM season_rewards
     WHERE season_id = ?
     ORDER BY FIELD(min_tier, 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')`,
    [targetSeason.id],
  )

  const tierInfo = getTierInfo(rankRow.tier, rankRow.rp)
  const winRate = rankRow.matches_played > 0 ? Math.round((rankRow.wins / rankRow.matches_played) * 100) : 0

  const isSeasonEnded = seasonEnd < now

  return {
    season: {
      id: Number(targetSeason.id),
      seasonNumber: targetSeason.season_number,
      title: targetSeason.title,
      description: targetSeason.description,
      startDate: targetSeason.start_date,
      endDate: targetSeason.end_date,
      isActive: isSeasonActive,
      isEnded: isSeasonEnded,
      isUpcoming,
      secondsRemaining: isSeasonActive ? Math.max(0, Math.floor((seasonEnd - now) / 1000)) : 0,
      secondsUntilStart: isUpcoming
        ? Math.max(0, Math.floor((seasonStart - now) / 1000))
        : 0,
    },
    player: {
      userId: Number(rankRow.user_id),
      username: rankRow.username,
      avatar: rankRow.avatar,
      selectedTitle: rankRow.selected_title,
      selectedFrame: rankRow.selected_frame,
      rp: Number(rankRow.rp),
      peakRp: Number(rankRow.peak_rp),
      tier: rankRow.tier,
      tierInfo,
      rankPosition,
      totalPlayers: Number(totalPlayersRow.total),
      matchesPlayed: Number(rankRow.matches_played),
      wins: Number(rankRow.wins),
      losses: Number(rankRow.losses),
      winRate,
      rewardClaimed: Boolean(rankRow.reward_claimed),
      claimedAt: rankRow.claimed_at,
    },
    recentMatches: matches.map((m) => ({
      id: Number(m.id),
      score: Number(m.score),
      duration: Number(m.duration),
      rpChange: Number(m.rp_change),
      rpBefore: Number(m.rp_before),
      rpAfter: Number(m.rp_after),
      result: m.result,
      tierBefore: m.tier_before,
      tierAfter: m.tier_after,
      createdAt: m.created_at,
      game: {
        id: Number(m.game_id),
        name: m.game_name,
        slug: m.game_slug,
        category: m.game_category,
      },
    })),
    matchesPagination: {
      total: historyTotal,
      page: safeMatchesPage,
      limit: safeMatchesLimit,
      totalPages: Math.max(1, Math.ceil(historyTotal / safeMatchesLimit)),
      hasPrev: safeMatchesPage > 1,
      hasNext: safeMatchesPage < Math.max(1, Math.ceil(historyTotal / safeMatchesLimit)),
    },
    seasonRewards: rewards.map((r) => ({
      minTier: r.min_tier,
      badge: r.reward_badge,
      title: r.reward_title,
      frame: r.reward_frame,
      bonusScore: Number(r.bonus_score),
      xpReward: Number(r.xp_reward),
      isEligible: Number(rankRow.matches_played) > 0
        && TIER_ORDER[rankRow.peak_rp ? getTierForRp(rankRow.peak_rp) : rankRow.tier] >= TIER_ORDER[r.min_tier],
    })),
  }
}

// ────────────────────────────────────────────────────────────
// SEASON LEADERBOARD
// ────────────────────────────────────────────────────────────

/**
 * Get Season Leaderboard with pagination
 */
export async function getSeasonLeaderboard(userId, { seasonId = null, page = 1, limit = 20, tierFilter = null } = {}) {
  const safePage = Number(page)
  const safeLimit = Number(limit)
  if (!Number.isSafeInteger(safePage) || safePage < 1) {
    throw httpError(400, 'Page must be a positive integer')
  }
  if (!Number.isSafeInteger(safeLimit) || safeLimit < 1 || safeLimit > 100) {
    throw httpError(400, 'Limit must be an integer between 1 and 100')
  }
  const offset = (safePage - 1) * safeLimit
  if (!Number.isSafeInteger(offset)) throw httpError(400, 'Requested leaderboard page is too large')

  if (tierFilter && !RANK_TIERS.some((t) => t.tier === String(tierFilter).toUpperCase())) {
    throw httpError(400, 'Tier filter is invalid')
  }

  const targetSeason = await resolveViewSeason(seasonId)
  if (!targetSeason) {
    return {
      season: null,
      entries: [],
      currentUser: null,
      pagination: { total: 0, page: safePage, limit: safeLimit, totalPages: 1, hasPrev: safePage > 1, hasNext: false },
    }
  }

  const leaderboardNow = new Date()
  if (Boolean(targetSeason.is_active)
    && new Date(targetSeason.start_date) <= leaderboardNow
    && new Date(targetSeason.end_date) >= leaderboardNow) {
    await ensureUserSeasonRank(pool, userId, targetSeason.id)
  }

  // Build filter condition
  let whereSql = 'WHERE usr.season_id = ?'
  const params = [targetSeason.id]

  if (tierFilter) {
    whereSql += ' AND usr.tier = ?'
    params.push(tierFilter.toUpperCase())
  }

  // Count total entries
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM user_season_ranks usr ${whereSql}`,
    params,
  )
  const total = Number(countRows[0]?.total || 0)

  // Query ranked list
  const [rows] = await pool.query(
    `SELECT
       usr.id,
       usr.user_id,
       usr.tier,
       usr.rp,
       usr.peak_rp,
       usr.matches_played,
       usr.wins,
       usr.losses,
       u.username,
       u.avatar,
       u.selected_title,
       u.selected_frame
     FROM user_season_ranks usr
     JOIN users u ON u.id = usr.user_id
     ${whereSql}
     ORDER BY usr.rp DESC, usr.peak_rp DESC, usr.user_id ASC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    params,
  )

  // Query current user's entry for the banner
  const [selfRows] = await pool.query(
    `SELECT
       usr.id,
       usr.user_id,
       usr.tier,
       usr.rp,
       usr.peak_rp,
       usr.matches_played,
       usr.wins,
       usr.losses,
       u.username,
       u.avatar,
       u.selected_title,
       u.selected_frame,
       (
         SELECT COUNT(*) + 1
         FROM user_season_ranks other
         WHERE other.season_id = usr.season_id
           AND (other.rp > usr.rp OR (other.rp = usr.rp AND other.peak_rp > usr.peak_rp) OR (other.rp = usr.rp AND other.peak_rp = usr.peak_rp AND other.user_id < usr.user_id))
       ) AS rank_position
     FROM user_season_ranks usr
     JOIN users u ON u.id = usr.user_id
     WHERE usr.user_id = ? AND usr.season_id = ?
     LIMIT 1`,
    [userId, targetSeason.id],
  )

  const entries = rows.map((r, idx) => ({
    id: Number(r.id),
    userId: Number(r.user_id),
    username: r.username,
    avatar: r.avatar,
    selectedTitle: r.selected_title,
    selectedFrame: r.selected_frame,
    tier: r.tier,
    tierInfo: getTierInfo(r.tier, r.rp),
    rp: Number(r.rp),
    peakRp: Number(r.peak_rp),
    matchesPlayed: Number(r.matches_played),
    wins: Number(r.wins),
    losses: Number(r.losses),
    winRate: r.matches_played > 0 ? Math.round((r.wins / r.matches_played) * 100) : 0,
    rank: offset + idx + 1,
  }))

  const currentUser = selfRows[0]
    ? {
        id: Number(selfRows[0].id),
        userId: Number(selfRows[0].user_id),
        username: selfRows[0].username,
        avatar: selfRows[0].avatar,
        selectedTitle: selfRows[0].selected_title,
        selectedFrame: selfRows[0].selected_frame,
        tier: selfRows[0].tier,
        tierInfo: getTierInfo(selfRows[0].tier, selfRows[0].rp),
        rp: Number(selfRows[0].rp),
        peakRp: Number(selfRows[0].peak_rp),
        matchesPlayed: Number(selfRows[0].matches_played),
        wins: Number(selfRows[0].wins),
        losses: Number(selfRows[0].losses),
        winRate: selfRows[0].matches_played > 0 ? Math.round((selfRows[0].wins / selfRows[0].matches_played) * 100) : 0,
        rank: Number(selfRows[0].rank_position),
      }
    : null

  const totalPages = Math.max(1, Math.ceil(total / safeLimit))

  return {
    season: {
      id: Number(targetSeason.id),
      seasonNumber: targetSeason.season_number,
      title: targetSeason.title,
      endDate: targetSeason.end_date,
    isActive: Boolean(targetSeason.is_active)
      && new Date(targetSeason.start_date) <= new Date()
      && new Date(targetSeason.end_date) >= new Date(),
    },
    entries,
    currentUser,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    },
  }
}

// ────────────────────────────────────────────────────────────
// CLAIM SEASON REWARDS
// ────────────────────────────────────────────────────────────

/**
 * Claim end-of-season rewards when season is completed.
 * Atomically verifies eligibility and prevents double claiming.
 */
export async function claimSeasonRewards(userId, seasonId) {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // 1. Load season
    const [seasons] = await connection.execute(
      'SELECT id, season_number, title, end_date FROM ranked_seasons WHERE id = ? LIMIT 1',
      [seasonId],
    )
    if (seasons.length === 0) throw httpError(404, 'Season not found')
    const season = seasons[0]

    // Verify season has actually ended
    if (new Date(season.end_date) > new Date()) {
      throw httpError(400, 'This season is still active. Season rewards can only be claimed after the season ends.')
    }

    // 2. Lock user season rank
    const [rankRows] = await connection.execute(
      `SELECT id, tier, peak_rp, matches_played, reward_claimed
       FROM user_season_ranks
       WHERE user_id = ? AND season_id = ?
       FOR UPDATE`,
      [userId, seasonId],
    )

    if (rankRows.length === 0) {
      throw httpError(404, 'No ranked record found for this season')
    }

    const usr = rankRows[0]

    if (usr.reward_claimed) {
      throw httpError(409, 'Season rewards have already been claimed')
    }

    if (usr.matches_played === 0) {
      throw httpError(400, 'You did not participate in any ranked matches this season')
    }

    // Determine final reward tier based on peak_rp achieved during season
    const bestTier = usr.peak_rp ? getTierForRp(usr.peak_rp) : usr.tier
    const bestTierOrder = TIER_ORDER[bestTier] || 1

    // 3. Find matching rewards for user's tier
    const [rewards] = await connection.execute(
      `SELECT min_tier, reward_badge, reward_title, reward_frame, bonus_score, xp_reward
       FROM season_rewards
       WHERE season_id = ?
       ORDER BY FIELD(min_tier, 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND') DESC`,
      [seasonId],
    )

    // Grant highest qualifying reward tier
    const granted = rewards.find((r) => TIER_ORDER[r.min_tier] <= bestTierOrder)

    if (!granted) {
      throw httpError(400, 'No reward tier found for your rank')
    }

    // 4. Mark claimed
    await connection.execute(
      'UPDATE user_season_ranks SET reward_claimed = 1, claimed_at = UTC_TIMESTAMP(3) WHERE id = ?',
      [usr.id],
    )

    // 5. Grant rewards: XP, Bonus Score, Cosmetics
    let xpResult = null
    if (granted.xp_reward > 0) {
      xpResult = await addXp({
        connection,
        userId,
        amount: granted.xp_reward,
        sourceType: 'RANKED_REWARD',
        sourceId: season.id,
        description: `Season ${season.season_number} ${bestTier} Reward`,
      })
    }

    if (granted.bonus_score > 0) {
      await connection.execute(
        'UPDATE users SET total_score = total_score + ? WHERE id = ?',
        [granted.bonus_score, userId],
      )
    }

    const cosmeticsGranted = []

    if (granted.reward_badge) {
      await connection.execute(
        `INSERT INTO user_cosmetics (user_id, cosmetic_type, cosmetic_value, label, icon)
         VALUES (?, 'BADGE', ?, ?, 'award')
         ON DUPLICATE KEY UPDATE unlocked_at = CURRENT_TIMESTAMP(3)`,
        [userId, granted.reward_badge, granted.reward_badge],
      )
      cosmeticsGranted.push({ type: 'BADGE', label: granted.reward_badge })
    }

    if (granted.reward_title) {
      await connection.execute(
        `INSERT INTO user_cosmetics (user_id, cosmetic_type, cosmetic_value, label, icon)
         VALUES (?, 'TITLE', ?, ?, 'crown')
         ON DUPLICATE KEY UPDATE unlocked_at = CURRENT_TIMESTAMP(3)`,
        [userId, granted.reward_title, `Title: ${granted.reward_title}`],
      )
      cosmeticsGranted.push({ type: 'TITLE', label: granted.reward_title })
    }

    if (granted.reward_frame) {
      await connection.execute(
        `INSERT INTO user_cosmetics (user_id, cosmetic_type, cosmetic_value, label, icon)
         VALUES (?, 'FRAME', ?, ?, 'sparkles')
         ON DUPLICATE KEY UPDATE unlocked_at = CURRENT_TIMESTAMP(3)`,
        [userId, granted.reward_frame, `Frame: ${granted.reward_frame}`],
      )
      cosmeticsGranted.push({ type: 'FRAME', label: granted.reward_frame })
    }

    await connection.commit()

    const [[user]] = await pool.query('SELECT total_score, xp, level FROM users WHERE id = ?', [userId])

    return {
      seasonId: Number(season.id),
      seasonTitle: season.title,
      tierAchieved: bestTier,
      rewardsGranted: {
        xp: granted.xp_reward,
        bonusScore: granted.bonus_score,
        cosmetics: cosmeticsGranted,
      },
      newTotalScore: Number(user?.total_score || 0),
      newXp: Number(user?.xp || 0),
      newLevel: Number(user?.level || 1),
    }
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}
