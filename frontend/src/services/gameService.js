import { api } from './api.js'
import { notifyNotificationsChanged } from './socialService.js'
import { assertOnlineForScoreSubmission } from '../pwa/scoreSubmission.js'

export async function getGames() {
  const response = await api.get('/games')
  return response.data.data
}

export async function getGameBySlug(slug) {
  const response = await api.get(`/games/${slug}`)
  return response.data.data
}

export async function submitScore({ gameSlug, score, duration, submissionKey }) {
  assertOnlineForScoreSubmission()

  const response = await api.post('/scores', { gameSlug, score, duration, submissionKey })
  notifyNotificationsChanged()
  return response.data.data
}

export function getScoreSubmissionError(error, fallback = 'Gagal mengirim skor. Coba lagi.') {
  if (!navigator.onLine || error.code === 'ERR_NETWORK' || !error.response) {
    return 'Koneksi terputus. Skor belum tersimpan; sambungkan internet lalu coba kirim lagi.'
  }
  return error.response.data?.message ?? fallback
}
