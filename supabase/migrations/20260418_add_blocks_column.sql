-- 20260418_add_blocks_column.sql
--
-- Purpose:
--   Add a blocks column to game_stats to support the new Block event
--   type in the game logger.

ALTER TABLE game_stats
  ADD COLUMN IF NOT EXISTS blocks INTEGER NOT NULL DEFAULT 0;
