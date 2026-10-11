import { Router } from 'express'
import {
  claimReward,
  equipCosmeticItem,
  getCosmetics,
  getHistory,
  getQuests,
  getXpLogs,
} from '../controllers/questController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

// All quest endpoints are protected by authMiddleware
router.get('/api/quests', authMiddleware, getQuests)
router.post('/api/quests/:userQuestId/claim', authMiddleware, claimReward)
router.get('/api/quests/history', authMiddleware, getHistory)
router.get('/api/quests/xp-logs', authMiddleware, getXpLogs)
router.get('/api/quests/cosmetics', authMiddleware, getCosmetics)
router.post('/api/quests/cosmetics/equip', authMiddleware, equipCosmeticItem)

export default router
