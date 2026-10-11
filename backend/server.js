import { createServer } from 'node:http'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import pool, { checkDatabaseConnection } from './config/database.js'
import { getAllowedOrigins } from './config/cors.js'
import app from './app.js'
import { attachChessSocket } from './realtime/chessSocket.js'
import {
  actOnChessRoom,
  getChessRoom,
  submitChessMove,
} from './services/chessService.js'

const port = Number(process.env.PORT || 5000)
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: getAllowedOrigins(), methods: ['GET', 'POST'] },
  maxHttpBufferSize: 16_384,
})

async function authenticateChessToken(token) {
  if (typeof token !== 'string' || token.length > 4096 || !process.env.JWT_SECRET) {
    throw new Error('Authentication failed')
  }

  const payload = jwt.verify(token, process.env.JWT_SECRET)
  if (typeof payload !== 'object' || typeof payload.sub !== 'string') throw new Error('Authentication failed')
  const [users] = await pool.execute('SELECT id, is_active FROM users WHERE id = ? LIMIT 1', [payload.sub])
  if (!users.length || !users[0].is_active) throw new Error('Authentication failed')
  return { id: String(users[0].id) }
}

attachChessSocket(io, {
  authenticate: authenticateChessToken,
  getRoomState: getChessRoom,
  submitMove: submitChessMove,
  actOnRoom: actOnChessRoom,
})

// Vercel attaches the exported HTTP server to each function invocation. Starting
// a listener or probing MySQL while the module is imported would break that
// lifecycle, so retain the explicit startup check only for the local server.
if (process.env.VERCEL !== '1') {
  try {
    await checkDatabaseConnection()
    console.log('MySQL database connection established')

    httpServer.listen(port, () => {
      console.log(`GameHub API listening on http://localhost:${port}`)
    })
  } catch (error) {
    const reason = error.message || 'No error message returned by the MySQL driver'
    console.error(`Unable to connect to MySQL (${error.code || 'UNKNOWN'}): ${reason}`)
    await pool.end()
    process.exitCode = 1
  }
}

export default httpServer
