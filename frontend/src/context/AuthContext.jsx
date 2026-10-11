import { useEffect, useState } from 'react'
import { AuthContext } from './authContext.js'
import * as authService from '../services/authService.js'
import { clearSessionToken, readSessionToken, saveSessionToken } from '../services/sessionStore.js'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readSessionToken)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(readSessionToken()))

  useEffect(() => {
    let isCurrent = true

    if (!token) {
      return () => {
        isCurrent = false
      }
    }

    async function refreshSession() {
      setLoading(true)
      try {
        const { user: currentUser } = await authService.getCurrentUser()
        if (isCurrent) setUser(currentUser)
      } catch (error) {
        if (isCurrent) {
          setUser(null)
          if (error.response?.status === 401) {
            clearSessionToken()
            setToken(null)
          }
        }
      } finally {
        if (isCurrent) setLoading(false)
      }
    }

    refreshSession()
    window.addEventListener('online', refreshSession)

    return () => {
      isCurrent = false
      window.removeEventListener('online', refreshSession)
    }
  }, [token])

  function saveSession(session) {
    saveSessionToken(session.token)
    setToken(session.token)
    setUser(session.user)
  }

  function updateUser(updatedUser) {
    setUser((currentUser) => currentUser ? { ...currentUser, ...updatedUser } : updatedUser)
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
    clearSessionToken()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}
