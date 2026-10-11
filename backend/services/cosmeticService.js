import pool from '../config/database.js'

function httpError(statusCode, message) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

/**
 * Get all cosmetics and badges unlocked by user, with current equipped status.
 */
export async function getUserCosmetics(userId) {
  const [[user]] = await pool.query(
    'SELECT id, selected_title, selected_frame FROM users WHERE id = ? LIMIT 1',
    [userId],
  )
  if (!user) throw httpError(404, 'User not found')

  const [rows] = await pool.query(
    `SELECT id, cosmetic_type, cosmetic_value, label, icon, unlocked_at
     FROM user_cosmetics
     WHERE user_id = ?
     ORDER BY unlocked_at DESC, id DESC`,
    [userId],
  )

  const badges = []
  const titles = []
  const frames = []

  for (const item of rows) {
    const formatted = {
      id: Number(item.id),
      value: item.cosmetic_value,
      label: item.label,
      icon: item.icon,
      unlockedAt: item.unlocked_at,
    }

    if (item.cosmetic_type === 'BADGE') {
      badges.push(formatted)
    } else if (item.cosmetic_type === 'TITLE') {
      titles.push({
        ...formatted,
        isEquipped: user.selected_title === item.cosmetic_value,
      })
    } else if (item.cosmetic_type === 'FRAME') {
      frames.push({
        ...formatted,
        isEquipped: user.selected_frame === item.cosmetic_value,
      })
    }
  }

  return {
    equipped: {
      title: user.selected_title || null,
      frame: user.selected_frame || null,
    },
    badges,
    titles,
    frames,
  }
}

/**
 * Equip or unequip a title or profile frame.
 */
export async function equipCosmetic(userId, { type, value }) {
  const cosmeticType = String(type || '').toUpperCase()

  if (!['TITLE', 'FRAME'].includes(cosmeticType)) {
    throw httpError(400, "Type must be either 'TITLE' or 'FRAME'")
  }

  if (value !== null && value !== undefined && value !== '') {
    // Verify user owns this cosmetic
    const [owned] = await pool.query(
      'SELECT id FROM user_cosmetics WHERE user_id = ? AND cosmetic_type = ? AND cosmetic_value = ? LIMIT 1',
      [userId, cosmeticType, value],
    )
    if (owned.length === 0) {
      throw httpError(403, 'You do not own this cosmetic')
    }
  }

  const column = cosmeticType === 'TITLE' ? 'selected_title' : 'selected_frame'
  const equipValue = value || null

  await pool.query(
    `UPDATE users SET ${column} = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
    [equipValue, userId],
  )

  return getUserCosmetics(userId)
}
