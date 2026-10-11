CREATE DATABASE IF NOT EXISTS gamehub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gamehub;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) DEFAULT NULL
    COMMENT 'Store hashes only; NULL is used for sample accounts',
  avatar VARCHAR(2048) DEFAULT NULL,
  role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  total_score BIGINT UNSIGNED NOT NULL DEFAULT 0,
  xp BIGINT UNSIGNED NOT NULL DEFAULT 0,
  level INT UNSIGNED NOT NULL DEFAULT 1,
  selected_title VARCHAR(100) DEFAULT NULL,
  selected_frame VARCHAR(100) DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_total_score (total_score, id),
  KEY idx_users_xp (xp),
  KEY idx_users_level (level),
  KEY idx_users_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS games (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  description TEXT DEFAULT NULL,
  category VARCHAR(50) NOT NULL,
  difficulty ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
  thumbnail VARCHAR(2048) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_games_slug (slug),
  KEY idx_games_active_category (is_active, category)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS scores (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  game_id BIGINT UNSIGNED NOT NULL,
  submission_key CHAR(36) DEFAULT NULL COMMENT 'Client-generated idempotency key for one completed game attempt',
  score INT UNSIGNED NOT NULL,
  duration DECIMAL(8,3) UNSIGNED NOT NULL COMMENT 'Duration in seconds',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_scores_user_submission (user_id, submission_key),
  KEY idx_scores_user_created (user_id, created_at),
  KEY idx_scores_game_score (game_id, score),
  KEY idx_scores_created_at (created_at),
  CONSTRAINT fk_scores_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_scores_game
    FOREIGN KEY (game_id) REFERENCES games (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS achievements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL,
  icon VARCHAR(100) DEFAULT NULL,
  requirement_type VARCHAR(50) NOT NULL,
  requirement_value BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_achievements_name (name),
  KEY idx_achievements_requirement (requirement_type, requirement_value)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  achievement_id BIGINT UNSIGNED NOT NULL,
  unlocked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_achievements_pair (user_id, achievement_id),
  KEY idx_user_achievements_achievement (achievement_id),
  CONSTRAINT fk_user_achievements_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_user_achievements_achievement
    FOREIGN KEY (achievement_id) REFERENCES achievements (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS challenges (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  description VARCHAR(500) NOT NULL,
  game_id BIGINT UNSIGNED DEFAULT NULL,
  target_score INT UNSIGNED NOT NULL,
  reward_points INT UNSIGNED NOT NULL DEFAULT 0,
  start_date DATETIME(3) NOT NULL,
  end_date DATETIME(3) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_challenges_title_start (title, start_date),
  KEY idx_challenges_active_dates (is_active, start_date, end_date),
  KEY idx_challenges_game (game_id),
  CONSTRAINT fk_challenges_game
    FOREIGN KEY (game_id) REFERENCES games (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS challenge_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  challenge_id BIGINT UNSIGNED NOT NULL,
  progress INT UNSIGNED NOT NULL DEFAULT 0,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME(3) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_challenge_progress_pair (user_id, challenge_id),
  KEY idx_challenge_progress_challenge (challenge_id, completed),
  CONSTRAINT fk_challenge_progress_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_challenge_progress_challenge
    FOREIGN KEY (challenge_id) REFERENCES challenges (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS game_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  game_id BIGINT UNSIGNED NOT NULL,
  score INT UNSIGNED NOT NULL DEFAULT 0,
  duration DECIMAL(8,3) UNSIGNED NOT NULL COMMENT 'Duration in seconds',
  played_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_game_sessions_user_played (user_id, played_at),
  KEY idx_game_sessions_game_score (game_id, score),
  CONSTRAINT fk_game_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_game_sessions_game
    FOREIGN KEY (game_id) REFERENCES games (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_quests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  quest_id BIGINT UNSIGNED NOT NULL,
  period_key VARCHAR(50) NOT NULL COMMENT 'UTC daily YYYY-MM-DD, ISO week YYYY-Www, or EVENT-quest-key',
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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id BIGINT UNSIGNED NOT NULL,
  blocked_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (blocker_id, blocked_id),
  KEY idx_user_blocks_blocked (blocked_id, blocker_id),
  CONSTRAINT fk_user_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_user_blocks_blocked FOREIGN KEY (blocked_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

START TRANSACTION;

INSERT IGNORE INTO users
  (id, username, email, password_hash, role, total_score)
VALUES
  (1, 'pixelpilot', 'pixelpilot@example.test', NULL, 'USER', 1880),
  (2, 'kimi', 'kimi@example.test', NULL, 'USER', 2280),
  (3, 'shadow', 'shadow@example.test', NULL, 'USER', 860),
  (4, 'alice', 'alice@example.test', NULL, 'USER', 700);

INSERT IGNORE INTO games
  (id, name, slug, description, category, difficulty, is_active)
VALUES
  (1, 'Reaction Test', 'reaction-test', 'Test how quickly you can react.', 'Reflex', 'EASY', 1),
  (2, 'Number Rush', 'number-rush', 'Select numbers in ascending order.', 'Puzzle', 'MEDIUM', 1),
  (3, 'Memory Match', 'memory-match', 'Match pairs of hidden cards.', 'Memory', 'MEDIUM', 1);

INSERT IGNORE INTO achievements
  (id, name, description, icon, requirement_type, requirement_value)
VALUES
  (1, 'First Game', 'Play your first game.', 'gamepad', 'games_played', 1),
  (2, 'Getting Started', 'Reach 1,000 total points.', 'sparkles', 'total_score', 1000),
  (3, 'Speed Demon', 'Get a reaction time below 250ms.', 'bolt', 'reaction_time_ms', 250),
  (4, 'Dedicated', 'Play 100 games.', 'trophy', 'games_played', 100),
  (5, 'Memory Master', 'Complete Memory Match on Hard.', 'brain', 'memory_match_hard', 1);

INSERT IGNORE INTO challenges
  (id, title, description, game_id, target_score, reward_points, start_date, end_date, is_active)
VALUES
  (1, 'Reaction Warmup', 'Reach a score of 800 in Reaction Test.', 1, 800, 250, UTC_TIMESTAMP(3) - INTERVAL 1 DAY, UTC_TIMESTAMP(3) + INTERVAL 6 DAY, 1),
  (2, 'Number Sprint', 'Reach a score of 900 in Number Rush.', 2, 900, 300, UTC_TIMESTAMP(3) - INTERVAL 1 DAY, UTC_TIMESTAMP(3) + INTERVAL 6 DAY, 1),
  (3, 'Memory Session', 'Reach a score of 1,000 in Memory Match.', 3, 1000, 350, UTC_TIMESTAMP(3) - INTERVAL 1 DAY, UTC_TIMESTAMP(3) + INTERVAL 6 DAY, 1);

INSERT IGNORE INTO scores (id, user_id, game_id, score, duration, created_at)
VALUES
  (1, 1, 1, 920, 0.245, UTC_TIMESTAMP(3) - INTERVAL 3 HOUR),
  (2, 1, 2, 960, 28.150, UTC_TIMESTAMP(3) - INTERVAL 2 HOUR),
  (3, 2, 2, 1080, 21.540, UTC_TIMESTAMP(3) - INTERVAL 5 HOUR),
  (4, 2, 3, 1200, 37.800, UTC_TIMESTAMP(3) - INTERVAL 4 HOUR),
  (5, 3, 3, 860, 43.200, UTC_TIMESTAMP(3) - INTERVAL 1 DAY),
  (6, 4, 1, 700, 0.315, UTC_TIMESTAMP(3) - INTERVAL 2 DAY);

INSERT IGNORE INTO user_achievements (id, user_id, achievement_id, unlocked_at)
VALUES
  (1, 1, 1, UTC_TIMESTAMP(3) - INTERVAL 2 HOUR),
  (2, 2, 1, UTC_TIMESTAMP(3) - INTERVAL 4 HOUR),
  (3, 2, 2, UTC_TIMESTAMP(3) - INTERVAL 3 HOUR);

INSERT IGNORE INTO challenge_progress
  (id, user_id, challenge_id, progress, completed, completed_at)
VALUES
  (1, 1, 1, 920, 1, UTC_TIMESTAMP(3) - INTERVAL 3 HOUR),
  (2, 2, 1, 640, 0, NULL),
  (3, 2, 2, 1080, 1, UTC_TIMESTAMP(3) - INTERVAL 5 HOUR);

INSERT IGNORE INTO game_sessions (id, user_id, game_id, score, duration, played_at)
VALUES
  (1, 1, 1, 920, 0.245, UTC_TIMESTAMP(3) - INTERVAL 3 HOUR),
  (2, 1, 2, 960, 28.150, UTC_TIMESTAMP(3) - INTERVAL 2 HOUR),
  (3, 2, 2, 1080, 21.540, UTC_TIMESTAMP(3) - INTERVAL 5 HOUR),
  (4, 2, 3, 1200, 37.800, UTC_TIMESTAMP(3) - INTERVAL 4 HOUR),
  (5, 3, 3, 860, 43.200, UTC_TIMESTAMP(3) - INTERVAL 1 DAY),
  (6, 4, 1, 700, 0.315, UTC_TIMESTAMP(3) - INTERVAL 2 DAY);

COMMIT;

-- Real-time chess persistence. Existing databases can create these tables with
-- `node backend/migrate_chess.js`; no existing rows are modified or removed.
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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;
