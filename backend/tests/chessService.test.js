import assert from 'node:assert/strict'
import test from 'node:test'
import { Chess } from 'chess.js'
import {
  applyLegalChessMove,
  classifyChessPosition,
  isChessRoomAbandonedByInactivity,
} from '../services/chessService.js'

test('chess matches are retained on reconnect and become abandoned after 24 hours without moves', () => {
  const room = { status: 'ACTIVE', updated_at: new Date(0) }
  assert.equal(isChessRoomAbandonedByInactivity(room, 86_399_999), false)
  assert.equal(isChessRoomAbandonedByInactivity(room, 86_400_000), true)
  assert.equal(isChessRoomAbandonedByInactivity({ ...room, status: 'COMPLETED' }, 90_000_000), false)
})

test('chess service accepts legal moves and rejects malformed or illegal moves', () => {
  const chess = new Chess()
  assert.equal(applyLegalChessMove(chess, { from: 'e2', to: 'e4' }).san, 'e4')
  assert.throws(() => applyLegalChessMove(chess, { from: 'e4', to: 'e5' }), { statusCode: 400 })
  assert.throws(() => applyLegalChessMove(chess, { from: 'z9', to: 'e5' }), { statusCode: 400 })
})

test('chess.js rules cover castling, en passant, promotion, and checkmate', () => {
  const castle = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
  assert.equal(applyLegalChessMove(castle, { from: 'e1', to: 'g1' }).san, 'O-O')

  const enPassant = new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2')
  assert.equal(applyLegalChessMove(enPassant, { from: 'e5', to: 'd6' }).captured, 'p')

  const promotion = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1')
  assert.equal(applyLegalChessMove(promotion, { from: 'a7', to: 'a8', promotion: 'q' }).promotion, 'q')

  const mate = new Chess()
  applyLegalChessMove(mate, { from: 'f2', to: 'f3' })
  applyLegalChessMove(mate, { from: 'e7', to: 'e5' })
  applyLegalChessMove(mate, { from: 'g2', to: 'g4' })
  applyLegalChessMove(mate, { from: 'd8', to: 'h4' })
  assert.equal(mate.isCheckmate(), true)
  assert.deepEqual(classifyChessPosition(mate), { result: 'BLACK_WIN', termination: 'CHECKMATE' })

  const stalemate = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')
  assert.deepEqual(classifyChessPosition(stalemate), { result: 'DRAW', termination: 'STALEMATE' })

  const insufficientMaterial = new Chess('7k/8/6K1/8/8/8/8/8 w - - 0 1')
  assert.deepEqual(classifyChessPosition(insufficientMaterial), { result: 'DRAW', termination: 'DRAW_RULE' })
})
