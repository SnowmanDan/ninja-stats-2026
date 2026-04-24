-- Migration: Add created_at to games, players, and game_stats
-- Date: 2026-04-23
-- Purpose:
--   Add created_at timestamps to the three core tables that are missing it.
--   The `teams` table already has created_at (added in 20260413_multi_team_schema.sql).
--
-- Why now:
--   These timestamps are low-cost metadata that pay off when auth lands in Phase 4:
--   - You'll know which records predated auth (created_by uuid can be added alongside)
--   - Gives insertion order for debugging and future audit trails
--   - Consistent schema across all tables before any outside users exist
--
-- Backfill note:
--   Existing rows get NOW() at migration time — not the true creation date, but
--   accurate enough since all data is recent. Future rows get the real timestamp.
--
-- Safe to re-run:
--   All ALTER TABLE statements use IF NOT EXISTS guards.

BEGIN;

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE game_stats
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMIT;

-- Verification — copy and run this after the migration:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('games', 'players', 'game_stats')
  AND column_name = 'created_at'
ORDER BY table_name;
-- Expected: 3 rows, one per table, data_type = 'timestamp with time zone'
