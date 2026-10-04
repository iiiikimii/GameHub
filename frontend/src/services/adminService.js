import { api } from './api.js'

const base = '/admin'

export const adminApi = {
  // Stats
  getStats: () => api.get(`${base}/stats`).then((r) => r.data.data),

  // Users
  getUsers: (params = {}) => api.get(`${base}/users`, { params }).then((r) => r.data.data),
  getUser: (id) => api.get(`${base}/users/${id}`).then((r) => r.data.data),
  updateUserRole: (id, role) => api.put(`${base}/users/${id}/role`, { role }).then((r) => r.data.data),
  toggleUserActive: (id, is_active) => api.put(`${base}/users/${id}/status`, { is_active }).then((r) => r.data.data),
  deleteUser: (id) => api.delete(`${base}/users/${id}`).then((r) => r.data.data),

  // Games
  getGames: () => api.get(`${base}/games`).then((r) => r.data.data),
  createGame: (data) => api.post(`${base}/games`, data).then((r) => r.data.data),
  updateGame: (id, data) => api.put(`${base}/games/${id}`, data).then((r) => r.data.data),
  deleteGame: (id) => api.delete(`${base}/games/${id}`).then((r) => r.data.data),

  // Challenges
  getChallenges: () => api.get(`${base}/challenges`).then((r) => r.data.data),
  createChallenge: (data) => api.post(`${base}/challenges`, data).then((r) => r.data.data),
  updateChallenge: (id, data) => api.put(`${base}/challenges/${id}`, data).then((r) => r.data.data),
  deleteChallenge: (id) => api.delete(`${base}/challenges/${id}`).then((r) => r.data.data),

  // Scores
  getScores: (params = {}) => api.get(`${base}/scores`, { params }).then((r) => r.data.data),
  deleteScore: (id) => api.delete(`${base}/scores/${id}`).then((r) => r.data.data),
}
