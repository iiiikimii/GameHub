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
  total_score BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_total_score (total_score, id),
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
  score INT UNSIGNED NOT NULL,
  duration DECIMAL(8,3) UNSIGNED NOT NULL COMMENT 'Duration in seconds',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
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