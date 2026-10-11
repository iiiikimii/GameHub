import assert from 'node:assert/strict'
import test from 'node:test'
import {
  friendRequests,
  notifications,
  requestFriendship,
  respondFriendship,
  search,
} from '../controllers/socialController.js'

async function forwardedError(controller, request) {
  let forwarded
  await controller(request, { status() { return this }, json() {} }, (error) => { forwarded = error })
  return forwarded
}

test('social user search validates query before reading the database', async () => {
  for (const query of [{ search: 'x' }, { search: ['player', 'other'] }, { search: 'valid', page: '1.5' }, { search: 'valid', limit: '51' }]) {
    const error = await forwardedError(search, { query, user: { id: 1 } })
    assert.equal(error.statusCode, 400)
  }
})

test('friend request mutations reject malformed IDs and invalid actions before database access', async () => {
  const malformedId = await forwardedError(respondFriendship, {
    params: { id: '1e2' }, body: { action: 'ACCEPT' }, user: { id: 1 },
  })
  assert.equal(malformedId.statusCode, 400)

  const invalidAction = await forwardedError(respondFriendship, {
    params: { id: '12' }, body: { action: 'APPROVE' }, user: { id: 1 },
  })
  assert.equal(invalidAction.statusCode, 400)
})

test('friend request creation requires a target username', async () => {
  const error = await forwardedError(requestFriendship, { body: { userId: 99 }, user: { id: 1 } })
  assert.equal(error.statusCode, 400)
})

test('friend request and notification endpoints validate pagination before database access', async () => {
  const requestError = await forwardedError(friendRequests, {
    query: { box: 'incoming', page: '0' }, user: { id: 1 },
  })
  assert.equal(requestError.statusCode, 400)

  const notificationError = await forwardedError(notifications, {
    query: { page: '-1' }, user: { id: 1 },
  })
  assert.equal(notificationError.statusCode, 400)
})
