import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import express from 'express'
import test from 'node:test'
import authRoutes from '../routes/authRoutes.js'
import { createRouteRateLimiter } from '../middleware/routeRateLimiters.js'
import { errorMiddleware } from '../middleware/errorMiddleware.js'

test('route rate limiter returns a structured 429 response after its configured maximum', async () => {
  const app = express()
  app.post('/limited', createRouteRateLimiter({
    windowMs: 60_000,
    max: 2,
    message: 'Rate limit reached.',
  }), (_request, response) => response.json({ success: true }))

  const server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`http://127.0.0.1:${port}/limited`, { method: 'POST' })
      assert.equal(response.status, 200)
    }

    const limitedResponse = await fetch(`http://127.0.0.1:${port}/limited`, { method: 'POST' })
    assert.equal(limitedResponse.status, 429)
    assert.equal(limitedResponse.headers.get('ratelimit-limit'), '2')
    assert.equal(limitedResponse.headers.get('ratelimit-remaining'), '0')
    assert.deepEqual(await limitedResponse.json(), {
      success: false,
      message: 'Rate limit reached.',
    })
  } finally {
    server.closeAllConnections()
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
})

test('login route applies its stricter rate limit before any database lookup', async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRoutes)
  app.use(errorMiddleware)

  const server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/api/auth/login`

  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      assert.equal(response.status, 400)
    }

    const limitedResponse = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
    assert.equal(limitedResponse.status, 429)
    assert.deepEqual(await limitedResponse.json(), {
      success: false,
      message: 'Too many login attempts. Please try again later.',
    })
  } finally {
    server.closeAllConnections()
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
})
