import { Router } from 'express'
import { editProfile, showProfile } from '../controllers/profileController.js'
import { showHistory } from '../controllers/historyController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/api/profile', authMiddleware, showProfile)
router.put('/api/profile', authMiddleware, editProfile)
router.get('/api/history', authMiddleware, showHistory)

export default router
