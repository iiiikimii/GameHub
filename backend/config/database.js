import './env.js'
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gamehub',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
})

export async function checkDatabaseConnection() {
  const [rows] = await pool.query('SELECT 1 AS connected')

  if (rows[0]?.connected !== 1) {
    throw new Error('MySQL connection test returned an unexpected result')
  }
}

export default pool
