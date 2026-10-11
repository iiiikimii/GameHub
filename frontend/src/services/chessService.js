import { io } from 'socket.io-client'
import { api } from './api.js'

export async function getChessInvitations() {
  const response = await api.get('/chess/invitations')
  return response.data.data
}

export async function getActiveChessRoom() {
  const response = await api.get('/chess/rooms/active')
  return response.data.data
}

export async function getChessRoom(roomCode) {
  const response = await api.get(`/chess/rooms/${encodeURIComponent(roomCode)}`)
  return response.data.data
}

export async function createChessRoom(friendId) {
  const response = await api.post('/chess/rooms', { friendId })
  return response.data.data
}

export async function joinChessRoomByCode(roomCode) {
  const response = await api.post('/chess/rooms/join', { roomCode })
  return response.data.data
}

export async function respondChessInvitation(id, accept) {
  const response = await api.post(`/chess/invitations/${encodeURIComponent(id)}/respond`, { accept })
  return response.data.data
}

export async function createChessRematch(roomCode) {
  const response = await api.post(`/chess/rooms/${encodeURIComponent(roomCode)}/rematch`)
  return response.data.data
}

export async function actOnChessRoom(roomCode, action) {
  const response = await api.post(`/chess/rooms/${encodeURIComponent(roomCode)}/actions`, { action })
  return response.data.data
}

export function createChessSocket(token) {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const socketOrigin = new URL(apiBase, window.location.origin).origin
  return io(socketOrigin, { autoConnect: false, auth: { token } })
}
