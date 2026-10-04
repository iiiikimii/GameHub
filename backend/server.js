import pool, { checkDatabaseConnection } from './config/database.js'
import app from './app.js'

const port = Number(process.env.PORT || 5000)

try {
  await checkDatabaseConnection()
  console.log('MySQL database connection established')

  app.listen(port, () => {
    console.log(`GameHub API listening on http://localhost:${port}`)
  })
} catch (error) {
  const reason = error.message || 'No error message returned by the MySQL driver'
  console.error(`Unable to connect to MySQL (${error.code || 'UNKNOWN'}): ${reason}`)
  await pool.end()
  process.exitCode = 1
}
