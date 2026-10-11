import assert from 'node:assert/strict'
import test from 'node:test'
import { createCorsMiddleware } from '../config/cors.js'

function invokeCors(origin, origins) {
  const headers = new Map()
  const request = {
    method: 'OPTIONS',
    headers: {
      origin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type,authorization',
    },
  }
  const response = {
    statusCode: 200,
    ended: false,
    getHeader(name) { return headers.get(name) },
    setHeader(name, value) { headers.set(name, value) },
    end() { this.ended = true },
  }
  let nextCalled = false

  createCorsMiddleware(origins)(request, response, () => { nextCalled = true })
  return { headers, response, nextCalled }
}

test('CORS middleware allows a configured origin without enabling credentials', () => {
  const { headers, response, nextCalled } = invokeCors(
    'https://gamehub.example',
    ['https://gamehub.example', 'https://admin.example'],
  )

  assert.equal(headers.get('Access-Control-Allow-Origin'), 'https://gamehub.example')
  assert.equal(headers.get('Access-Control-Allow-Credentials'), undefined)
  assert.equal(response.statusCode, 204)
  assert.equal(response.ended, true)
  assert.equal(nextCalled, false)
})

test('CORS middleware does not reflect an untrusted origin', () => {
  const { headers, response } = invokeCors(
    'https://untrusted.example',
    ['https://gamehub.example'],
  )

  assert.equal(headers.get('Access-Control-Allow-Origin'), undefined)
  assert.equal(response.statusCode, 204)
  assert.equal(response.ended, true)
})
