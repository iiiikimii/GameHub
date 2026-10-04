import { loginUser, registerUser } from '../services/authService.js'
import { successResponse } from '../utils/apiResponse.js'

export async function register(request, response, next) {
  try {
    const data = await registerUser(request.body)
    response.status(201).json(successResponse('Account registered successfully', data))
  } catch (error) {
    next(error)
  }
}

export async function login(request, response, next) {
  try {
    const data = await loginUser(request.body)
    response.status(200).json(successResponse('Login successful', data))
  } catch (error) {
    next(error)
  }
}

export function getCurrentUser(request, response) {
  response.status(200).json(
    successResponse('Current user retrieved successfully', { user: request.user }),
  )
}
