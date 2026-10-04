import { Router } from 'express'
import { postScore } from '../controllers/scoreController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.post('/api/scores', authMiddleware, postScore)

export default router
