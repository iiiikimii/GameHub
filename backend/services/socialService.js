import pool from '../config/database.js'

const PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

function httpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function pagination(query = {}) {
  const parse = (value, fallback, name, max) => {
    if (value === undefined || value === '') return fallback
    const n = Number(value)
    if (!Number.isSafeInteger(n) || n < 1 || n > max) throw httpError(400, `${name} must be a positive integer`)
    return n
  }
  const page = parse(query.page, 1, 'page', 100000)
  const limit = parse(query.limit, PAGE_SIZE, 'limit', MAX_PAGE_SIZE)
  return { page, limit, offset: (page - 1) * limit }
}

function pageInfo(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return { total, page, limit, totalPages, hasPrev: page > 1, hasNext: page < totalPages }
}

function canonicalIds(a, b) {
  const left = BigInt(a)
  const right = BigInt(b)
  return left < right ? [left.toString(), right.toString()] : [right.toString(), left.toString()]
}

async function blockedBetween(executor, a, b) {
  const [rows] = await executor.execute(
    `SELECT 1 FROM user_blocks
     WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
     LIMIT 1`,
    [a, b, b, a],
  )
  return rows.length > 0
}

function normalizeUser(row) {
  return {
    id: Number(row.id),
    username: row.username,
    avatar: row.avatar ?? null,
    totalScore: Number(row.total_score ?? 0),
  }
}

/** Username search returns only active accounts and a small public field allowlist. */
export async function searchUsers(viewerId, query = {}) {
  const { page, limit, offset } = pagination(query)
  const term = typeof query.search === 'string' ? query.search.trim() : ''
  if (term.length < 2 || term.length > 50) throw httpError(400, 'search must be between 2 and 50 characters')
  const escaped = term.replace(/[!%_]/g, (char) => `!${char}`)
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM users u
     WHERE u.is_active = 1 AND u.id <> ? AND u.username LIKE ? ESCAPE '!'
       AND NOT EXISTS (
         SELECT 1 FROM user_blocks b
         WHERE (b.blocker_id = ? AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = ?)
       )`,
    [viewerId, `%${escaped}%`, viewerId, viewerId],
  )
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.avatar, u.total_score,
            f.id AS friendship_id, f.status AS friendship_status,
            f.requester_id, f.recipient_id
     FROM users u
     LEFT JOIN friendships f
       ON f.user_low_id = LEAST(u.id, ?) AND f.user_high_id = GREATEST(u.id, ?)
     WHERE u.is_active = 1 AND u.id <> ? AND u.username LIKE ? ESCAPE '!'
       AND NOT EXISTS (
         SELECT 1 FROM user_blocks b
         WHERE (b.blocker_id = ? AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = ?)
       )
     ORDER BY u.username ASC, u.id ASC LIMIT ${limit} OFFSET ${offset}`,
    [viewerId, viewerId, viewerId, `%${escaped}%`, viewerId, viewerId],
  )
  return {
    users: rows.map((row) => ({
      ...normalizeUser(row),
      relationship: row.friendship_id ? {
        id: Number(row.friendship_id),
        status: row.friendship_status,
        direction: row.friendship_status === 'ACCEPTED'
          ? 'FRIENDS'
          : (String(row.requester_id) === String(viewerId) ? 'OUTGOING' : 'INCOMING'),
      } : null,
    })),
    pagination: pageInfo(Number(countRows[0].total), page, limit),
  }
}

