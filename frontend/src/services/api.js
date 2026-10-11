import axios from 'axios'
import { readSessionToken } from './sessionStore.js'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = readSessionToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
