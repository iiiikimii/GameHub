import { Router } from 'express'
import { adminMiddleware } from '../middleware/adminMiddleware.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import {
  adminActivityTrend,
  adminChallengeStats,
  adminGamePopularity,
  adminSummary,
  playerSummary,
  playerTrend,
} from '../controllers/analyticsController.js'

const router = Router()

// ── Player analytics (auth required, own data only) ──────────
router.get('/api/analytics/me/summary', authMiddleware, playerSummary)
router.get('/api/analytics/me/trend',   authMiddleware, playerTrend)

// ── Admin analytics (admin role required) ────────────────────
router.get('/api/analytics/admin/summary',    authMiddleware, adminMiddleware, adminSummary)
router.get('/api/analytics/admin/games',      authMiddleware, adminMiddleware, adminGamePopularity)
router.get('/api/analytics/admin/challenges', authMiddleware, adminMiddleware, adminChallengeStats)
router.get('/api/analytics/admin/trend',      authMiddleware, adminMiddleware, adminActivityTrend)

export default router