/** Public profile deliberately excludes email, role, password, private sessions and account flags. */
export async function getPublicProfile(viewerId, username) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.username, u.avatar, u.total_score, u.level, u.xp,
            u.selected_title, u.selected_frame, u.created_at,
            (SELECT COUNT(*) FROM game_sessions gs WHERE gs.user_id = u.id) AS games_played,
            (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) AS achievements_unlocked,
            (SELECT COUNT(*) FROM friendships f WHERE f.status = 'ACCEPTED' AND (f.user_low_id = u.id OR f.user_high_id = u.id)) AS friends_count,
            f.id AS friendship_id, f.status AS friendship_status, f.requester_id
     FROM users u
     LEFT JOIN friendships f
       ON f.user_low_id = LEAST(u.id, ?) AND f.user_high_id = GREATEST(u.id, ?)
     WHERE u.username = ? AND u.is_active = 1
       AND NOT EXISTS (
         SELECT 1 FROM user_blocks b
         WHERE (b.blocker_id = ? AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = ?)
       )
     LIMIT 1`,
    [viewerId, viewerId, username, viewerId, viewerId],
  )
  const user = rows[0]
  if (!user) throw httpError(404, 'Profile not found')
  const [achievementRows] = await pool.execute(
    `SELECT a.id, a.name, a.description, a.icon, ua.unlocked_at
     FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = ? ORDER BY ua.unlocked_at DESC, ua.id DESC LIMIT 8`,
    [user.id],
  )
  return {
    id: Number(user.id),
    username: user.username,
    avatar: user.avatar ?? null,
    totalScore: Number(user.total_score),
    level: Number(user.level || 1),
    xp: Number(user.xp || 0),
    selectedTitle: user.selected_title ?? null,
    selectedFrame: user.selected_frame ?? null,
    gamesPlayed: Number(user.games_played),
    achievementsUnlocked: Number(user.achievements_unlocked),
    friendsCount: Number(user.friends_count),
    memberSince: user.created_at,
    achievements: achievementRows.map((row) => ({
      id: Number(row.id), name: row.name, description: row.description, icon: row.icon, unlockedAt: row.unlocked_at,
    })),
    relationship: user.friendship_id ? {
      id: Number(user.friendship_id),
      status: user.friendship_status,
      direction: user.friendship_status === 'ACCEPTED'
        ? 'FRIENDS'
        : (String(user.requester_id) === String(viewerId) ? 'OUTGOING' : 'INCOMING'),
    } : null,
    isSelf: String(user.id) === String(viewerId),
  }
}

export async function sendFriendRequest(viewerId, targetUsername) {
  if (typeof targetUsername !== 'string' || targetUsername.trim().length < 3 || targetUsername.trim().length > 50) {
    throw httpError(400, 'A valid target username is required')
  }
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [targets] = await connection.execute(
      'SELECT id, username FROM users WHERE username = ? AND is_active = 1 LIMIT 1',
      [targetUsername.trim()],
    )
    const target = targets[0]
    if (!target) throw httpError(404, 'User not found')
    if (String(target.id) === String(viewerId)) throw httpError(400, 'You cannot send a friend request to yourself')

    const [low, high] = canonicalIds(viewerId, target.id)
    const [lockedUsers] = await connection.execute('SELECT id, is_active FROM users WHERE id IN (?, ?) ORDER BY id FOR UPDATE', [low, high])
    if (lockedUsers.length !== 2 || lockedUsers.some((user) => !user.is_active)) throw httpError(404, 'User not found')
    if (await blockedBetween(connection, viewerId, target.id)) throw httpError(404, 'User not found')
    const [existingRows] = await connection.execute(
      'SELECT * FROM friendships WHERE user_low_id = ? AND user_high_id = ? FOR UPDATE',
      [low, high],
    )
    const existing = existingRows[0]
    if (existing?.status === 'ACCEPTED') throw httpError(409, 'You are already friends')
    if (existing && String(existing.requester_id) === String(viewerId)) throw httpError(409, 'Friend request is already pending')

    if (existing) {
      await connection.execute(
        "UPDATE friendships SET status = 'ACCEPTED', accepted_at = UTC_TIMESTAMP(3) WHERE id = ?",
        [existing.id],
      )
      await connection.execute(
        "UPDATE notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP(3)) WHERE friendship_id = ? AND notification_type = 'FRIEND_REQUEST'",
        [existing.id],
      )
      await connection.execute(
        "INSERT INTO notifications (recipient_id, actor_id, notification_type, friendship_id) VALUES (?, ?, 'FRIEND_ACCEPTED', ?)",
        [existing.requester_id, viewerId, existing.id],
      )
      await connection.commit()
      return { status: 'ACCEPTED', friendshipId: Number(existing.id), autoAccepted: true }
    }

    const [result] = await connection.execute(
      `INSERT INTO friendships (user_low_id, user_high_id, requester_id, recipient_id, status)
       VALUES (?, ?, ?, ?, 'PENDING')`,
      [low, high, viewerId, target.id],
    )
    await connection.execute(
      "INSERT INTO notifications (recipient_id, actor_id, notification_type, friendship_id) VALUES (?, ?, 'FRIEND_REQUEST', ?)",
      [target.id, viewerId, result.insertId],
    )
    await connection.commit()
    return { status: 'PENDING', friendshipId: Number(result.insertId), autoAccepted: false }
  } catch (error) {
    await connection.rollback()
    if (error.code === 'ER_DUP_ENTRY') throw httpError(409, 'A friend request or friendship already exists')
    throw error
  } finally {
    connection.release()
  }
}

export async function respondToFriendRequest(viewerId, friendshipId, action) {
  const normalizedAction = String(action || '').toUpperCase()
  if (!['ACCEPT', 'REJECT', 'CANCEL'].includes(normalizedAction)) throw httpError(400, 'action must be ACCEPT, REJECT, or CANCEL')
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.execute('SELECT * FROM friendships WHERE id = ? FOR UPDATE', [friendshipId])
    const friendship = rows[0]
    if (!friendship) throw httpError(404, 'Friend request not found')
    if (friendship.status !== 'PENDING') throw httpError(409, 'Friend request is no longer pending')
    const recipient = String(friendship.recipient_id) === String(viewerId)
    const requester = String(friendship.requester_id) === String(viewerId)
    if (normalizedAction === 'CANCEL') {
      if (!requester) throw httpError(403, 'Only the requester can cancel this request')
      await connection.execute('DELETE FROM friendships WHERE id = ?', [friendshipId])
      await connection.commit()
      return { status: 'CANCELLED' }
    }
    if (!recipient) throw httpError(403, 'Only the recipient can respond to this request')
    if (await blockedBetween(connection, friendship.requester_id, friendship.recipient_id)) {
      await connection.execute('DELETE FROM friendships WHERE id = ?', [friendshipId])
      await connection.commit()
      return { status: 'UNAVAILABLE' }
    }
    if (normalizedAction === 'REJECT') {
      await connection.execute('DELETE FROM friendships WHERE id = ?', [friendshipId])
      await connection.commit()
      return { status: 'REJECTED' }
    }
    await connection.execute(
      "UPDATE friendships SET status = 'ACCEPTED', accepted_at = UTC_TIMESTAMP(3) WHERE id = ?",
      [friendshipId],
    )
    await connection.execute(
      "UPDATE notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP(3)) WHERE friendship_id = ? AND recipient_id = ? AND notification_type = 'FRIEND_REQUEST'",
      [friendshipId, viewerId],
    )
    await connection.execute(
      "INSERT INTO notifications (recipient_id, actor_id, notification_type, friendship_id) VALUES (?, ?, 'FRIEND_ACCEPTED', ?)",
      [friendship.requester_id, viewerId, friendshipId],
    )
    await connection.commit()
    return { status: 'ACCEPTED', friendshipId: Number(friendshipId) }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function listFriendRequests(viewerId, box, query = {}) {
  if (!['incoming', 'sent'].includes(box)) throw httpError(400, 'box must be incoming or sent')
  const { page, limit, offset } = pagination(query)
  const condition = box === 'incoming' ? 'f.recipient_id = ?' : 'f.requester_id = ?'
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM friendships f WHERE ${condition} AND f.status = 'PENDING'`,
    [viewerId],
  )
  const userJoin = box === 'incoming' ? 'u.id = f.requester_id' : 'u.id = f.recipient_id'
  const [rows] = await pool.query(
    `SELECT f.id AS friendship_id, f.created_at, u.id, u.username, u.avatar
     FROM friendships f JOIN users u ON ${userJoin}
     WHERE ${condition} AND f.status = 'PENDING'
       AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = f.requester_id AND b.blocked_id = f.recipient_id) OR (b.blocker_id = f.recipient_id AND b.blocked_id = f.requester_id))
     ORDER BY f.created_at DESC, f.id DESC LIMIT ${limit} OFFSET ${offset}`,
    [viewerId],
  )
  return {
    requests: rows.map((row) => ({ id: Number(row.friendship_id), user: { id: Number(row.id), username: row.username, avatar: row.avatar ?? null }, createdAt: row.created_at })),
    pagination: pageInfo(Number(countRows[0].total), page, limit),
  }
}

