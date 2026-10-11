import assert from 'node:assert/strict'
import test from 'node:test'
import { getAllowedOrigins } from '../config/cors.js'

test('CORS uses the local Vite origin when no production allowlist is configured', () => {
  assert.deepEqual(getAllowedOrigins(''), ['http://localhost:5173'])
  assert.deepEqual(getAllowedOrigins(undefined), ['http://localhost:5173'])
})

test('CORS parses a comma-separated allowlist and ignores empty entries', () => {
  assert.deepEqual(
    getAllowedOrigins('https://gamehub.example, https://admin.example, ,'),
    ['https://gamehub.example', 'https://admin.example'],
  )
})
