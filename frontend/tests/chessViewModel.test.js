import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeChessFriends } from '../src/services/chessViewModel.js'

test('normalizes the flat friend records returned by the social API', () => {
  assert.deepEqual(normalizeChessFriends({ friends: [
    { friendshipId: 12, id: 34, username: 'player_one', avatar: null },
  ] }), [
    { friendshipId: 12, user: { id: 34, username: 'player_one' } },
  ])
})

test('keeps compatibility with nested friend records', () => {
  assert.deepEqual(normalizeChessFriends([{ friendshipId: 8, user: { id: 21, username: 'player_two' } }]), [
    { friendshipId: 8, user: { id: 21, username: 'player_two' } },
  ])
})

test('ignores missing or malformed friend records instead of crashing the chess page', () => {
  assert.deepEqual(normalizeChessFriends({ friends: [undefined, null, {}, { id: 4 }, 'invalid'] }), [])
  assert.deepEqual(normalizeChessFriends(null), [])
})