export async function listFriends(viewerId, query = {}) {
  const { page, limit, offset } = pagination(query)
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM friendships f
     JOIN users u ON u.id = IF(f.user_low_id = ?, f.user_high_id, f.user_low_id) AND u.is_active = 1
     WHERE f.status = 'ACCEPTED' AND (f.user_low_id = ? OR f.user_high_id = ?)
       AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ? AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = ?))`,
    [viewerId, viewerId, viewerId, viewerId, viewerId],
  )
  const [rows] = await pool.query(
    `SELECT f.id AS friendship_id, f.accepted_at, u.id, u.username, u.avatar, u.total_score
     FROM friendships f
     JOIN users u ON u.id = IF(f.user_low_id = ?, f.user_high_id, f.user_low_id) AND u.is_active = 1
     WHERE f.status = 'ACCEPTED' AND (f.user_low_id = ? OR f.user_high_id = ?)
       AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ? AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = ?))
     ORDER BY u.username ASC, u.id ASC LIMIT ${limit} OFFSET ${offset}`,
    [viewerId, viewerId, viewerId, viewerId, viewerId],
  )
  return {
    friends: rows.map((row) => ({ friendshipId: Number(row.friendship_id), ...normalizeUser(row), since: row.accepted_at })),
    pagination: pageInfo(Number(countRows[0].total), page, limit),
  }
}

export async function removeFriend(viewerId, friendshipId) {
  const [result] = await pool.execute(
    "DELETE FROM friendships WHERE id = ? AND status = 'ACCEPTED' AND (user_low_id = ? OR user_high_id = ?)",
    [friendshipId, viewerId, viewerId],
  )
  if (!result.affectedRows) throw httpError(404, 'Friendship not found')
  return { removed: true }
}

export async function blockUser(viewerId, username) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.execute('SELECT id FROM users WHERE username = ? AND is_active = 1 LIMIT 1', [username])
    const targetId = rows[0]?.id
    if (!targetId || String(targetId) === String(viewerId)) throw httpError(404, 'User not found')
    const [low, high] = canonicalIds(viewerId, targetId)
    await connection.execute('SELECT id FROM users WHERE id IN (?, ?) ORDER BY id FOR UPDATE', [low, high])
    await connection.execute('INSERT IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)', [viewerId, targetId])
    await connection.execute('DELETE FROM friendships WHERE user_low_id = ? AND user_high_id = ?', [low, high])
    await connection.execute(
      'DELETE FROM notifications WHERE (recipient_id = ? AND actor_id = ?) OR (recipient_id = ? AND actor_id = ?)',
      [viewerId, targetId, targetId, viewerId],
    )
    await connection.commit()
    return { blocked: true }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function unblockUser(viewerId, username) {
  const [result] = await pool.execute(
    `DELETE b FROM user_blocks b JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = ? AND u.username = ?`,
    [viewerId, username],
  )
  if (!result.affectedRows) throw httpError(404, 'Blocked user not found')
  return { unblocked: true }
}

export async function listBlockedUsers(viewerId, query = {}) {
  const { page, limit, offset } = pagination(query)
  const [[count]] = await pool.execute('SELECT COUNT(*) AS total FROM user_blocks WHERE blocker_id = ?', [viewerId])
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.avatar, b.created_at FROM user_blocks b
     JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id = ?
     ORDER BY b.created_at DESC, u.id DESC LIMIT ${limit} OFFSET ${offset}`,
    [viewerId],
  )
  return {
    users: rows.map((row) => ({ id: Number(row.id), username: row.username, avatar: row.avatar ?? null, blockedAt: row.created_at })),
    pagination: pageInfo(Number(count.total), page, limit),
  }
}

