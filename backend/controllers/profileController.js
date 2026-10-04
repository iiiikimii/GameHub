import { getProfile, updateProfile } from '../services/profileService.js'
import { successResponse } from '../utils/apiResponse.js'

export async function showProfile(request, response, next) {
  try {
    const data = await getProfile(request.user.id)
    response.status(200).json(successResponse('Profile retrieved successfully', data))
  } catch (error) {
    next(error)
  }
}

export async function editProfile(request, response, next) {
  try {
    const data = await updateProfile(request.user.id, request.body)
    response.status(200).json(successResponse('Profile updated successfully', data))
  } catch (error) {
    next(error)
  }
}
