import './config/env.js'
import cors from 'cors'
import express from 'express'
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

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
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
