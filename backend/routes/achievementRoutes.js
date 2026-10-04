import { Router } from 'express'
import {
  checkAchievements,
  listAchievements,
  myAchievements,
} from '../controllers/achievementController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

// GET /api/achievements — all achievements (no user context)
router.get('/api/achievements', authMiddleware, listAchievements)

// GET /api/achievements/me — current user's achievements with unlock + progress
router.get('/api/achievements/me', authMiddleware, myAchievements)

// POST /api/achievements/check — trigger achievement evaluation for current user
router.post('/api/achievements/check', authMiddleware, checkAchievements)

export default router
