import pool from '../config/database.js'

/**
 * Calculates level and progress information given total XP.
 * Level progression curve:
 * Level 1: 0 - 199 XP (200 XP required)
 * Level 2: 200 - 499 XP (300 XP required)
 * Level 3: 500 - 899 XP (400 XP required)
 * Level 4: 900 - 1399 XP (500 XP required)
 * Level L requires: 100 + L * 100 XP to advance to L + 1
 */
export function calculateLevelInfo(totalXp) {
  const xp = Math.max(0, Number(totalXp) || 0)

  let currentLevel = 1
  let currentLevelThreshold = 0
  let nextLevelThreshold = 200

  while (xp >= nextLevelThreshold) {
    currentLevel += 1
    currentLevelThreshold = nextLevelThreshold
    nextLevelThreshold = currentLevelThreshold + (100 + currentLevel * 100)
  }

  const xpInLevel = xp - currentLevelThreshold
  const xpRequiredForNext = nextLevelThreshold - currentLevelThreshold
  const progressPercent = Math.min(100, Math.floor((xpInLevel / xpRequiredForNext) * 100))

  return {
    level: currentLevel,
    totalXp: xp,
    currentLevelThreshold,
    nextLevelThreshold,
    xpInLevel,
    xpRequiredForNext,
    progressPercent,
  }
}

/**
 * Atomically grants XP to a user and logs the transaction.
 * Must be executed with an active database connection or pool.
 */
export async function addXp({ connection, userId, amount, sourceType, sourceId = null, description }) {
  const grantAmount = Math.max(0, Math.floor(Number(amount) || 0))
  if (grantAmount === 0) return null

  const conn = connection || (await pool.getConnection())
  const needRelease = !connection

  try {
    // 1. Fetch current XP
    const [[currentUser]] = await conn.execute(
      'SELECT id, xp, level FROM users WHERE id = ? FOR UPDATE',
      [userId],
    )

    if (!currentUser) {
      throw new Error(`User ${userId} not found`)
    }

    const previousXp = Number(currentUser.xp || 0)
    const previousLevel = Number(currentUser.level || 1)
    const newXp = previousXp + grantAmount

    const newLevelInfo = calculateLevelInfo(newXp)
    const newLevel = newLevelInfo.level
    const leveledUp = newLevel > previousLevel

    // 2. Insert audit log in xp_transactions
    await conn.execute(
      `INSERT INTO xp_transactions (user_id, amount, source_type, source_id, description)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, grantAmount, sourceType, sourceId, description || `${sourceType} reward`],
    )

    // 3. Update user xp and level
    await conn.execute(
      'UPDATE users SET xp = ?, level = ? WHERE id = ?',
      [newXp, newLevel, userId],
    )

    return {
      userId,
      grantAmount,
      previousXp,
      newXp,
      previousLevel,
      newLevel,
      leveledUp,
      levelInfo: newLevelInfo,
    }
  } finally {
    if (needRelease) conn.release()
  }
}

/**
 * Get user XP audit history
 */
export async function getXpHistory(userId, limit = 20) {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)))
  const [rows] = await pool.query(
    `SELECT id, amount, source_type, source_id, description, created_at
     FROM xp_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [userId, safeLimit],
  )

  return rows.map((r) => ({
    id: Number(r.id),
    amount: Number(r.amount),
    sourceType: r.source_type,
    sourceId: r.source_id ? Number(r.source_id) : null,
    description: r.description,
    createdAt: r.created_at,
  }))
}
