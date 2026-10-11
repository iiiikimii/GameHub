import {
  blockUser,
  getActivityFeed,
  getFriendsLeaderboard,
  getNotifications,
  getPublicProfile,
  listBlockedUsers,
  listFriendRequests,
  listFriends,
  markAllNotificationsRead,
  markNotificationRead,
  removeFriend,
  respondToFriendRequest,
  searchUsers,
  sendFriendRequest,
  unblockUser,
} from '../services/socialService.js'
import { successResponse } from '../utils/apiResponse.js'

function positiveId(value, label) {
  if (!/^[1-9]\d*$/.test(String(value))) {
    const error = new Error(`${label} must be a positive integer`)
    error.statusCode = 400
    throw error
  }
  const id = Number(value)
  if (!Number.isSafeInteger(id)) {
    const error = new Error(`${label} is invalid`)
    error.statusCode = 400
    throw error
  }
  return id
}

function handler(message, work, status = 200) {
  return async (request, response, next) => {
    try {
      const data = await work(request)
      response.status(typeof status === 'function' ? status(data) : status).json(successResponse(message, data))
    } catch (error) {
      next(error)
    }
  }
}

export const search = handler('Users retrieved successfully', (request) => searchUsers(request.user.id, request.query))
export const publicProfile = handler('Public profile retrieved successfully', (request) => getPublicProfile(request.user.id, request.params.username))
export const requestFriendship = handler(
  'Friend request submitted successfully',
  (request) => sendFriendRequest(request.user.id, request.body?.username),
  (data) => data.status === 'PENDING' ? 201 : 200,
)
export const respondFriendship = handler('Friend request updated successfully', (request) => respondToFriendRequest(request.user.id, positiveId(request.params.id, 'request id'), request.body?.action))
export const friendRequests = handler('Friend requests retrieved successfully', (request) => listFriendRequests(request.user.id, request.query.box, request.query))
export const friends = handler('Friends retrieved successfully', (request) => listFriends(request.user.id, request.query))
export const deleteFriend = handler('Friend removed successfully', (request) => removeFriend(request.user.id, positiveId(request.params.id, 'friendship id')))
export const block = handler('User blocked successfully', (request) => blockUser(request.user.id, request.body?.username), 201)
export const unblock = handler('User unblocked successfully', (request) => unblockUser(request.user.id, request.params.username))
export const blocked = handler('Blocked users retrieved successfully', (request) => listBlockedUsers(request.user.id, request.query))
export const feed = handler('Activity feed retrieved successfully', (request) => getActivityFeed(request.user.id, request.query))
export const friendsLeaderboard = handler('Friends leaderboard retrieved successfully', (request) => getFriendsLeaderboard(request.user.id, request.query))
export const notifications = handler('Notifications retrieved successfully', (request) => getNotifications(request.user.id, request.query))
export const readNotification = handler('Notification marked as read', (request) => markNotificationRead(request.user.id, positiveId(request.params.id, 'notification id')))
export const readAllNotifications = handler('Notifications marked as read', (request) => markAllNotificationsRead(request.user.id))
