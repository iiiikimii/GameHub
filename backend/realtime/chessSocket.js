function safeError(error) {
  const status = Number(error?.statusCode)
  if (status >= 400 && status < 500) return error.message
  return 'Unable to update the chess match. Please try again.'
}

function acknowledge(callback, payload) {
  if (typeof callback === 'function') callback(payload)
}

function roomCode(value) {
  const code = String(value ?? '').trim().toUpperCase()
  if (!/^[A-F0-9]{10}$/.test(code)) {
    const error = new Error('Invalid chess room code')
    error.statusCode = 400
    throw error
  }
  return code
}

const EVENT_LIMITS = {
  join: { count: 20, windowMs: 60_000 },
  move: { count: 20, windowMs: 10_000 },
  action: { count: 10, windowMs: 10_000 },
}

export function createChessEventLimiter(now = Date.now) {
  const buckets = new Map()
  let checks = 0

  return (userId, event) => {
    const config = EVENT_LIMITS[event]
    if (!config) return false

    const currentTime = now()
    const key = `${userId}:${event}`
    let bucket = buckets.get(key)
    if (!bucket || currentTime >= bucket.resetAt) {
      bucket = { count: 0, resetAt: currentTime + config.windowMs, lastSeen: currentTime }
      buckets.set(key, bucket)
    }
    bucket.lastSeen = currentTime
    bucket.count += 1

    checks += 1
    if (checks % 256 === 0) {
      for (const [bucketKey, value] of buckets) {
        if (currentTime >= value.resetAt + 60_000) buckets.delete(bucketKey)
      }
    }

    return bucket.count <= config.count
  }
}

/** Register authenticated Socket.IO handlers; persistence and membership checks stay in chessService. */
export function attachChessSocket(io, { authenticate, getRoomState, submitMove, actOnRoom }) {
  const allowEvent = createChessEventLimiter()

  io.use(async (socket, next) => {
    try {
      const identity = await authenticate(socket.handshake.auth?.token)
      if (!identity?.id) throw new Error('Authentication failed')
      socket.data.userId = String(identity.id)
      next()
    } catch {
      next(new Error('Chess authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    socket.on('chess:join', async (payload, callback) => {
      try {
        if (!allowEvent(socket.data.userId, 'join')) {
          acknowledge(callback, { ok: false, error: 'Too many chess requests; wait a moment and try again.' })
          return
        }
        const code = roomCode(payload?.roomCode)
        const state = await getRoomState(socket.data.userId, code)
        await socket.join(code)
        socket.to(code).emit('chess:state', state)
        acknowledge(callback, { ok: true, state })
      } catch (error) {
        acknowledge(callback, { ok: false, error: safeError(error) })
      }
    })

    socket.on('chess:move', async (payload, callback) => {
      try {
        if (!allowEvent(socket.data.userId, 'move')) {
          acknowledge(callback, { ok: false, error: 'Too many chess requests; wait a moment and try again.' })
          return
        }
        const code = roomCode(payload?.roomCode)
        const state = await submitMove({
          userValue: socket.data.userId,
          codeValue: code,
          from: payload?.from,
          to: payload?.to,
          promotion: payload?.promotion,
          expectedPly: payload?.expectedPly,
        })
        socket.to(code).emit('chess:state', state)
        acknowledge(callback, { ok: true, state })
      } catch (error) {
        acknowledge(callback, { ok: false, error: safeError(error) })
      }
    })

    socket.on('chess:action', async (payload, callback) => {
      try {
        if (!allowEvent(socket.data.userId, 'action')) {
          acknowledge(callback, { ok: false, error: 'Too many chess requests; wait a moment and try again.' })
          return
        }
        const code = roomCode(payload?.roomCode)
        const state = await actOnRoom({ userValue: socket.data.userId, codeValue: code, action: payload?.action })
        socket.to(code).emit('chess:state', state)
        acknowledge(callback, { ok: true, state })
      } catch (error) {
        acknowledge(callback, { ok: false, error: safeError(error) })
      }
    })
  })

  return io
}
