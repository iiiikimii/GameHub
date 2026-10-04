import * as admin from '../services/adminService.js'
import { successResponse } from '../utils/apiResponse.js'

function wrap(fn) {
  return async (req, res, next) => {
    try { res.json(successResponse('OK', await fn(req, res))) }
    catch (e) { next(e) }
  }
}

export const getStats         = wrap((req) => admin.getAdminStats())

// Users
export const listUsers        = wrap((req) => admin.adminListUsers(req.query))
export const getUser          = wrap((req) => admin.adminGetUser(req.params.id))
export const updateUserRole   = wrap((req) => admin.adminUpdateUserRole(req.params.id, req.body.role, req.user.id))
export const toggleUserActive = wrap((req) => admin.adminToggleUserActive(req.params.id, req.body.is_active, req.user.id))
export const deleteUser       = wrap((req) => admin.adminDeleteUser(req.params.id, req.user.id))

// Games
export const listGames        = wrap(() => admin.adminListGames())
export const createGame       = wrap((req) => admin.adminCreateGame(req.body))
export const updateGame       = wrap((req) => admin.adminUpdateGame(req.params.id, req.body))
export const deleteGame       = wrap((req) => admin.adminDeleteGame(req.params.id))

// Challenges
export const listChallenges   = wrap(() => admin.adminListChallenges())
export const createChallenge  = wrap((req) => admin.adminCreateChallenge(req.body))
export const updateChallenge  = wrap((req) => admin.adminUpdateChallenge(req.params.id, req.body))
export const deleteChallenge  = wrap((req) => admin.adminDeleteChallenge(req.params.id))

// Scores
export const listScores       = wrap((req) => admin.adminListScores(req.query))
export const deleteScore      = wrap((req) => admin.adminDeleteScore(req.params.id))
