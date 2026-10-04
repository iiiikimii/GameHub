import { api } from './api.js'

export async function getChallenges() {
  const response = await api.get('/challenges')
  return response.data.data
}

export async function getTodayChallenges() {
  const response = await api.get('/challenges/today')
  return response.data.data
}

export async function completeChallenge(id) {
  const response = await api.post(`/challenges/${id}/complete`)
  return response.data.data  // { challengeId, title, rewardPoints, newTotalScore }
}
