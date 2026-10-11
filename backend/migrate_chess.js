import pool from './config/database.js'

async function migrateChess() {
  const connection = await pool.getConnection()
  try {
    // These CREATE TABLE statements are additive and safe to rerun.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chess_rooms (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        room_code CHAR(10) NOT NULL,
        host_id BIGINT UNSIGNED NOT NULL,
        guest_id BIGINT UNSIGNED DEFAULT NULL,
        status ENUM('WAITING', 'ACTIVE', 'COMPLETED', 'DECLINED', 'EXPIRED', 'ABANDONED') NOT NULL DEFAULT 'WAITING',
        fen VARCHAR(120) NOT NULL,
        pgn MEDIUMTEXT NOT NULL,
        ply INT UNSIGNED NOT NULL DEFAULT 0,
        draw_offer_by BIGINT UNSIGNED DEFAULT NULL,
        result ENUM('WHITE_WIN', 'BLACK_WIN', 'DRAW') DEFAULT NULL,
        termination ENUM('CHECKMATE', 'STALEMATE', 'DRAW_RULE', 'RESIGNATION', 'AGREED_DRAW', 'ABANDONED') DEFAULT NULL,
        expires_at DATETIME(3) DEFAULT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        started_at DATETIME(3) DEFAULT NULL,
        completed_at DATETIME(3) DEFAULT NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_chess_room_code (room_code),
        KEY idx_chess_room_host_status (host_id, status, updated_at),
        KEY idx_chess_room_guest_status (guest_id, status, updated_at),
        CONSTRAINT fk_chess_room_host FOREIGN KEY (host_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_chess_room_guest FOREIGN KEY (guest_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_chess_room_draw_offer FOREIGN KEY (draw_offer_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
      ) ENGINE=InnoDB
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS chess_invitations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        room_id BIGINT UNSIGNED NOT NULL,
        inviter_id BIGINT UNSIGNED NOT NULL,
        invitee_id BIGINT UNSIGNED NOT NULL,
        status ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
        expires_at DATETIME(3) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        responded_at DATETIME(3) DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_chess_invitation_room_invitee (room_id, invitee_id),
        KEY idx_chess_invitation_inbox (invitee_id, status, expires_at, created_at),
        KEY idx_chess_invitation_outbox (inviter_id, status, created_at),
        CONSTRAINT fk_chess_invitation_room FOREIGN KEY (room_id) REFERENCES chess_rooms (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_chess_invitation_inviter FOREIGN KEY (inviter_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_chess_invitation_invitee FOREIGN KEY (invitee_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS chess_moves (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        room_id BIGINT UNSIGNED NOT NULL,
        ply INT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        from_square CHAR(2) NOT NULL,
        to_square CHAR(2) NOT NULL,
        promotion CHAR(1) DEFAULT NULL,
        san VARCHAR(16) NOT NULL,
        fen_after VARCHAR(120) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_chess_move_ply (room_id, ply),
        CONSTRAINT fk_chess_move_room FOREIGN KEY (room_id) REFERENCES chess_rooms (id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_chess_move_user FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)

    console.log('Chess migration completed (rooms, invitations, and moves).')
  } catch (error) {
    console.error('Chess migration failed:', error.message)
    throw error
  } finally {
    connection.release()
    await pool.end()
  }
}

migrateChess().catch((error) => {
  console.error('Chess migration could not acquire a database connection:', error.message)
  process.exitCode = 1
})
