import {
  checkAndAwardAchievements,
  getAllAchievements,
  getUserAchievements,
} from '../services/achievementService.js'
import { successResponse } from '../utils/apiResponse.js'

export async function listAchievements(request, response, next) {
  try {
    const data = await getAllAchievements()
    response.status(200).json(successResponse('Achievements retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}

export async function myAchievements(request, response, next) {
  try {
    const data = await getUserAchievements(request.user.id)
    response.status(200).json(successResponse('User achievements retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}

export async function checkAchievements(request, response, next) {
  try {
    const newlyUnlocked = await checkAndAwardAchievements(request.user.id)
    response.status(200).json(
      successResponse('Achievement check complete', { newlyUnlocked }),
    )
  } catch (error) {
    next(error)
  }
}
