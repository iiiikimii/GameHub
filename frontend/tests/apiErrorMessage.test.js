import assert from 'node:assert/strict'
import test from 'node:test'
import { apiErrorMessage } from '../src/services/apiErrorMessage.js'

test('API error helper prefers a safe server message', () => {
  assert.equal(apiErrorMessage({ response: { data: { message: 'Friend request already exists' } } }, 'Fallback'), 'Friend request already exists')
})

test('API error helper explains when the backend cannot be reached', () => {
  const message = apiErrorMessage({ code: 'ERR_NETWORK' }, 'Fallback')
  assert.match(message, /server GameHub.*backend berjalan/i)
})

test('API error helper uses the page fallback for other errors', () => {
  assert.equal(apiErrorMessage({ response: { status: 500 } }, 'Fallback'), 'Fallback')
})
