import { randomBytes } from 'node:crypto'
import { Chess, DEFAULT_POSITION } from 'chess.js'
import pool from '../config/database.js'

const ROOM_CODE_PATTERN = /^[A-F0-9]{10}$/
const USER_ID_PATTERN = /^[1-9]\d*$/
const PROMOTIONS = new Set(['q', 'r', 'b', 'n'])
const INVITATION_MINUTES = 15
const ABANDONED_AFTER_MS = 24 * 60 * 60 * 1000

function httpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function positiveId(value, label = 'user id') {
  const id = String(value ?? '')
  if (!USER_ID_PATTERN.test(id)) throw httpError(400, `Invalid ${label}`)
  return id
}

function roomCode(value) {
  const code = String(value ?? '').trim().toUpperCase()
  if (!ROOM_CODE_PATTERN.test(code)) throw httpError(400, 'Room code must be 10 hexadecimal characters')
  return code
}

export function isChessRoomAbandonedByInactivity(room, now = Date.now()) {
  if (room?.status !== 'ACTIVE') return false
  const lastActivity = new Date(room.updated_at).getTime()
  return Number.isFinite(lastActivity) && now - lastActivity >= ABANDONED_AFTER_MS
}

async function expireInactiveRoom(connection, room) {
  const [result] = await connection.execute(
    `UPDATE chess_rooms
     SET status = 'ABANDONED', result = NULL, termination = 'ABANDONED',
         draw_offer_by = NULL, completed_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
     WHERE id = ? AND status = 'ACTIVE'
       AND updated_at <= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 24 HOUR)`,
    [room.id],
  )
  return result.affectedRows === 1
}

function abandonedState(room) {
  return { ...room, status: 'ABANDONED', result: null, termination: 'ABANDONED', draw_offer_by: null, completed_at: new Date() }
}

function chessFromRoom(room) {
  try {
    const chess = new Chess()
    if (room.pgn) chess.loadPgn(room.pgn)
    if (chess.fen() !== room.fen) throw new Error('Stored FEN does not match the PGN')
    chess.header('Event', `GameHub Chess ${room.room_code}`)
    chess.header('White', room.host_username)
    chess.header('Black', room.guest_username ?? 'Pending player')
    return chess
  } catch {
    throw httpError(500, 'Chess match state could not be loaded')
  }
}

function publicState(room, chess) {
  const moveHistory = chess.history({ verbose: true }).map((move, index) => ({
    ply: index + 1,
    color: move.color,
    from: move.from,
    to: move.to,
    san: move.san,
    promotion: move.promotion ?? null,
    captured: move.captured ?? null,
  }))

  return {
    roomCode: room.room_code,
    status: room.status,
    fen: room.fen,
    pgn: room.pgn,
    ply: Number(room.ply),
    turn: chess.turn(),
    inCheck: chess.isCheck(),
    board: chess.board().map((rank) => rank.map((piece) => piece ? ({ type: piece.type, color: piece.color }) : null)),
    legalMoves: room.status === 'ACTIVE'
      ? chess.moves({ verbose: true }).map((move) => ({ from: move.from, to: move.to, promotion: move.promotion ?? null }))
      : [],
    players: {
      white: { id: String(room.host_id), username: room.host_username },
      black: room.guest_id == null ? null : { id: String(room.guest_id), username: room.guest_username },
    },
    drawOfferBy: room.draw_offer_by == null ? null : String(room.draw_offer_by),
    result: room.result,
    termination: room.termination,
    moveHistory,
    createdAt: room.created_at,
    startedAt: room.started_at,
    completedAt: room.completed_at,
    expiresAt: room.expires_at,
  }
}

async function roomForUser(executor, userId, code, lock = false) {
  const lockingClause = lock ? ' FOR UPDATE' : ''
  const [rows] = await executor.execute(
    `SELECT r.*, host.username AS host_username, guest.username AS guest_username
     FROM chess_rooms r
     JOIN users host ON host.id = r.host_id
     LEFT JOIN users guest ON guest.id = r.guest_id
     WHERE r.room_code = ? AND (r.host_id = ? OR r.guest_id = ?)
     LIMIT 1${lockingClause}`,
    [code, userId, userId],
  )
  if (!rows.length) throw httpError(404, 'Chess room not found')
  return rows[0]
}

