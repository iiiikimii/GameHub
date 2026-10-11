import { Router } from 'express'
import {
  activeRoom,
  createRoom,
  invitations,
  joinByCode,
  rematch,
  respondInvitation,
  roomAction,
  roomState,
} from '../controllers/chessController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.use('/api/chess', authMiddleware)
router.get('/api/chess/invitations', invitations)
router.post('/api/chess/invitations/:id/respond', respondInvitation)
router.get('/api/chess/rooms/active', activeRoom)
router.post('/api/chess/rooms/join', joinByCode)
router.post('/api/chess/rooms', createRoom)
router.post('/api/chess/rooms/:roomCode/actions', roomAction)
router.post('/api/chess/rooms/:roomCode/rematch', rematch)
router.get('/api/chess/rooms/:roomCode', roomState)

export default router