function activityText(row) {
  return row.activity_type === 'ACHIEVEMENT_UNLOCKED'
    ? `Unlocked the achievement ${row.achievement_name}`
    : `Set a personal best in ${row.game_name}`
}

export async function getActivityFeed(viewerId, query = {}) {
  const { page, limit, offset } = pagination(query)
  const where = `WHERE (a.actor_id = ? OR EXISTS (
    SELECT 1 FROM friendships f WHERE f.status = 'ACCEPTED'
      AND ((f.user_low_id = ? AND f.user_high_id = a.actor_id) OR (f.user_high_id = ? AND f.user_low_id = a.actor_id))
  ))`
  const blockFilter = ` AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ? AND b.blocked_id = a.actor_id) OR (b.blocker_id = a.actor_id AND b.blocked_id = ?))`
  const activeActor = ' AND EXISTS (SELECT 1 FROM users active_user WHERE active_user.id = a.actor_id AND active_user.is_active = 1)'
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM activities a ${where}${blockFilter}${activeActor}`, [viewerId, viewerId, viewerId, viewerId, viewerId])
  const [rows] = await pool.query(
    `SELECT a.id, a.actor_id, a.activity_type, a.created_at, u.username, u.avatar,
            g.name AS game_name, g.slug AS game_slug, s.score,
            ach.name AS achievement_name, ach.icon AS achievement_icon
     FROM activities a JOIN users u ON u.id = a.actor_id
     LEFT JOIN games g ON g.id = a.game_id
     LEFT JOIN scores s ON s.id = a.score_id
     LEFT JOIN achievements ach ON ach.id = a.achievement_id
     ${where}${blockFilter}${activeActor}
     ORDER BY a.created_at DESC, a.id DESC LIMIT ${limit} OFFSET ${offset}`,
    [viewerId, viewerId, viewerId, viewerId, viewerId],
  )
  return {
    activities: rows.map((row) => ({
      id: Number(row.id),
      actor: { id: Number(row.actor_id), username: row.username, avatar: row.avatar ?? null },
      type: row.activity_type,
      text: activityText(row),
      game: row.game_name ? { name: row.game_name, slug: row.game_slug } : null,
      score: row.score == null ? null : Number(row.score),
      achievement: row.achievement_name ? { name: row.achievement_name, icon: row.achievement_icon } : null,
      createdAt: row.created_at,
    })),
    pagination: pageInfo(Number(countRows[0].total), page, limit),
  }
}

export async function getFriendsLeaderboard(viewerId, query = {}) {
  const { page, limit, offset } = pagination(query)
  const condition = `u.id = ? OR EXISTS (SELECT 1 FROM friendships f
    WHERE f.status = 'ACCEPTED' AND ((f.user_low_id = ? AND f.user_high_id = u.id) OR (f.user_high_id = ? AND f.user_low_id = u.id)))`
  const blockFilter = `NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ? AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = ?))`
  const [[count]] = await pool.execute(`SELECT COUNT(*) AS total FROM users u WHERE u.is_active = 1 AND (${condition}) AND ${blockFilter}`, [viewerId, viewerId, viewerId, viewerId, viewerId])
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.avatar, u.total_score,
            (SELECT COUNT(*) + 1 FROM users other WHERE other.is_active = 1
              AND (other.total_score > u.total_score OR (other.total_score = u.total_score AND other.id < u.id))) AS global_rank
     FROM users u WHERE u.is_active = 1 AND (${condition}) AND ${blockFilter}
     ORDER BY u.total_score DESC, u.id ASC LIMIT ${limit} OFFSET ${offset}`,
    [viewerId, viewerId, viewerId, viewerId, viewerId],
  )
  return {
    entries: rows.map((row, index) => ({
      rank: offset + index + 1, globalRank: Number(row.global_rank), id: Number(row.id), username: row.username,
      avatar: row.avatar ?? null, totalScore: Number(row.total_score), isCurrentUser: String(row.id) === String(viewerId),
    })),
    metric: 'Existing cumulative total_score across all games',
    pagination: pageInfo(Number(count.total), page, limit),
  }
}

