import assert from 'node:assert/strict'
import test from 'node:test'
import {
  claimRewards,
  getRankedLeaderboard,
  getRankedProfile,
} from '../controllers/rankedController.js'

async function forwardedError(controller, request) {
  let forwarded
  await controller(request, { json() {} }, (error) => { forwarded = error })
  return forwarded
}

test('ranked profile rejects malformed season IDs before database access', async () => {
  for (const query of [{ seasonId: '2abc' }, { matchesPage: '0' }, { matchesLimit: '101' }]) {
    const error = await forwardedError(getRankedProfile, {
      query,
      user: { id: 1 },
    })
    assert.equal(error.statusCode, 400)
  }
})

test('ranked leaderboard validates season, page, and limit inputs', async () => {
  for (const query of [
    { seasonId: '1.5' },
    { page: '0' },
    { limit: '101' },
  ]) {
    const error = await forwardedError(getRankedLeaderboard, {
      query,
      user: { id: 1 },
    })
    assert.equal(error.statusCode, 400)
  }
})

test('ranked leaderboard rejects unsupported tiers and repeated tier parameters', async () => {
  for (const tier of ['MASTER', ['GOLD', 'DIAMOND']]) {
    const error = await forwardedError(getRankedLeaderboard, {
      query: { tier },
      user: { id: 1 },
    })
    assert.equal(error.statusCode, 400)
  }
})

test('season reward claims require a positive integer season ID', async () => {
  const error = await forwardedError(claimRewards, {
    params: { seasonId: '1e2' },
    user: { id: 1 },
  })

  assert.equal(error.statusCode, 400)
})
