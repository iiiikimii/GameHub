import { Router } from 'express'
import {
  block,
  blocked,
  deleteFriend,
  feed,
  friendRequests,
  friends,
  friendsLeaderboard,
  notifications,
  publicProfile,
  readAllNotifications,
  readNotification,
  requestFriendship,
  respondFriendship,
  search,
  unblock,
} from '../controllers/socialController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { friendRequestRateLimiter, socialSearchRateLimiter } from '../middleware/routeRateLimiters.js'

const router = Router()

router.get('/api/social/users', authMiddleware, socialSearchRateLimiter, search)
router.get('/api/social/users/:username', authMiddleware, publicProfile)
router.post('/api/social/friends/requests', authMiddleware, friendRequestRateLimiter, requestFriendship)
router.get('/api/social/friends/requests', authMiddleware, friendRequests)
router.patch('/api/social/friends/requests/:id', authMiddleware, respondFriendship)
router.get('/api/social/friends', authMiddleware, friends)
router.delete('/api/social/friends/:id', authMiddleware, deleteFriend)
router.get('/api/social/blocks', authMiddleware, blocked)
router.post('/api/social/blocks', authMiddleware, block)
router.delete('/api/social/blocks/:username', authMiddleware, unblock)
router.get('/api/social/feed', authMiddleware, feed)
router.get('/api/social/leaderboard', authMiddleware, friendsLeaderboard)
router.get('/api/social/notifications', authMiddleware, notifications)
router.patch('/api/social/notifications/read-all', authMiddleware, readAllNotifications)
router.patch('/api/social/notifications/:id/read', authMiddleware, readNotification)

export default router