async function hasOpenRoom(executor, userId, exceptRoomId = null) {
  const [rows] = await executor.execute(
    `SELECT id FROM chess_rooms
     WHERE (host_id = ? OR guest_id = ?)
       AND status IN ('WAITING', 'ACTIVE')
       AND (status = 'ACTIVE' OR expires_at > UTC_TIMESTAMP(3))
       AND (? IS NULL OR id <> ?)
     LIMIT 1 FOR UPDATE`,
    [userId, userId, exceptRoomId, exceptRoomId],
  )
  return rows.length > 0
}

async function assertFriends(connection, firstId, secondId) {
  const [friendRows] = await connection.execute(
    `SELECT id FROM friendships
     WHERE user_low_id = LEAST(?, ?) AND user_high_id = GREATEST(?, ?)
       AND status = 'ACCEPTED'
     LIMIT 1 FOR UPDATE`,
    [firstId, secondId, firstId, secondId],
  )
  if (!friendRows.length) throw httpError(403, 'Chess invitations are available to friends only')

  const [blockedRows] = await connection.execute(
    `SELECT 1 FROM user_blocks
     WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
     LIMIT 1`,
    [firstId, secondId, secondId, firstId],
  )
  if (blockedRows.length) throw httpError(403, 'This player is unavailable')
}

export function applyLegalChessMove(chess, input) {
  const from = String(input?.from ?? '').toLowerCase()
  const to = String(input?.to ?? '').toLowerCase()
  const promotion = input?.promotion == null ? undefined : String(input.promotion).toLowerCase()

  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)
    || (promotion !== undefined && !PROMOTIONS.has(promotion))) {
    throw httpError(400, 'Invalid chess move')
  }

  try {
    return chess.move({ from, to, ...(promotion ? { promotion } : {}) })
  } catch {
    throw httpError(400, 'Illegal chess move')
  }
}

export function classifyChessPosition(chess) {
  if (chess.isCheckmate()) return { result: chess.turn() === 'w' ? 'BLACK_WIN' : 'WHITE_WIN', termination: 'CHECKMATE' }
  if (chess.isStalemate()) return { result: 'DRAW', termination: 'STALEMATE' }
  if (chess.isDraw()) return { result: 'DRAW', termination: 'DRAW_RULE' }
  return { result: null, termination: null }
}

export async function createChessRoom(userValue, friendValue) {
  const userId = positiveId(userValue)
  const friendId = positiveId(friendValue, 'friend id')
  if (userId === friendId) throw httpError(400, 'You cannot invite yourself to chess')

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [users] = await connection.execute(
      'SELECT id, username, is_active FROM users WHERE id IN (?, ?) ORDER BY id FOR UPDATE',
      [userId, friendId],
    )
    if (users.length !== 2 || users.some((user) => !user.is_active)) throw httpError(404, 'Player not found')
    const friend = users.find((user) => String(user.id) === friendId)
    await assertFriends(connection, userId, friendId)

    if (await hasOpenRoom(connection, userId) || await hasOpenRoom(connection, friendId)) {
      throw httpError(409, 'One of the players already has a chess match in progress')
    }

    const code = randomBytes(5).toString('hex').toUpperCase()
    const [roomResult] = await connection.execute(
      `INSERT INTO chess_rooms (room_code, host_id, status, fen, pgn, expires_at)
       VALUES (?, ?, 'WAITING', ?, '', DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ${INVITATION_MINUTES} MINUTE))`,
      [code, userId, DEFAULT_POSITION],
    )
    const [inviteResult] = await connection.execute(
      `INSERT INTO chess_invitations (room_id, inviter_id, invitee_id, expires_at)
       VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ${INVITATION_MINUTES} MINUTE))`,
      [roomResult.insertId, userId, friendId],
    )
    await connection.commit()
    return { roomCode: code, invitationId: String(inviteResult.insertId), invitee: friend.username, expiresInMinutes: INVITATION_MINUTES }
  } catch (error) {
    await connection.rollback()
    if (error.code === 'ER_DUP_ENTRY') throw httpError(409, 'Could not create this chess invitation; try again')
    throw error
  } finally {
    connection.release()
  }
}

