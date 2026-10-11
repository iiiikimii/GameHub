const tokenKey = 'gamehub_token'

/** Keep authentication isolated to this browser tab so two players can test a match on one origin. */
export function readSessionToken() {
  if (typeof window === 'undefined') return null

  const tabToken = window.sessionStorage.getItem(tokenKey)
  if (tabToken) return tabToken

  // Move existing installations off shared localStorage the next time they open the app.
  const legacyToken = window.localStorage.getItem(tokenKey)
  if (!legacyToken) return null

  window.sessionStorage.setItem(tokenKey, legacyToken)
  window.localStorage.removeItem(tokenKey)
  return legacyToken
}

export function saveSessionToken(token) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(tokenKey, token)
  window.localStorage.removeItem(tokenKey)
}

export function clearSessionToken() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(tokenKey)
  window.localStorage.removeItem(tokenKey)
}
