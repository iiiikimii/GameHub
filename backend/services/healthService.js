import { checkDatabaseConnection } from '../config/database.js'

export async function getHealthStatus() {
  await checkDatabaseConnection()

  return {
    status: 'ok',
    database: 'connected',
  }
}
