import assert from 'node:assert/strict'
import test from 'node:test'
import { errorMiddleware } from '../middleware/errorMiddleware.js'

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

test('unexpected server errors return a generic message without stack or database details', () => {
  const originalConsoleError = console.error
  console.error = () => {}

  try {
    const response = makeResponse()
    errorMiddleware(new Error('SELECT * FROM users; private driver detail'), {}, response, () => {})

    assert.equal(response.statusCode, 500)
    assert.equal(response.body.message, 'Internal server error')
    assert.doesNotMatch(JSON.stringify(response.body), /SELECT|private driver|stack/i)
  } finally {
    console.error = originalConsoleError
  }
})

test('expected client errors keep their status and safe message', () => {
  const response = makeResponse()
  const error = Object.assign(new Error('Invalid filter'), { statusCode: 400 })
  errorMiddleware(error, {}, response, () => {})

  assert.equal(response.statusCode, 400)
  assert.equal(response.body.message, 'Invalid filter')
})
