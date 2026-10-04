import { api } from './api.js'

export async function getDashboard() {
  const response = await api.get('/dashboard')
  return response.data.data
}
