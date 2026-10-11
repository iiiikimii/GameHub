import pool from './config/database.js'

async function hasColumn(table, column) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column],
  )
  return rows.length > 0
}

async function hasIndex(table, index) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
     LIMIT 1`,
    [table, index],
  )
  return rows.length > 0
}

async function migrate() {
  try {
    if (!(await hasColumn('users', 'is_active'))) {
      await pool.query(
        'ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role',
      )
    }

    if (!(await hasColumn('scores', 'submission_key'))) {
      await pool.query(
        "ALTER TABLE scores ADD COLUMN submission_key CHAR(36) DEFAULT NULL COMMENT 'Idempotency key for one completed game attempt' AFTER game_id",
      )
    }

    if (!(await hasIndex('scores', 'uq_scores_user_submission'))) {
      await pool.query(
        'ALTER TABLE scores ADD UNIQUE KEY uq_scores_user_submission (user_id, submission_key)',
      )
    }

    console.log('Phase 1 stability migration completed.')
  } catch (error) {
    console.error(`Phase 1 stability migration failed: ${error.message}`)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

await migrate()
