import { Router } from 'express'
import { gameLeaderboard, globalLeaderboard } from '../controllers/leaderboardController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/api/leaderboard', authMiddleware, globalLeaderboard)
router.get('/api/leaderboard/:gameId', authMiddleware, gameLeaderboard)

export default router
