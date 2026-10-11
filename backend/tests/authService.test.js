import assert from 'node:assert/strict'
import test from 'node:test'
import { loginUser, registerUser } from '../services/authService.js'

test('registration rejects malformed account fields before accessing the database', async () => {
  await assert.rejects(
    registerUser({ username: 'ab', email: 'player@example.com', password: 'password123', confirmPassword: 'password123' }),
    { statusCode: 400 },
  )
  await assert.rejects(
    registerUser({ username: 'player_1', email: 'not-an-email', password: 'password123', confirmPassword: 'password123' }),
    { statusCode: 400 },
  )
  await assert.rejects(
    registerUser({ username: 'player_1', email: 'player@example.com', password: 'short', confirmPassword: 'short' }),
    { statusCode: 400 },
  )
})

test('registration rejects passwords exceeding bcrypt byte limits and mismatched confirmation', async () => {
  await assert.rejects(
    registerUser({ username: 'player_1', email: 'player@example.com', password: 'é'.repeat(37), confirmPassword: 'é'.repeat(37) }),
    { statusCode: 400 },
  )
  await assert.rejects(
    registerUser({ username: 'player_1', email: 'player@example.com', password: 'password123', confirmPassword: 'password456' }),
    { statusCode: 400 },
  )
})

test('login requires an identifier and password before accessing the database', async () => {
  await assert.rejects(loginUser({}), { statusCode: 400 })
  await assert.rejects(loginUser({ identifier: 'player' }), { statusCode: 400 })
})
