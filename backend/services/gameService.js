import pool from '../config/database.js'

export async function getAllGames() {
  const [rows] = await pool.execute(
    `SELECT id, name, slug, description, category, difficulty, thumbnail, is_active, created_at
     FROM games
     ORDER BY is_active DESC, category ASC, id ASC`,
  )
  return rows
}

export async function getGameBySlug(slug) {
  const [rows] = await pool.execute(
    `SELECT id, name, slug, description, category, difficulty, thumbnail, is_active, created_at
     FROM games
     WHERE slug = ?
     LIMIT 1`,
    [slug],
  )
  return rows[0] ?? null
}
