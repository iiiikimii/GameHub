import pool from './config/database.js'

async function migrate() {
  console.log('--- Migrating Ranked System & Season Schema ---')
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    // 1. Create ranked_seasons table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ranked_seasons (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        season_number INT UNSIGNED NOT NULL,
        title VARCHAR(100) NOT NULL,
        description VARCHAR(500) NOT NULL,
        start_date DATETIME(3) NOT NULL,
        end_date DATETIME(3) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_season_number (season_number),
        KEY idx_seasons_active (is_active, start_date, end_date)
      ) ENGINE=InnoDB
    `)

    // 2. Create user_season_ranks table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_season_ranks (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        season_id BIGINT UNSIGNED NOT NULL,
        tier ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND') NOT NULL DEFAULT 'BRONZE',
        rp INT UNSIGNED NOT NULL DEFAULT 0,
        peak_rp INT UNSIGNED NOT NULL DEFAULT 0,
        matches_played INT UNSIGNED NOT NULL DEFAULT 0,
        wins INT UNSIGNED NOT NULL DEFAULT 0,
        losses INT UNSIGNED NOT NULL DEFAULT 0,
        reward_claimed TINYINT(1) NOT NULL DEFAULT 0,
        claimed_at DATETIME(3) DEFAULT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_season (user_id, season_id),
        KEY idx_usr_season_rp (season_id, rp DESC, peak_rp DESC, user_id ASC),
        KEY idx_usr_user (user_id),
        CONSTRAINT fk_usr_user
          FOREIGN KEY (user_id) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_usr_season
          FOREIGN KEY (season_id) REFERENCES ranked_seasons (id)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)

    // 3. Create ranked_matches table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ranked_matches (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        season_id BIGINT UNSIGNED NOT NULL,
        session_id BIGINT UNSIGNED NOT NULL,
        game_id BIGINT UNSIGNED NOT NULL,
        score INT UNSIGNED NOT NULL,
        duration DECIMAL(8,3) UNSIGNED NOT NULL,
        rp_change INT NOT NULL,
        rp_before INT UNSIGNED NOT NULL,
        rp_after INT UNSIGNED NOT NULL,
        result ENUM('WIN', 'DRAW', 'LOSS') NOT NULL,
        tier_before ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND') NOT NULL,
        tier_after ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND') NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_ranked_session (session_id),
        KEY idx_rm_user_season (user_id, season_id, created_at DESC),
        KEY idx_rm_season (season_id),
        CONSTRAINT fk_rm_user
          FOREIGN KEY (user_id) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_rm_season
          FOREIGN KEY (season_id) REFERENCES ranked_seasons (id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_rm_session
          FOREIGN KEY (session_id) REFERENCES game_sessions (id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_rm_game
          FOREIGN KEY (game_id) REFERENCES games (id)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)

    // 4. Create season_rewards table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS season_rewards (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        season_id BIGINT UNSIGNED NOT NULL,
        min_tier ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND') NOT NULL,
        reward_badge VARCHAR(100) DEFAULT NULL,
        reward_title VARCHAR(100) DEFAULT NULL,
        reward_frame VARCHAR(100) DEFAULT NULL,
        bonus_score INT UNSIGNED NOT NULL DEFAULT 0,
        xp_reward INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_season_tier_reward (season_id, min_tier),
        CONSTRAINT fk_sr_season
          FOREIGN KEY (season_id) REFERENCES ranked_seasons (id)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)

    // XP rewards have their own audit source, separate from quests/challenges.
    const [xpColumns] = await conn.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'xp_transactions'
         AND COLUMN_NAME = 'source_type' LIMIT 1`,
    )
    if (xpColumns[0] && !xpColumns[0].COLUMN_TYPE.includes('RANKED_REWARD')) {
      await conn.query(`
        ALTER TABLE xp_transactions
        MODIFY COLUMN source_type ENUM(
          'GAME_SESSION', 'QUEST_REWARD', 'RANKED_REWARD', 'CHALLENGE_REWARD',
          'ACHIEVEMENT_REWARD', 'ADMIN_ADJUSTMENT'
        ) NOT NULL
      `)
    }

    // 6. Seed the initial season only when absent. Later schedules and
    // historical season rows remain database-managed and are never reset here.
    const now = new Date()
    const s1Start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
    const s1End = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))

    await conn.query(`
      INSERT IGNORE INTO ranked_seasons (season_number, title, description, start_date, end_date, is_active)
      VALUES 
        (1, 'Season 1: Cyber Genesis', 'Musim kompetisi perdana GameHub. Tunjukkan keahlianmu dan raih tier Diamond!', ?, ?, 1)
    `, [s1Start, s1End])

    // Get Season 1 ID
    const [s1Rows] = await conn.query('SELECT id FROM ranked_seasons WHERE season_number = 1 LIMIT 1')
    const s1Id = s1Rows[0].id

    // Seed Tier Rewards for Season 1
    const tierRewards = [
      { tier: 'BRONZE', badge: 'S1 Bronze Participant', title: null, frame: null, bonus_score: 100, xp: 150 },
      { tier: 'SILVER', badge: 'S1 Silver Contender', title: 'Silver Competitor', frame: null, bonus_score: 300, xp: 350 },
      { tier: 'GOLD', badge: 'S1 Gold Gladiator', title: 'Gold Champion', frame: null, bonus_score: 600, xp: 700 },
      { tier: 'PLATINUM', badge: 'S1 Platinum Warlord', title: 'Platinum Tactician', frame: 'frame_cyber_lime', bonus_score: 1200, xp: 1500 },
      { tier: 'DIAMOND', badge: 'S1 Diamond Legend', title: 'Diamond Apex', frame: 'frame_genesis_gold', bonus_score: 2500, xp: 3000 },
    ]

    for (const r of tierRewards) {
      await conn.query(`
        INSERT IGNORE INTO season_rewards (season_id, min_tier, reward_badge, reward_title, reward_frame, bonus_score, xp_reward)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [s1Id, r.tier, r.badge, r.title, r.frame, r.bonus_score, r.xp])
    }

    await conn.commit()
    console.log('✓ Ranked migration successfully completed!')
  } catch (err) {
    await conn.rollback()
    console.error('Migration failed:', err)
    throw err
  } finally {
    conn.release()
    await pool.end()
  }
}

migrate().catch(() => {
  process.exitCode = 1
})
