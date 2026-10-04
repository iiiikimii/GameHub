import { Router } from 'express'
import { adminMiddleware } from '../middleware/adminMiddleware.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import * as c from '../controllers/adminController.js'

const router = Router()
const admin = [authMiddleware, adminMiddleware]

// Stats
router.get('/api/admin/stats',                    ...admin, c.getStats)

// Users
router.get('/api/admin/users',                    ...admin, c.listUsers)
router.get('/api/admin/users/:id',                ...admin, c.getUser)
router.put('/api/admin/users/:id/role',           ...admin, c.updateUserRole)
router.put('/api/admin/users/:id/status',         ...admin, c.toggleUserActive)
router.delete('/api/admin/users/:id',             ...admin, c.deleteUser)

// Games
router.get('/api/admin/games',                    ...admin, c.listGames)
router.post('/api/admin/games',                   ...admin, c.createGame)
router.put('/api/admin/games/:id',                ...admin, c.updateGame)
router.delete('/api/admin/games/:id',             ...admin, c.deleteGame)

// Challenges
router.get('/api/admin/challenges',               ...admin, c.listChallenges)
router.post('/api/admin/challenges',              ...admin, c.createChallenge)
router.put('/api/admin/challenges/:id',           ...admin, c.updateChallenge)
router.delete('/api/admin/challenges/:id',        ...admin, c.deleteChallenge)

// Scores
router.get('/api/admin/scores',                   ...admin, c.listScores)
router.delete('/api/admin/scores/:id',            ...admin, c.deleteScore)

export default router
