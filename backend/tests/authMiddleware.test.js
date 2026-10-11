import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import pool from '../config/database.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { adminMiddleware } from '../middleware/adminMiddleware.js'

const testSecret = 'gamehub-auth-test-secret-with-enough-entropy'

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

async function invokeAuth(authorization) {
  const request = { get: () => authorization }
  const response = makeResponse()
  let forwarded
  await authMiddleware(request, response, (error) => { forwarded = error })
  return { request, response, forwarded }
}

test('authentication rejects missing and malformed bearer tokens without a database read', async (t) => {
  const originalExecute = pool.execute
  const originalSecret = process.env.JWT_SECRET
  let databaseRead = false
  pool.execute = async () => { databaseRead = true; throw new Error('unexpected database read') }
  process.env.JWT_SECRET = testSecret
  t.after(() => {
    pool.execute = originalExecute
    if (originalSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalSecret
  })

  for (const authorization of ['', 'Basic token', 'Bearer token extra']) {
    const { response } = await invokeAuth(authorization)
    assert.equal(response.statusCode, 401)
  }
  assert.equal(databaseRead, false)
})

test('authentication loads the current active account from the database', async (t) => {
  const originalExecute = pool.execute
  const originalSecret = process.env.JWT_SECRET
  process.env.JWT_SECRET = testSecret
  pool.execute = async (_sql, params) => {
    assert.deepEqual(params, ['42'])
    return [[{ id: '42', username: 'player', role: 'USER', is_active: 1 }], []]
  }
  t.after(() => {
    pool.execute = originalExecute
    if (originalSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalSecret
  })

  const token = jwt.sign({}, testSecret, { subject: '42', expiresIn: '1m' })
  const { request, response, forwarded } = await invokeAuth(`Bearer ${token}`)
  assert.equal(forwarded, undefined)
  assert.equal(response.statusCode, null)
  assert.equal(request.user.id, '42')
  assert.equal(request.user.role, 'USER')
})

test('authentication rejects disabled accounts', async (t) => {
  const originalExecute = pool.execute
  const originalSecret = process.env.JWT_SECRET
  process.env.JWT_SECRET = testSecret
  pool.execute = async () => [[{ id: '42', is_active: 0 }], []]
  t.after(() => {
    pool.execute = originalExecute
    if (originalSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalSecret
  })

  const token = jwt.sign({}, testSecret, { subject: '42', expiresIn: '1m' })
  const { response } = await invokeAuth(`Bearer ${token}`)
  assert.equal(response.statusCode, 403)
})

test('admin authorization distinguishes missing, non-admin, and admin users', () => {
  const unauthenticated = makeResponse()
  adminMiddleware({}, unauthenticated, () => assert.fail('must reject missing user'))
  assert.equal(unauthenticated.statusCode, 401)

  const player = makeResponse()
  adminMiddleware({ user: { role: 'USER' } }, player, () => assert.fail('must reject player'))
  assert.equal(player.statusCode, 403)

  let continued = false
  adminMiddleware({ user: { role: 'ADMIN' } }, makeResponse(), () => { continued = true })
  assert.equal(continued, true)
})
