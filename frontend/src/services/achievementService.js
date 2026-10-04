import { api } from './api.js'

export async function getMyAchievements() {
  const response = await api.get('/achievements/me')
  return response.data.data
}

export async function getAllAchievements() {
  const response = await api.get('/achievements')
  return response.data.data
}

export async function checkAchievements() {
  const response = await api.post('/achievements/check')
  return response.data.data // { newlyUnlocked: string[] }
}