export async function listChessInvitations(userValue) {
  const userId = positiveId(userValue)
  const [rows] = await pool.execute(
    `SELECT i.id, i.room_id, i.inviter_id, i.invitee_id, i.created_at, i.expires_at,
            r.room_code, inviter.username AS inviter_username, invitee.username AS invitee_username
     FROM chess_invitations i
     JOIN chess_rooms r ON r.id = i.room_id
     JOIN users inviter ON inviter.id = i.inviter_id
     JOIN users invitee ON invitee.id = i.invitee_id
     WHERE (i.invitee_id = ? OR i.inviter_id = ?)
       AND i.status = 'PENDING' AND i.expires_at > UTC_TIMESTAMP(3)
       AND r.status = 'WAITING'
     ORDER BY i.created_at DESC, i.id DESC LIMIT 40`,
    [userId, userId],
  )
  const incoming = []
  const outgoing = []
  for (const row of rows) {
    const invitation = {
      id: String(row.id),
      roomCode: row.room_code,
      user: String(row.invitee_id) === userId
        ? { id: String(row.inviter_id), username: row.inviter_username }
        : { id: String(row.invitee_id), username: row.invitee_username },
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }
    if (String(row.invitee_id) === userId) incoming.push(invitation)
    else outgoing.push(invitation)
  }
  return { incoming, outgoing }
}

