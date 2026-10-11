import assert from 'node:assert/strict'
import test from 'node:test'
import { clearSessionToken, readSessionToken, saveSessionToken } from '../src/services/sessionStore.js'

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem(key) { return values.get(key) ?? null },
    setItem(key, value) { values.set(key, String(value)) },
    removeItem(key) { values.delete(key) },
  }
}

test('legacy shared token migrates into this tab and is removed from shared storage', () => {
  const previousWindow = globalThis.window
  const sessionStorage = makeStorage()
  const localStorage = makeStorage({ gamehub_token: 'legacy-token' })
  globalThis.window = { sessionStorage, localStorage }

  try {
    assert.equal(readSessionToken(), 'legacy-token')
    assert.equal(sessionStorage.getItem('gamehub_token'), 'legacy-token')
    assert.equal(localStorage.getItem('gamehub_token'), null)
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})

test('saving and clearing a session token only affects the current tab session', () => {
  const previousWindow = globalThis.window
  const firstTabStorage = makeStorage()
  const secondTabStorage = makeStorage()
  const localStorage = makeStorage()
  globalThis.window = { sessionStorage: firstTabStorage, localStorage }

  try {
    saveSessionToken('account-one')
    globalThis.window = { sessionStorage: secondTabStorage, localStorage }
    saveSessionToken('account-two')

    assert.equal(readSessionToken(), 'account-two')
    assert.equal(firstTabStorage.getItem('gamehub_token'), 'account-one')
    assert.equal(localStorage.getItem('gamehub_token'), null)

    clearSessionToken()
    assert.equal(readSessionToken(), null)
    assert.equal(firstTabStorage.getItem('gamehub_token'), 'account-one')
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
