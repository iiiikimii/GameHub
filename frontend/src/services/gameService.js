import { api } from './api.js'

export async function getGames() {
  const response = await api.get('/games')
  return response.data.data
}

export async function getGameBySlug(slug) {
  const response = await api.get(`/games/${slug}`)
  return response.data.data
}

export async function submitScore({ gameSlug, score, duration }) {
  const response = await api.post('/scores', { gameSlug, score, duration })
  return response.data.data
}
