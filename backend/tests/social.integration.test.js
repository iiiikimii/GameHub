import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import test from 'node:test'
import app from '../app.js'
import pool from '../config/database.js'

test('Social API enforces ownership, friendship state, blocking, pagination, and private-profile boundaries', {
  skip: process.env.GAMEHUB_SOCIAL_INTEGRATION !== '1',
}, async () => {
  const prefix = `s5${randomUUID().replaceAll('-', '').slice(0, 10)}`
  const fixtureIds = []
  let server

  async function createUser(suffix) {
    const [result] = await pool.execute(
      `INSERT INTO users (username, email, role, is_active, total_score)
       VALUES (?, ?, 'USER', 1, ?)`,
      [`${prefix}_${suffix}`, `${prefix}_${suffix}@example.test`, suffix === 'a' ? 25 : 10],
    )
    fixtureIds.push(result.insertId)
    return { id: String(result.insertId), username: `${prefix}_${suffix}` }
  }

  async function call(baseUrl, user, path, method = 'GET', body) {
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '5m' })
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    return { status: response.status, body: await response.json() }
  }

  try {
    const [a, b, c] = await Promise.all([createUser('a'), createUser('b'), createUser('c')])
    server = app.listen(0, '127.0.0.1')
    await new Promise((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
    const baseUrl = `http://127.0.0.1:${server.address().port}/api`

    const missingAuth = await fetch(`${baseUrl}/social/friends`)
    assert.equal(missingAuth.status, 401)

    const search = await call(baseUrl, a, `/social/users?search=${prefix}&limit=1`)
    assert.equal(search.status, 200)
    assert.equal(search.body.data.pagination.total, 2)
    assert.equal(search.body.data.pagination.hasNext, true)

    const profile = await call(baseUrl, b, `/social/users/${a.username}`)
    assert.equal(profile.status, 200)
    assert.equal(profile.body.data.username, a.username)
    for (const privateField of ['email', 'role', 'is_active', 'recentScores', 'password_hash']) {
      assert.equal(Object.hasOwn(profile.body.data, privateField), false, `public profile excludes ${privateField}`)
    }

    const selfRequest = await call(baseUrl, a, '/social/friends/requests', 'POST', { username: a.username })
    assert.equal(selfRequest.status, 400)

    const pending = await call(baseUrl, a, '/social/friends/requests', 'POST', { username: b.username, userId: c.id, status: 'ACCEPTED' })
    assert.equal(pending.status, 201)
    assert.equal(pending.body.data.status, 'PENDING')
    const duplicate = await call(baseUrl, a, '/social/friends/requests', 'POST', { username: b.username })
    assert.equal(duplicate.status, 409)
    const pendingRow = await pool.execute('SELECT requester_id, recipient_id, status FROM friendships WHERE id = ?', [pending.body.data.friendshipId])
    assert.equal(String(pendingRow[0][0].requester_id), a.id, 'requester identity comes from the verified token')

    const incoming = await call(baseUrl, b, '/social/friends/requests?box=incoming&page=1&limit=1')
    assert.equal(incoming.status, 200)
    assert.equal(incoming.body.data.requests.length, 1)
    assert.equal(incoming.body.data.pagination.total, 1)

    const forbiddenRespond = await call(baseUrl, a, `/social/friends/requests/${pending.body.data.friendshipId}`, 'PATCH', { action: 'ACCEPT' })
    assert.equal(forbiddenRespond.status, 403)
    const forbiddenCancel = await call(baseUrl, b, `/social/friends/requests/${pending.body.data.friendshipId}`, 'PATCH', { action: 'CANCEL' })
    assert.equal(forbiddenCancel.status, 403)
    const cancelled = await call(baseUrl, a, `/social/friends/requests/${pending.body.data.friendshipId}`, 'PATCH', { action: 'CANCEL' })
    assert.equal(cancelled.status, 200)
    assert.equal(cancelled.body.data.status, 'CANCELLED')

    const reversePending = await call(baseUrl, b, '/social/friends/requests', 'POST', { username: a.username })
    assert.equal(reversePending.status, 201)
    const opposing = await call(baseUrl, a, '/social/friends/requests', 'POST', { username: b.username })
    assert.equal(opposing.status, 200)
    assert.equal(opposing.body.data.autoAccepted, true)
    assert.equal(opposing.body.data.friendshipId, reversePending.body.data.friendshipId)

    const outsiderRemove = await call(baseUrl, c, `/social/friends/${reversePending.body.data.friendshipId}`, 'DELETE')
    assert.equal(outsiderRemove.status, 404)

    const friendList = await call(baseUrl, a, '/social/friends?page=1&limit=1')
    assert.equal(friendList.status, 200)
    assert.equal(friendList.body.data.friends.length, 1)
    assert.equal(friendList.body.data.pagination.total, 1)

    const cRequest = await call(baseUrl, c, '/social/friends/requests', 'POST', { username: a.username })
    assert.equal(cRequest.status, 201)
    const ownAccept = await call(baseUrl, c, `/social/friends/requests/${cRequest.body.data.friendshipId}`, 'PATCH', { action: 'ACCEPT' })
    assert.equal(ownAccept.status, 403)
    const recipientAccept = await call(baseUrl, a, `/social/friends/requests/${cRequest.body.data.friendshipId}`, 'PATCH', { action: 'ACCEPT' })
    assert.equal(recipientAccept.status, 200)
    assert.equal(recipientAccept.body.data.status, 'ACCEPTED')
    const updatedFriendList = await call(baseUrl, a, '/social/friends?page=1&limit=10')
    assert.equal(updatedFriendList.body.data.pagination.total, 2)

    const submissionKey = randomUUID()
    const scorePayload = { gameSlug: 'reaction-test', score: 1000, duration: 1, submissionKey }
    const score = await call(baseUrl, a, '/scores', 'POST', scorePayload)
    assert.equal(score.status, 201)
    const duplicateScore = await call(baseUrl, a, '/scores', 'POST', scorePayload)
    assert.equal(duplicateScore.status, 200)
    assert.equal(duplicateScore.body.data.duplicate, true)
    const feed = await call(baseUrl, b, '/social/feed?page=1&limit=1')
    assert.equal(feed.status, 200)
    assert.ok(feed.body.data.pagination.total >= 2)
    assert.equal(feed.body.data.activities.length, 1)
    const fullFeed = await call(baseUrl, b, '/social/feed?page=1&limit=20')
    assert.ok(fullFeed.body.data.activities.some((item) => item.type === 'PERSONAL_BEST'))
    assert.ok(fullFeed.body.data.activities.some((item) => item.type === 'ACHIEVEMENT_UNLOCKED'))
    const leaderboard = await call(baseUrl, b, '/social/leaderboard?page=1&limit=10')
    assert.equal(leaderboard.status, 200)
    assert.deepEqual(leaderboard.body.data.entries.map((entry) => entry.username).sort(), [a.username, b.username].sort())

    const notifications = await call(baseUrl, b, '/social/notifications?page=1&limit=1')
    assert.equal(notifications.status, 200)
    assert.ok(notifications.body.data.unreadCount >= 1)
    assert.equal(notifications.body.data.pagination.total >= 1, true)
    const notificationId = notifications.body.data.notifications[0].id
    const outsiderRead = await call(baseUrl, c, `/social/notifications/${notificationId}/read`, 'PATCH')
    assert.equal(outsiderRead.status, 404)
    const read = await call(baseUrl, b, `/social/notifications/${notificationId}/read`, 'PATCH')
    assert.equal(read.status, 200)
    const readAgain = await call(baseUrl, b, `/social/notifications/${notificationId}/read`, 'PATCH')
    assert.equal(readAgain.status, 200)

    const block = await call(baseUrl, a, '/social/blocks', 'POST', { username: b.username })
    assert.equal(block.status, 201)
    const blockList = await call(baseUrl, a, '/social/blocks?page=1&limit=5')
    assert.equal(blockList.body.data.users.some((user) => user.username === b.username), true)
    const blockedProfile = await call(baseUrl, b, `/social/users/${a.username}`)
    assert.equal(blockedProfile.status, 404)
    const blockedSearch = await call(baseUrl, b, `/social/users?search=${prefix}`)
    assert.equal(blockedSearch.body.data.users.some((user) => user.username === a.username), false)
    const blockedInteraction = await call(baseUrl, b, '/social/friends/requests', 'POST', { username: a.username })
    assert.equal(blockedInteraction.status, 404)
    const noFriendAfterBlock = await call(baseUrl, a, '/social/friends')
    assert.equal(noFriendAfterBlock.body.data.friends.some((friend) => friend.username === b.username), false)

    const unblock = await call(baseUrl, a, `/social/blocks/${b.username}`, 'DELETE')
    assert.equal(unblock.status, 200)
    const visibleAfterUnblock = await call(baseUrl, b, `/social/users/${a.username}`)
    assert.equal(visibleAfterUnblock.status, 200)

    const bRequest = await call(baseUrl, b, '/social/friends/requests', 'POST', { username: a.username })
    assert.equal(bRequest.status, 201)
    const rejected = await call(baseUrl, a, `/social/friends/requests/${bRequest.body.data.friendshipId}`, 'PATCH', { action: 'REJECT' })
    assert.equal(rejected.status, 200)
    assert.equal(rejected.body.data.status, 'REJECTED')
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve))
    if (fixtureIds.length) {
      const placeholders = fixtureIds.map(() => '?').join(',')
      await pool.execute(`DELETE FROM users WHERE id IN (${placeholders})`, fixtureIds)
    }
    await pool.end()
  }
})
