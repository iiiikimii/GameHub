import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { Chess } from 'chess.js'
import { io as createClient } from 'socket.io-client'
import { Server } from 'socket.io'
import { attachChessSocket, createChessEventLimiter } from '../realtime/chessSocket.js'
import { applyLegalChessMove } from '../services/chessService.js'

const ROOM_CODE = 'ABCDEF1234'

test('chess socket event limits are scoped by user and reset after their window', () => {
  let currentTime = 1_000
  const allow = createChessEventLimiter(() => currentTime)

  for (let attempt = 0; attempt < 20; attempt += 1) assert.equal(allow('7', 'move'), true)
  assert.equal(allow('7', 'move'), false)
  assert.equal(allow('8', 'move'), true)
  assert.equal(allow('7', 'action'), true)

  currentTime += 10_000
  assert.equal(allow('7', 'move'), true)
})

function emitWithAck(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve))
}

function connect(socket) {
  return new Promise((resolve, reject) => {
    socket.once('connect', resolve)
    socket.once('connect_error', reject)
  })
}

test('two authenticated chess clients synchronize moves; intruders and stale moves are rejected', async (t) => {
  const httpServer = createServer()
  const io = new Server(httpServer, { cors: { origin: '*' } })
  const chess = new Chess()
  let ply = 0
  const identities = new Map([['host-token', '1'], ['guest-token', '2'], ['intruder-token', '3']])

  attachChessSocket(io, {
    async authenticate(token) {
      const id = identities.get(token)
      if (!id) throw new Error('unauthenticated')
      return { id }
    },
    async getRoomState(userId, code) {
      if (code !== ROOM_CODE || !['1', '2'].includes(userId)) {
        throw Object.assign(new Error('Chess room not found'), { statusCode: 404 })
      }
      return { roomCode: code, status: 'ACTIVE', fen: chess.fen(), ply, turn: chess.turn() }
    },
    async submitMove({ userValue, codeValue, from, to, expectedPly }) {
      if (codeValue !== ROOM_CODE || !['1', '2'].includes(userValue)) {
        throw Object.assign(new Error('Chess room not found'), { statusCode: 404 })
      }
      if (expectedPly !== ply) throw Object.assign(new Error('Chess position is out of date'), { statusCode: 409 })
      const expectedColor = userValue === '1' ? 'w' : 'b'
      if (chess.turn() !== expectedColor) throw Object.assign(new Error('It is not your turn'), { statusCode: 409 })
      applyLegalChessMove(chess, { from, to })
      ply += 1
      return { roomCode: codeValue, status: 'ACTIVE', fen: chess.fen(), ply, turn: chess.turn() }
    },
    async actOnRoom() { throw Object.assign(new Error('Not supported in this test'), { statusCode: 400 }) },
  })

  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
  const address = httpServer.address()
  const url = `http://127.0.0.1:${address.port}`
  const options = { transports: ['websocket'], autoConnect: false }
  const host = createClient(url, { ...options, auth: { token: 'host-token' } })
  const guest = createClient(url, { ...options, auth: { token: 'guest-token' } })
  const intruder = createClient(url, { ...options, auth: { token: 'intruder-token' } })
  const unauthenticated = createClient(url, { ...options, auth: {}, reconnection: false })
  t.after(async () => {
    host.close()
    guest.close()
    intruder.close()
    unauthenticated.close()
    await new Promise((resolve) => io.close(resolve))
  })

  const authFailure = new Promise((resolve) => unauthenticated.once('connect_error', resolve))
  const authenticatedConnections = Promise.all([connect(host), connect(guest), connect(intruder)])
  unauthenticated.connect()
  host.connect()
  guest.connect()
  intruder.connect()
  await authenticatedConnections
  assert.match((await authFailure).message, /authentication failed/i)

  assert.equal((await emitWithAck(host, 'chess:join', { roomCode: ROOM_CODE })).ok, true)
  assert.equal((await emitWithAck(guest, 'chess:join', { roomCode: ROOM_CODE })).ok, true)
  assert.equal((await emitWithAck(intruder, 'chess:join', { roomCode: ROOM_CODE })).ok, false)

  const wrongTurn = await emitWithAck(guest, 'chess:move', {
    roomCode: ROOM_CODE, from: 'e7', to: 'e5', expectedPly: 0,
  })
  assert.equal(wrongTurn.ok, false)

  const guestUpdate = new Promise((resolve) => guest.once('chess:state', resolve))
  const move = await emitWithAck(host, 'chess:move', {
    roomCode: ROOM_CODE, from: 'e2', to: 'e4', expectedPly: 0,
  })
  assert.equal(move.ok, true)
  assert.equal(move.state.ply, 1)
  assert.equal((await guestUpdate).fen, move.state.fen)

  const staleMove = await emitWithAck(host, 'chess:move', {
    roomCode: ROOM_CODE, from: 'e7', to: 'e5', expectedPly: 0,
  })
  assert.equal(staleMove.ok, false)
  assert.match(staleMove.error, /out of date/i)

  for (let attempt = 1; attempt < 20; attempt += 1) {
    assert.equal((await emitWithAck(host, 'chess:join', { roomCode: ROOM_CODE })).ok, true)
  }
  const rateLimitedJoin = await emitWithAck(host, 'chess:join', { roomCode: ROOM_CODE })
  assert.equal(rateLimitedJoin.ok, false)
  assert.match(rateLimitedJoin.error, /too many chess requests/i)
})