export async function getNotifications(viewerId, query = {}) {
  const { page, limit, offset } = pagination(query)
  const [[count]] = await pool.execute('SELECT COUNT(*) AS total, SUM(read_at IS NULL) AS unread FROM notifications WHERE recipient_id = ?', [viewerId])
  const [rows] = await pool.query(
    `SELECT n.id, n.notification_type, n.friendship_id, n.read_at, n.created_at,
            a.id AS actor_id, a.username AS actor_username, a.avatar AS actor_avatar,
            act.activity_type, g.name AS game_name, ach.name AS achievement_name
     FROM notifications n
     LEFT JOIN users a ON a.id = n.actor_id
     LEFT JOIN activities act ON act.id = n.activity_id
     LEFT JOIN games g ON g.id = act.game_id
     LEFT JOIN achievements ach ON ach.id = act.achievement_id
     WHERE n.recipient_id = ? ORDER BY n.created_at DESC, n.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    [viewerId],
  )
  return {
    notifications: rows.map((row) => ({
      id: Number(row.id), type: row.notification_type, friendshipId: row.friendship_id == null ? null : Number(row.friendship_id),
      actor: row.actor_id == null ? null : { id: Number(row.actor_id), username: row.actor_username, avatar: row.actor_avatar ?? null },
      activity: row.activity_type ? { type: row.activity_type, gameName: row.game_name, achievementName: row.achievement_name } : null,
      isRead: row.read_at != null, readAt: row.read_at, createdAt: row.created_at,
    })),
    unreadCount: Number(count.unread || 0),
    pagination: pageInfo(Number(count.total), page, limit),
  }
}

export async function markNotificationRead(viewerId, notificationId) {
  const [rows] = await pool.execute(
    'SELECT id FROM notifications WHERE id = ? AND recipient_id = ? LIMIT 1',
    [notificationId, viewerId],
  )
  if (!rows.length) throw httpError(404, 'Notification not found')
  await pool.execute(
    'UPDATE notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP(3)) WHERE id = ? AND recipient_id = ?',
    [notificationId, viewerId],
  )
  return { read: true }
}

export async function markAllNotificationsRead(viewerId) {
  const [result] = await pool.execute(
    'UPDATE notifications SET read_at = UTC_TIMESTAMP(3) WHERE recipient_id = ? AND read_at IS NULL',
    [viewerId],
  )
  return { markedRead: Number(result.affectedRows) }
}

/** Called only inside the score transaction; inserts one activity and fans out to current friends. */
export async function recordFriendActivity(connection, { actorId, activityType, gameId = null, achievementId = null, scoreId = null, sourceKey }) {
  const [activityResult] = await connection.execute(
    `INSERT IGNORE INTO activities (actor_id, activity_type, game_id, achievement_id, score_id, source_key)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [actorId, activityType, gameId, achievementId, scoreId, sourceKey],
  )
  if (!activityResult.affectedRows) return null
  const activityId = activityResult.insertId
  await connection.execute(
    `INSERT INTO notifications (recipient_id, actor_id, notification_type, activity_id)
     SELECT IF(f.user_low_id = ?, f.user_high_id, f.user_low_id), ?, 'FRIEND_ACTIVITY', ?
     FROM friendships f
     WHERE f.status = 'ACCEPTED' AND (f.user_low_id = ? OR f.user_high_id = ?)
       AND NOT EXISTS (
         SELECT 1 FROM user_blocks b
         WHERE (b.blocker_id = ? AND b.blocked_id = IF(f.user_low_id = ?, f.user_high_id, f.user_low_id))
            OR (b.blocker_id = IF(f.user_low_id = ?, f.user_high_id, f.user_low_id) AND b.blocked_id = ?)
       )`,
    [actorId, actorId, activityId, actorId, actorId, actorId, actorId, actorId, actorId, actorId],
  )
  return Number(activityId)
}
