-- Migration: Multi-Team Schema (Phase 0.5)
-- Date: 2026-04-13
-- Purpose:
--   Introduce a `teams` table and scope existing data by team_id so the app
--   can support multiple teams (Ninjas + Inter Milan today, anyone tomorrow).
--   This is the schema-level groundwork for Phase 4 multi-tenancy. Auth and
--   RLS come later; for now everything stays publicly readable.
--
-- Design decisions:
--   - `team_id` lives on `players` and `games`. It does NOT live on `game_stats`
--     because the team is reachable through both parents (game_id and player_id).
--     Keeping it normalized; application logic enforces that a player only
--     appears in stats for their own team's games.
--   - All existing data is backfilled as the Ninjas (team_id = 1).
--   - Inter Milan is inserted as team_id = 2.
--   - Slugs are URL-safe identifiers used for routing (e.g., /ninjas, /inter-milan).
--
-- Safe to re-run:
--   Uses IF NOT EXISTS / IF EXISTS guards and ON CONFLICT DO NOTHING for inserts.
--   Wrapped in a transaction; any failure rolls back cleanly.
--
-- Prerequisite:
--   Run 20260413_fk_hygiene.sql first (it sets the correct ON DELETE behavior
--   on the existing game_stats FKs).

BEGIN;

-- ============================================================================
-- 1. Create the `teams` table
-- ============================================================================
-- Each row represents one team in one season. A future migration will add
-- team_members (user_id, team_id, role) once auth lands.

CREATE TABLE IF NOT EXISTS teams (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,        -- URL-safe identifier, e.g. "ninjas"
  season      TEXT,                         -- e.g. "Spring 2026" (free-form for now)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on slug because the app will look teams up by slug constantly
-- (every page load on /:teamSlug/* will query WHERE slug = $1).
CREATE INDEX IF NOT EXISTS teams_slug_idx ON teams(slug);

-- ============================================================================
-- 2. Seed the two teams
-- ============================================================================
-- Explicit IDs so we can reference them in the backfill below. ON CONFLICT
-- DO NOTHING makes the insert safe to re-run.

INSERT INTO teams (id, name, slug, season)
VALUES
  (1, 'Ninjas', 'ninjas', 'Spring 2026'),
  (2, 'Inter Milan', 'inter-milan', 'Spring 2026')
ON CONFLICT (id) DO NOTHING;

-- Bump the SERIAL sequence past the manually inserted IDs so the next auto-
-- generated team starts at 3, not 1. (Without this, the sequence still thinks
-- it's at 1 and the next INSERT would collide.)
SELECT setval('teams_id_seq', GREATEST((SELECT MAX(id) FROM teams), 1));

-- ============================================================================
-- 3. Add team_id to `players`
-- ============================================================================
-- Step A: add the column as nullable so we can backfill existing rows.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS team_id INTEGER;

-- Step B: backfill all existing players as Ninjas (team_id = 1).
UPDATE players SET team_id = 1 WHERE team_id IS NULL;

-- Step C: enforce NOT NULL now that every row has a value.
ALTER TABLE players
  ALTER COLUMN team_id SET NOT NULL;

-- Step D: add the FK constraint. RESTRICT on delete so deleting a team
-- doesn't silently nuke its roster (forces a deliberate cleanup).
ALTER TABLE players
  DROP CONSTRAINT IF EXISTS players_team_id_fkey;

ALTER TABLE players
  ADD CONSTRAINT players_team_id_fkey
  FOREIGN KEY (team_id)
  REFERENCES teams(id)
  ON DELETE RESTRICT;

-- Step E: index for fast WHERE team_id = $1 queries.
CREATE INDEX IF NOT EXISTS players_team_id_idx ON players(team_id);

-- ============================================================================
-- 4. Add team_id to `games`
-- ============================================================================
-- Same pattern as players. Each game belongs to one team (the team you're
-- tracking). Opponent is still just text on the game row.

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS team_id INTEGER;

UPDATE games SET team_id = 1 WHERE team_id IS NULL;

ALTER TABLE games
  ALTER COLUMN team_id SET NOT NULL;

ALTER TABLE games
  DROP CONSTRAINT IF EXISTS games_team_id_fkey;

ALTER TABLE games
  ADD CONSTRAINT games_team_id_fkey
  FOREIGN KEY (team_id)
  REFERENCES teams(id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS games_team_id_idx ON games(team_id);

COMMIT;

-- ============================================================================
-- Verification queries (run manually after the migration)
-- ============================================================================
-- 1. Confirm the teams exist:
--    SELECT * FROM teams ORDER BY id;
--
--    Expected:
--      1 | Ninjas      | ninjas       | Spring 2026 | <timestamp>
--      2 | Inter Milan | inter-milan  | Spring 2026 | <timestamp>
--
-- 2. Confirm every player and game is scoped to the Ninjas:
--    SELECT team_id, COUNT(*) FROM players GROUP BY team_id;
--    SELECT team_id, COUNT(*) FROM games   GROUP BY team_id;
--
--    Expected: only team_id = 1, with the counts you already have today.
--
-- 3. Confirm the FK constraints are in place:
--    SELECT
--      tc.table_name,
--      tc.constraint_name,
--      kcu.column_name,
--      rc.delete_rule
--    FROM information_schema.table_constraints tc
--    JOIN information_schema.key_column_usage kcu
--      ON tc.constraint_name = kcu.constraint_name
--    JOIN information_schema.referential_constraints rc
--      ON tc.constraint_name = rc.constraint_name
--    WHERE tc.constraint_type = 'FOREIGN KEY'
--      AND kcu.column_name = 'team_id';
--
--    Expected:
--      games   | games_team_id_fkey   | team_id | RESTRICT
--      players | players_team_id_fkey | team_id | RESTRICT
