import { Router } from 'express'
import {
  finishChallenge,
  listChallenges,
  todayChallenges,
} from '../controllers/challengeController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/api/challenges', authMiddleware, listChallenges)
router.get('/api/challenges/today', authMiddleware, todayChallenges)
router.post('/api/challenges/:id/complete', authMiddleware, finishChallenge)

export default router
