import './config/env.js'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import achievementRoutes from './routes/achievementRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import challengeRoutes from './routes/challengeRoutes.js'
import profileRoutes from './routes/profileRoutes.js'
import authRoutes from './routes/authRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import gameRoutes from './routes/gameRoutes.js'
import leaderboardRoutes from './routes/leaderboardRoutes.js'
import scoreRoutes from './routes/scoreRoutes.js'
import { errorMiddleware } from './middleware/errorMiddleware.js'
import { notFoundMiddleware } from './middleware/notFoundMiddleware.js'
import healthRoutes from './routes/healthRoutes.js'

const app = express()

// Set up rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
})

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.use('/api/', limiter) // Apply rate limiter to all /api/ routes
app.use('/api/auth', authRoutes)
app.use(achievementRoutes)
app.use(adminRoutes)
app.use(challengeRoutes)
app.use(profileRoutes)
app.use(dashboardRoutes)
app.use(gameRoutes)
app.use(leaderboardRoutes)
app.use(scoreRoutes)
app.use(healthRoutes)
app.use(notFoundMiddleware)
app.use(errorMiddleware)

export default app
