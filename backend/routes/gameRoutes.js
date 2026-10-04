import { Router } from 'express'
import { getGame, listGames } from '../controllers/gameController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/api/games', authMiddleware, listGames)
router.get('/api/games/:slug', authMiddleware, getGame)

export default router
