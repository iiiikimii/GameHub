import { useEffect, useState } from 'react'
import { AuthContext } from './authContext.js'
import * as authService from '../services/authService.js'

const tokenKey = 'gamehub_token'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(tokenKey)))

  useEffect(() => {
    let isCurrent = true

    if (!token) {
      return () => {
        isCurrent = false
      }
    }

    authService.getCurrentUser()
      .then(({ user: currentUser }) => {
        if (isCurrent) setUser(currentUser)
      })
      .catch(() => {
        localStorage.removeItem(tokenKey)
        if (isCurrent) {
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (isCurrent) setLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [token])

  function saveSession(session) {
    localStorage.setItem(tokenKey, session.token)
    setToken(session.token)
    setUser(session.user)
  }

  async function login(credentials) {
    const session = await authService.login(credentials)
    saveSession(session)
    return session.user
  }

  async function register(details) {
    const session = await authService.register(details)
    saveSession(session)
    return session.user
  }

  function logout() {
    localStorage.removeItem(tokenKey)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
