-- Phase 9: add Champion and Daily Player achievements
-- Run this once against your gamehub database

INSERT IGNORE INTO achievements
  (name, description, icon, requirement_type, requirement_value)
VALUES
  ('Champion',     'Reach the Top 3 on the global leaderboard.', 'trophy',   'global_rank_top3', 1),
  ('Daily Player', 'Play on 7 different days in the last 30 days.', 'calendar', 'daily_player',     7);
