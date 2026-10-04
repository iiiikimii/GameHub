import { api } from './api.js'

export async function getProfile() {
  const response = await api.get('/profile')
  return response.data.data
}

export async function updateProfile(payload) {
  const response = await api.put('/profile', payload)
  return response.data.data
}

export async function getHistory(params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') qs.set(k, v)
  })
  const response = await api.get(`/history${qs.toString() ? `?${qs}` : ''}`)
  return response.data.data
}
