-- 20260418_rename_blocks_to_tackles.sql
--
-- Purpose:
--   Rename the blocks column to tackles in game_stats to match
--   the updated event type name in the game logger.

ALTER TABLE game_stats
  RENAME COLUMN blocks TO tackles;
