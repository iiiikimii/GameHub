import { Router } from 'express'
import { getCurrentUser, login, register } from '../controllers/authController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { loginRateLimiter, registrationRateLimiter } from '../middleware/routeRateLimiters.js'

const router = Router()

router.post('/register', registrationRateLimiter, register)
router.post('/login', loginRateLimiter, login)
router.get('/me', authMiddleware, getCurrentUser)

export default router
