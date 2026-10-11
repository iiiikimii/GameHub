import { Router } from 'express'
import {
  claimRewards,
  getRankedLeaderboard,
  getRankedProfile,
  getSeasonsList,
} from '../controllers/rankedController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

// All ranked endpoints require authentication
router.get('/api/ranked/profile', authMiddleware, getRankedProfile)
router.get('/api/ranked/leaderboard', authMiddleware, getRankedLeaderboard)
router.get('/api/ranked/seasons', authMiddleware, getSeasonsList)
router.post('/api/ranked/seasons/:seasonId/claim-rewards', authMiddleware, claimRewards)

export default router
