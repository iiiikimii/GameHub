import pool from './config/database.js'

async function migrate() {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_low_id BIGINT UNSIGNED NOT NULL,
        user_high_id BIGINT UNSIGNED NOT NULL,
        requester_id BIGINT UNSIGNED NOT NULL,
        recipient_id BIGINT UNSIGNED NOT NULL,
        status ENUM('PENDING', 'ACCEPTED') NOT NULL DEFAULT 'PENDING',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        accepted_at DATETIME(3) DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_friendship_pair (user_low_id, user_high_id),
        KEY idx_friendship_recipient_status (recipient_id, status, created_at),
        KEY idx_friendship_requester_status (requester_id, status, created_at),
        CONSTRAINT fk_friendship_low FOREIGN KEY (user_low_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_friendship_high FOREIGN KEY (user_high_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_friendship_requester FOREIGN KEY (requester_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_friendship_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        blocker_id BIGINT UNSIGNED NOT NULL,
        blocked_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (blocker_id, blocked_id),
        KEY idx_user_blocks_blocked (blocked_id, blocker_id),
        CONSTRAINT fk_user_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_user_blocks_blocked FOREIGN KEY (blocked_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        actor_id BIGINT UNSIGNED NOT NULL,
        activity_type ENUM('PERSONAL_BEST', 'ACHIEVEMENT_UNLOCKED') NOT NULL,
        game_id BIGINT UNSIGNED DEFAULT NULL,
        achievement_id BIGINT UNSIGNED DEFAULT NULL,
        score_id BIGINT UNSIGNED DEFAULT NULL,
        source_key VARCHAR(100) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_activity_source (actor_id, activity_type, source_key),
        KEY idx_activities_actor_created (actor_id, created_at, id),
        CONSTRAINT fk_activities_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_activities_game FOREIGN KEY (game_id) REFERENCES games (id) ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT fk_activities_achievement FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT fk_activities_score FOREIGN KEY (score_id) REFERENCES scores (id) ON UPDATE CASCADE ON DELETE SET NULL
      ) ENGINE=InnoDB
    `)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        recipient_id BIGINT UNSIGNED NOT NULL,
        actor_id BIGINT UNSIGNED DEFAULT NULL,
        notification_type ENUM('FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'FRIEND_ACTIVITY') NOT NULL,
        friendship_id BIGINT UNSIGNED DEFAULT NULL,
        activity_id BIGINT UNSIGNED DEFAULT NULL,
        read_at DATETIME(3) DEFAULT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY idx_notifications_recipient_created (recipient_id, created_at, id),
        KEY idx_notifications_unread (recipient_id, read_at, created_at),
        CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT fk_notifications_friendship FOREIGN KEY (friendship_id) REFERENCES friendships (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_notifications_activity FOREIGN KEY (activity_id) REFERENCES activities (id) ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)
    await connection.commit()
    console.log('Social migration completed (friendships, blocks, activities, notifications).')
  } catch (error) {
    await connection.rollback()
    console.error('Social migration failed:', error.message)
    throw error
  } finally {
    connection.release()
    await pool.end()
  }
}

migrate().catch((error) => {
  console.error('Social migration could not acquire a database connection:', error.message)
  process.exitCode = 1
})
