export function apiErrorMessage(error, fallback) {
  const serverMessage = error?.response?.data?.message
  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage

  if (error?.code === 'ERR_NETWORK' || (error?.request && !error?.response)) {
    return 'Tidak dapat terhubung ke server GameHub. Pastikan backend berjalan, lalu coba lagi.'
  }

  return fallback
}