export async function respondChessInvitation(userValue, invitationValue, accept) {
  const userId = positiveId(userValue)
  const invitationId = positiveId(invitationValue, 'invitation id')
  if (typeof accept !== 'boolean') throw httpError(400, 'accept must be true or false')

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    // Lock players before the invitation/room rows, matching room creation's lock order.
    const [previewRows] = await connection.execute(
      `SELECT i.inviter_id, i.invitee_id FROM chess_invitations i WHERE i.id = ? LIMIT 1`,
      [invitationId],
    )
    const preview = previewRows[0]
    if (!preview) throw httpError(404, 'Chess invitation not found')
    if (String(preview.invitee_id) !== userId) throw httpError(403, 'Only the invited player can respond')

    const [users] = await connection.execute(
      'SELECT id, is_active FROM users WHERE id IN (?, ?) ORDER BY id FOR UPDATE',
      [preview.inviter_id, userId],
    )

    const [inviteRows] = await connection.execute(
      `SELECT i.*, r.host_id, r.status AS room_status, r.room_code,
              (i.expires_at <= UTC_TIMESTAMP(3)) AS is_expired
       FROM chess_invitations i JOIN chess_rooms r ON r.id = i.room_id
       WHERE i.id = ? LIMIT 1 FOR UPDATE`,
      [invitationId],
    )
    const invitation = inviteRows[0]
    if (!invitation) throw httpError(404, 'Chess invitation not found')
    if (String(invitation.invitee_id) !== userId) throw httpError(403, 'Only the invited player can respond')
    if (invitation.status !== 'PENDING') throw httpError(409, 'Chess invitation is no longer pending')

    if (Number(invitation.is_expired) || invitation.room_status !== 'WAITING') {
      await connection.execute("UPDATE chess_invitations SET status = 'EXPIRED', responded_at = UTC_TIMESTAMP(3) WHERE id = ?", [invitationId])
      if (invitation.room_status === 'WAITING') {
        await connection.execute("UPDATE chess_rooms SET status = 'EXPIRED', completed_at = UTC_TIMESTAMP(3) WHERE id = ?", [invitation.room_id])
      }
      await connection.commit()
      return { status: 'EXPIRED' }
    }

    if (!accept) {
      await connection.execute("UPDATE chess_invitations SET status = 'DECLINED', responded_at = UTC_TIMESTAMP(3) WHERE id = ?", [invitationId])
      await connection.execute("UPDATE chess_rooms SET status = 'DECLINED', completed_at = UTC_TIMESTAMP(3) WHERE id = ? AND status = 'WAITING'", [invitation.room_id])
      await connection.commit()
      return { status: 'DECLINED' }
    }

    if (users.length !== 2 || users.some((user) => !user.is_active)) throw httpError(404, 'Player not found')
    await assertFriends(connection, invitation.host_id, userId)
    if (await hasOpenRoom(connection, invitation.host_id, invitation.room_id)
      || await hasOpenRoom(connection, userId, invitation.room_id)) {
      throw httpError(409, 'One of the players already has a chess match in progress')
    }

    await connection.execute(
      `UPDATE chess_rooms SET guest_id = ?, status = 'ACTIVE', expires_at = NULL,
              started_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND status = 'WAITING'`,
      [userId, invitation.room_id],
    )
    await connection.execute(
      "UPDATE chess_invitations SET status = 'ACCEPTED', responded_at = UTC_TIMESTAMP(3) WHERE id = ?",
      [invitationId],
    )
    await connection.commit()
    return { status: 'ACCEPTED', roomCode: invitation.room_code }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function joinChessRoomByCode(userValue, codeValue) {
  const userId = positiveId(userValue)
  const code = roomCode(codeValue)
  const [rows] = await pool.execute(
    `SELECT i.id FROM chess_invitations i
     JOIN chess_rooms r ON r.id = i.room_id
     WHERE i.invitee_id = ? AND r.room_code = ?
       AND i.status = 'PENDING' AND i.expires_at > UTC_TIMESTAMP(3)
       AND r.status = 'WAITING'
     LIMIT 1`,
    [userId, code],
  )
  if (!rows.length) throw httpError(404, 'No valid invitation was found for this room code')
  return respondChessInvitation(userId, rows[0].id, true)
}

export async function getChessRoom(userValue, codeValue) {
  const userId = positiveId(userValue)
  const code = roomCode(codeValue)
  let room = await roomForUser(pool, userId, code)
  if (isChessRoomAbandonedByInactivity(room)) {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const lockedRoom = await roomForUser(connection, userId, code, true)
      const abandoned = isChessRoomAbandonedByInactivity(lockedRoom)
      const markedAbandoned = abandoned ? await expireInactiveRoom(connection, lockedRoom) : false
      await connection.commit()
      room = markedAbandoned ? abandonedState(lockedRoom) : lockedRoom
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
  if (room.status === 'WAITING' && (String(room.host_id) !== userId || new Date(room.expires_at).getTime() <= Date.now())) {
    throw httpError(410, 'Chess invitation has expired')
  }
  return publicState(room, chessFromRoom(room))
}

export async function getActiveChessRoom(userValue) {
  const userId = positiveId(userValue)
  const [rows] = await pool.execute(
    `SELECT r.room_code FROM chess_rooms r
     WHERE (r.host_id = ? OR r.guest_id = ?)
       AND (r.status = 'ACTIVE' OR (r.status = 'WAITING' AND r.host_id = ? AND r.expires_at > UTC_TIMESTAMP(3)))
     ORDER BY r.updated_at DESC, r.id DESC LIMIT 1`,
    [userId, userId, userId],
  )
  return rows.length ? getChessRoom(userId, rows[0].room_code) : null
}

export async function submitChessMove({ userValue, codeValue, from, to, promotion, expectedPly }) {
  const userId = positiveId(userValue)
  const code = roomCode(codeValue)
  if (!Number.isSafeInteger(expectedPly) || expectedPly < 0) throw httpError(400, 'A valid move number is required')

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const room = await roomForUser(connection, userId, code, true)
    if (room.status !== 'ACTIVE') throw httpError(409, 'This chess match is not active')
    if (isChessRoomAbandonedByInactivity(room)) {
      const markedAbandoned = await expireInactiveRoom(connection, room)
      await connection.commit()
      return publicState(markedAbandoned ? abandonedState(room) : room, chessFromRoom(room))
    }
    if (expectedPly !== Number(room.ply)) throw httpError(409, 'Chess position is out of date; sync the latest board')

    const chess = chessFromRoom(room)
    const playerColor = String(room.host_id) === userId ? 'w' : 'b'
    if (chess.turn() !== playerColor) throw httpError(409, 'It is not your turn')
    const move = applyLegalChessMove(chess, { from, to, promotion })

    const { result, termination } = classifyChessPosition(chess)

    const nextPly = Number(room.ply) + 1
    const nextStatus = result ? 'COMPLETED' : 'ACTIVE'
    const pgn = chess.pgn()
    const fen = chess.fen()
    await connection.execute(
      `INSERT INTO chess_moves
         (room_id, ply, user_id, from_square, to_square, promotion, san, fen_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [room.id, nextPly, userId, move.from, move.to, move.promotion ?? null, move.san, fen],
    )
    await connection.execute(
      `UPDATE chess_rooms
       SET fen = ?, pgn = ?, ply = ?, status = ?, result = ?, termination = ?,
           completed_at = IF(? = 'COMPLETED', UTC_TIMESTAMP(3), completed_at),
           draw_offer_by = NULL, updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [fen, pgn, nextPly, nextStatus, result, termination, nextStatus, room.id],
    )
    await connection.commit()

    const nextRoom = {
      ...room, fen, pgn, ply: nextPly, status: nextStatus,
      result, termination, draw_offer_by: null,
      completed_at: result ? new Date() : room.completed_at,
    }
    return publicState(nextRoom, chess)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function actOnChessRoom({ userValue, codeValue, action }) {
  const userId = positiveId(userValue)
  const code = roomCode(codeValue)
  const normalizedAction = String(action ?? '').toLowerCase()
  if (!['resign', 'offer_draw', 'accept_draw', 'decline_draw'].includes(normalizedAction)) {
    throw httpError(400, 'Unsupported chess action')
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const room = await roomForUser(connection, userId, code, true)
    if (room.status !== 'ACTIVE') throw httpError(409, 'This chess match is not active')
    if (isChessRoomAbandonedByInactivity(room)) {
      const markedAbandoned = await expireInactiveRoom(connection, room)
      await connection.commit()
      return publicState(markedAbandoned ? abandonedState(room) : room, chessFromRoom(room))
    }
    const isHost = String(room.host_id) === userId
    const opponentId = isHost ? String(room.guest_id) : String(room.host_id)
    let status = room.status
    let result = room.result
    let termination = room.termination
    let drawOfferBy = room.draw_offer_by == null ? null : String(room.draw_offer_by)

    if (normalizedAction === 'resign') {
      status = 'COMPLETED'
      result = isHost ? 'BLACK_WIN' : 'WHITE_WIN'
      termination = 'RESIGNATION'
      drawOfferBy = null
    } else if (normalizedAction === 'offer_draw') {
      if (drawOfferBy != null) throw httpError(409, 'A draw offer is already pending')
      drawOfferBy = userId
    } else if (normalizedAction === 'accept_draw') {
      if (drawOfferBy !== opponentId) throw httpError(409, 'There is no draw offer from your opponent')
      status = 'COMPLETED'
      result = 'DRAW'
      termination = 'AGREED_DRAW'
      drawOfferBy = null
    } else {
      if (drawOfferBy !== opponentId) throw httpError(409, 'There is no draw offer from your opponent')
      drawOfferBy = null
    }

    await connection.execute(
      `UPDATE chess_rooms SET status = ?, result = ?, termination = ?, draw_offer_by = ?,
              completed_at = IF(? = 'COMPLETED', UTC_TIMESTAMP(3), completed_at),
              updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [status, result, termination, drawOfferBy, status, room.id],
    )
    await connection.commit()

    const nextRoom = { ...room, status, result, termination, draw_offer_by: drawOfferBy, completed_at: status === 'COMPLETED' ? new Date() : room.completed_at }
    return publicState(nextRoom, chessFromRoom(room))
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function createChessRematch(userValue, codeValue) {
  const userId = positiveId(userValue)
  const code = roomCode(codeValue)
  const room = await roomForUser(pool, userId, code)
  if (room.status !== 'COMPLETED' && room.status !== 'ABANDONED') throw httpError(409, 'A rematch is available after the current match ends')
  const opponentId = String(room.host_id) === userId ? room.guest_id : room.host_id
  if (!opponentId) throw httpError(400, 'The opponent could not be found')
  return createChessRoom(userId, opponentId)
}
