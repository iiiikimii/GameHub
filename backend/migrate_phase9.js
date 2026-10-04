import pool from './config/database.js'

async function main() {
  try {
    await pool.query(`
      INSERT IGNORE INTO achievements
        (name, description, icon, requirement_type, requirement_value)
      VALUES
        ('Champion',     'Reach the Top 3 on the global leaderboard.', 'trophy',   'global_rank_top3', 1),
        ('Daily Player', 'Play on 7 different days in the last 30 days.', 'calendar', 'daily_player',     7)
    `)
    const [rows] = await pool.query('SELECT id, name FROM achievements ORDER BY id')
    console.log('✓ Achievements in DB:')
    rows.forEach((r) => console.log(`  ${r.id}. ${r.name}`))
  } catch (err) {
    console.error('Migration error:', err.message)
  } finally {
    process.exit(0)
  }
}

main()
