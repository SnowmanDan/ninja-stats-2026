-- Migration: FK Hygiene Pass
-- Date: 2026-04-13
-- Purpose:
--   Make foreign key delete behavior explicit and correct on game_stats.
--   - game_id: ON DELETE CASCADE  (a stat row is meaningless without its game)
--   - player_id: ON DELETE RESTRICT  (player deletes are a big deal; protect history)
--
-- Why this matters:
--   Postgres defaults to NO ACTION (effectively RESTRICT) when ON DELETE isn't
--   specified, which is safe but surprising. Being explicit makes the intent
--   obvious in the schema and prevents accidental data loss later.
--
-- Safe to re-run:
--   This script drops the constraints if they exist, then re-adds them with
--   the desired behavior. Running it multiple times is a no-op.

BEGIN;

-- ============================================================================
-- game_stats.game_id  ->  CASCADE
-- ============================================================================
-- When a game is deleted, all of its stat rows should be deleted with it.
-- Without this, you have to manually clean up child rows first (the exact
-- error you just hit).

ALTER TABLE game_stats
  DROP CONSTRAINT IF EXISTS game_stats_game_id_fkey;

ALTER TABLE game_stats
  ADD CONSTRAINT game_stats_game_id_fkey
  FOREIGN KEY (game_id)
  REFERENCES games(id)
  ON DELETE CASCADE;

-- ============================================================================
-- game_stats.player_id  ->  RESTRICT
-- ============================================================================
-- Deleting a player should NOT silently wipe their historical stats.
-- If you ever try to delete a player who has stats, Postgres will refuse
-- and force you to think about it (which is the right behavior).

ALTER TABLE game_stats
  DROP CONSTRAINT IF EXISTS game_stats_player_id_fkey;

ALTER TABLE game_stats
  ADD CONSTRAINT game_stats_player_id_fkey
  FOREIGN KEY (player_id)
  REFERENCES players(id)
  ON DELETE RESTRICT;

COMMIT;

-- ============================================================================
-- Verification queries (run these manually after the migration to confirm)
-- ============================================================================
-- SELECT
--   tc.constraint_name,
--   kcu.column_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.referential_constraints rc
--   ON tc.constraint_name = rc.constraint_name
-- WHERE tc.table_name = 'game_stats'
--   AND tc.constraint_type = 'FOREIGN KEY';
--
-- Expected result:
--   game_stats_game_id_fkey   | game_id   | CASCADE
--   game_stats_player_id_fkey | player_id | RESTRICT
