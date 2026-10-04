export function successResponse(message, data = null) {
  return { success: true, message, data }
}

export function failureResponse(message, data = null) {
  return { success: false, message, data }
}
