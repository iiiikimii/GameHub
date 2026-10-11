import { api } from './api.js'

export function notifyNotificationsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('gamehub-notifications-updated'))
}

export async function searchUsers(search, page = 1) {
  const response = await api.get('/social/users', { params: { search, page, limit: 20 } })
  return response.data.data
}

export async function getPublicProfile(username) {
  const response = await api.get(`/social/users/${encodeURIComponent(username)}`)
  return response.data.data
}

export async function sendFriendRequest(username) {
  const response = await api.post('/social/friends/requests', { username })
  return response.data.data
}

export async function getFriendRequests(box, page = 1) {
  const response = await api.get('/social/friends/requests', { params: { box, page, limit: 20 } })
  return response.data.data
}

export async function respondFriendRequest(id, action) {
  const response = await api.patch(`/social/friends/requests/${id}`, { action })
  return response.data.data
}

export async function getFriends(page = 1) {
  const response = await api.get('/social/friends', { params: { page, limit: 20 } })
  return response.data.data
}

export async function removeFriend(id) {
  const response = await api.delete(`/social/friends/${id}`)
  return response.data.data
}

export async function blockUser(username) {
  const response = await api.post('/social/blocks', { username })
  return response.data.data
}

export async function unblockUser(username) {
  const response = await api.delete(`/social/blocks/${encodeURIComponent(username)}`)
  return response.data.data
}

export async function getBlockedUsers(page = 1) {
  const response = await api.get('/social/blocks', { params: { page, limit: 20 } })
  return response.data.data
}

export async function getActivityFeed(page = 1) {
  const response = await api.get('/social/feed', { params: { page, limit: 20 } })
  return response.data.data
}

export async function getFriendsLeaderboard(page = 1) {
  const response = await api.get('/social/leaderboard', { params: { page, limit: 20 } })
  return response.data.data
}

export async function getNotifications(page = 1) {
  const response = await api.get('/social/notifications', { params: { page, limit: 20 } })
  return response.data.data
}

export async function markNotificationRead(id) {
  const response = await api.patch(`/social/notifications/${id}/read`)
  notifyNotificationsChanged()
  return response.data.data
}

export async function markAllNotificationsRead() {
  const response = await api.patch('/social/notifications/read-all')
  notifyNotificationsChanged()
  return response.data.data
}
