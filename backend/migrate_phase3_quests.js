import pool from './config/database.js'

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
     LIMIT 1`,
    [tableName, columnName],
  )
  return rows.length > 0
}

async function indexExists(connection, tableName, indexName) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
     LIMIT 1`,
    [tableName, indexName],
  )
  return rows.length > 0
}

async function migrate() {
  console.log('--- Migrating Quest & Progression Schema ---')
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    // 1. Add columns individually so a partially applied migration can rerun.
    const progressionColumns = {
      xp: 'BIGINT UNSIGNED NOT NULL DEFAULT 0',
      level: 'INT UNSIGNED NOT NULL DEFAULT 1',
      selected_title: 'VARCHAR(100) DEFAULT NULL',
      selected_frame: 'VARCHAR(100) DEFAULT NULL',
    }
    for (const [columnName, definition] of Object.entries(progressionColumns)) {
      if (!(await columnExists(conn, 'users', columnName))) {
        console.log(`Adding users.${columnName}...`)
        await conn.query(`ALTER TABLE users ADD COLUMN ${columnName} ${definition}`)
      }
    }
    for (const [indexName, columnName] of [['idx_users_xp', 'xp'], ['idx_users_level', 'level']]) {
      if (!(await indexExists(conn, 'users', indexName))) {
        await conn.query(`ALTER TABLE users ADD KEY ${indexName} (${columnName})`)
      }
    }

    // 2. Create quests table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS quests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        quest_key VARCHAR(100) NOT NULL,
        title VARCHAR(150) NOT NULL,
        description VARCHAR(500) NOT NULL,
        quest_type ENUM('DAILY', 'WEEKLY', 'SPECIAL') NOT NULL,
        game_id BIGINT UNSIGNED DEFAULT NULL,
        requirement_type ENUM('PLAY_GAMES', 'ACCUMULATE_SCORE', 'SINGLE_SCORE', 'PLAY_DIFFERENT_GAMES', 'PLAY_TIME') NOT NULL,
        requirement_target INT UNSIGNED NOT NULL,
        xp_reward INT UNSIGNED NOT NULL DEFAULT 50,
        bonus_score_reward INT UNSIGNED NOT NULL DEFAULT 0,
        badge_reward VARCHAR(100) DEFAULT NULL,
        cosmetic_reward_type ENUM('NONE', 'TITLE', 'FRAME', 'BADGE') NOT NULL DEFAULT 'NONE',
        cosmetic_reward_value VARCHAR(100) DEFAULT NULL,
        cosmetic_reward_label VARCHAR(150) DEFAULT NULL,
        start_date DATETIME(3) DEFAULT NULL,
        end_date DATETIME(3) DEFAULT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_quests_key (quest_key),
        KEY idx_quests_type_active (quest_type, is_active),
        KEY idx_quests_game (game_id),
        CONSTRAINT fk_quests_game
          FOREIGN KEY (game_id) REFERENCES games (id)
          ON UPDATE CASCADE ON DELETE SET NULL
      ) ENGINE=InnoDB
    `)

    // 3. Create user_quests table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_quests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        quest_id BIGINT UNSIGNED NOT NULL,
        period_key VARCHAR(50) NOT NULL COMMENT 'e.g. 2026-10-11, 2026-W41, or EVENT-KEY',
        progress INT UNSIGNED NOT NULL DEFAULT 0,
        target INT UNSIGNED NOT NULL,
        is_completed TINYINT(1) NOT NULL DEFAULT 0,
        completed_at DATETIME(3) DEFAULT NULL,
        is_claimed TINYINT(1) NOT NULL DEFAULT 0,
        claimed_at DATETIME(3) DEFAULT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_quest_period (user_id, quest_id, period_key),
        KEY idx_user_quests_user_status (user_id, is_completed, is_claimed),
        KEY idx_user_quests_period (user_id, period_key),
        CONSTRAINT fk_user_quests_user
          FOREIGN KEY (user_id) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_user_quests_quest
          FOREIGN KEY (quest_id) REFERENCES quests (id)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)

    // 4. Create quest_session_logs table for idempotency
    await conn.query(`
      CREATE TABLE IF NOT EXISTS quest_session_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        session_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        processed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_quest_session (session_id),
        KEY idx_quest_session_user (user_id),
        CONSTRAINT fk_qsl_session
          FOREIGN KEY (session_id) REFERENCES game_sessions (id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_qsl_user
          FOREIGN KEY (user_id) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)

    // 5. Create xp_transactions table for consistent audit trail
    await conn.query(`
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        amount INT NOT NULL,
        source_type ENUM('GAME_SESSION', 'QUEST_REWARD', 'RANKED_REWARD', 'CHALLENGE_REWARD', 'ACHIEVEMENT_REWARD', 'ADMIN_ADJUSTMENT') NOT NULL,
        source_id BIGINT UNSIGNED DEFAULT NULL,
        description VARCHAR(255) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY idx_xp_tx_user_created (user_id, created_at),
        CONSTRAINT fk_xp_tx_user
          FOREIGN KEY (user_id) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)

    // 6. Create user_cosmetics table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_cosmetics (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        cosmetic_type ENUM('TITLE', 'FRAME', 'BADGE') NOT NULL,
        cosmetic_value VARCHAR(100) NOT NULL,
        label VARCHAR(150) NOT NULL,
        icon VARCHAR(50) DEFAULT NULL,
        unlocked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_cosmetic (user_id, cosmetic_type, cosmetic_value),
        KEY idx_user_cosmetics_user (user_id, cosmetic_type),
        CONSTRAINT fk_user_cosmetics_user
          FOREIGN KEY (user_id) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)

    // 7. Seed Initial Quests
    const questsToSeed = [
      // --- DAILY QUESTS ---
      {
        quest_key: 'daily_warmup',
        title: 'Daily Warmup',
        description: 'Mainkan minimal 1 sesi game apa saja hari ini.',
        quest_type: 'DAILY',
        game_slug: null,
        requirement_type: 'PLAY_GAMES',
        requirement_target: 1,
        xp_reward: 50,
        bonus_score_reward: 50,
        badge_reward: null,
        cosmetic_reward_type: 'NONE',
        cosmetic_reward_value: null,
        cosmetic_reward_label: null,
      },
      {
        quest_key: 'daily_reflex_check',
        title: 'Reflex Check',
        description: 'Capai skor minimal 700 dalam satu sesi Reaction Test.',
        quest_type: 'DAILY',
        game_slug: 'reaction-test',
        requirement_type: 'SINGLE_SCORE',
        requirement_target: 700,
        xp_reward: 80,
        bonus_score_reward: 100,
        badge_reward: null,
        cosmetic_reward_type: 'NONE',
        cosmetic_reward_value: null,
        cosmetic_reward_label: null,
      },
      {
        quest_key: 'daily_score_hunter',
        title: 'Score Hunter',
        description: 'Kumpulkan total akumulasi skor 2.000 poin di berbagai game hari ini.',
        quest_type: 'DAILY',
        game_slug: null,
        requirement_type: 'ACCUMULATE_SCORE',
        requirement_target: 2000,
        xp_reward: 100,
        bonus_score_reward: 150,
        badge_reward: null,
        cosmetic_reward_type: 'TITLE',
        cosmetic_reward_value: 'Score Hunter',
        cosmetic_reward_label: 'Title: Score Hunter',
      },

      // --- WEEKLY QUESTS ---
      {
        quest_key: 'weekly_game_marathon',
        title: 'Arcade Marathon',
        description: 'Selesaikan 10 sesi permainan sepanjang minggu ini.',
        quest_type: 'WEEKLY',
        game_slug: null,
        requirement_type: 'PLAY_GAMES',
        requirement_target: 10,
        xp_reward: 250,
        bonus_score_reward: 300,
        badge_reward: 'Marathon Runner',
        cosmetic_reward_type: 'BADGE',
        cosmetic_reward_value: 'marathon_runner',
        cosmetic_reward_label: 'Badge: Marathon Runner',
      },
      {
        quest_key: 'weekly_variety_master',
        title: 'Versatile Challenger',
        description: 'Mainkan 3 game berbeda (Reaction Test, Number Rush, Memory Match) minggu ini.',
        quest_type: 'WEEKLY',
        game_slug: null,
        requirement_type: 'PLAY_DIFFERENT_GAMES',
        requirement_target: 3,
        xp_reward: 300,
        bonus_score_reward: 400,
        badge_reward: 'Versatile',
        cosmetic_reward_type: 'FRAME',
        cosmetic_reward_value: 'frame_cyber_lime',
        cosmetic_reward_label: 'Profile Frame: Cyber Lime Neon',
      },
      {
        quest_key: 'weekly_memory_rush',
        title: 'Mind & Memory Peak',
        description: 'Capai skor minimal 1.000 dalam Number Rush.',
        quest_type: 'WEEKLY',
        game_slug: 'number-rush',
        requirement_type: 'SINGLE_SCORE',
        requirement_target: 1000,
        xp_reward: 350,
        bonus_score_reward: 500,
        badge_reward: null,
        cosmetic_reward_type: 'TITLE',
        cosmetic_reward_value: 'Grand Tactician',
        cosmetic_reward_label: 'Title: Grand Tactician',
      },

      // --- SPECIAL / EVENT QUESTS ---
      {
        quest_key: 'event_cyber_kickoff',
        title: 'GameHub Genesis Event',
        description: 'Event spesial peluncuran: Raih skor minimal 850 dalam Reaction Test.',
        quest_type: 'SPECIAL',
        game_slug: 'reaction-test',
        requirement_type: 'SINGLE_SCORE',
        requirement_target: 850,
        xp_reward: 500,
        bonus_score_reward: 750,
        badge_reward: 'Genesis Champion',
        cosmetic_reward_type: 'FRAME',
        cosmetic_reward_value: 'frame_genesis_gold',
        cosmetic_reward_label: 'Profile Frame: Genesis Gold',
        start_date: new Date('2026-01-01T00:00:00Z'),
        end_date: new Date('2026-12-31T23:59:59Z'),
      },
      {
        quest_key: 'event_endurance_pro',
        title: 'Endurance Pioneer',
        description: 'Akumulasikan total waktu bermain 180 detik di mini game.',
        quest_type: 'SPECIAL',
        game_slug: null,
        requirement_type: 'PLAY_TIME',
        requirement_target: 180,
        xp_reward: 400,
        bonus_score_reward: 500,
        badge_reward: 'Time Weaver',
        cosmetic_reward_type: 'TITLE',
        cosmetic_reward_value: 'Pioneer',
        cosmetic_reward_label: 'Title: Pioneer',
        start_date: new Date('2026-01-01T00:00:00Z'),
        end_date: new Date('2026-12-31T23:59:59Z'),
      },
    ]

    const [gameRows] = await conn.query('SELECT id, slug FROM games')
    const gameIdsBySlug = new Map(gameRows.map((game) => [game.slug, game.id]))

    for (const q of questsToSeed) {
      const gameId = q.game_slug ? gameIdsBySlug.get(q.game_slug) : null
      if (q.game_slug && !gameId) {
        throw new Error(`Cannot seed quest ${q.quest_key}: game ${q.game_slug} does not exist`)
      }
      await conn.query(
        `INSERT INTO quests
          (quest_key, title, description, quest_type, game_id, requirement_type,
           requirement_target, xp_reward, bonus_score_reward, badge_reward,
           cosmetic_reward_type, cosmetic_reward_value, cosmetic_reward_label,
           start_date, end_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           description = VALUES(description),
           quest_type = VALUES(quest_type),
           game_id = VALUES(game_id),
           requirement_type = VALUES(requirement_type),
           requirement_target = VALUES(requirement_target),
           xp_reward = VALUES(xp_reward),
           bonus_score_reward = VALUES(bonus_score_reward),
           badge_reward = VALUES(badge_reward),
           cosmetic_reward_type = VALUES(cosmetic_reward_type),
           cosmetic_reward_value = VALUES(cosmetic_reward_value),
           cosmetic_reward_label = VALUES(cosmetic_reward_label),
           start_date = VALUES(start_date),
           end_date = VALUES(end_date)`,
        [
          q.quest_key,
          q.title,
          q.description,
          q.quest_type,
          gameId,
          q.requirement_type,
          q.requirement_target,
          q.xp_reward,
          q.bonus_score_reward,
          q.badge_reward,
          q.cosmetic_reward_type,
          q.cosmetic_reward_value,
          q.cosmetic_reward_label,
          q.start_date || null,
          q.end_date || null,
        ],
      )
    }

    await conn.commit()
    console.log('✓ Migration successfully completed!')
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
