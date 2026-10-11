import {
  actOnChessRoom,
  createChessRematch,
  createChessRoom,
  getActiveChessRoom,
  getChessRoom,
  joinChessRoomByCode,
  listChessInvitations,
  respondChessInvitation,
} from '../services/chessService.js'
import { successResponse } from '../utils/apiResponse.js'

function positiveId(value, label) {
  const id = String(value ?? '')
  if (!/^[1-9]\d*$/.test(id)) {
    const error = new Error(`${label} must be a positive integer`)
    error.statusCode = 400
    throw error
  }
  return id
}

function handler(message, work, statusCode = 200) {
  return async (request, response, next) => {
    try {
      const data = await work(request)
      response.status(statusCode).json(successResponse(message, data))
    } catch (error) {
      next(error)
    }
  }
}

export const createRoom = handler('Chess invitation created successfully', (request) => (
  createChessRoom(request.user.id, positiveId(request.body?.friendId, 'friendId'))
), 201)

export const invitations = handler('Chess invitations retrieved successfully', (request) => (
  listChessInvitations(request.user.id)
))

export const respondInvitation = handler('Chess invitation updated successfully', (request) => (
  respondChessInvitation(
    request.user.id,
    positiveId(request.params.id, 'invitation id'),
    request.body?.accept,
  )
))

export const joinByCode = handler('Joined chess room successfully', (request) => (
  joinChessRoomByCode(request.user.id, request.body?.roomCode)
))

export const activeRoom = handler('Active chess room retrieved successfully', (request) => (
  getActiveChessRoom(request.user.id)
))

export const roomState = handler('Chess room retrieved successfully', (request) => (
  getChessRoom(request.user.id, request.params.roomCode)
))

export const roomAction = handler('Chess action completed successfully', (request) => (
  actOnChessRoom({ userValue: request.user.id, codeValue: request.params.roomCode, action: request.body?.action })
))

export const rematch = handler('Rematch invitation created successfully', (request) => (
  createChessRematch(request.user.id, request.params.roomCode)
), 201)
