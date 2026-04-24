-- Migration: Auth prep — team_members table + created_by columns
-- Date: 2026-04-23
-- Purpose:
--   Lay the groundwork for Phase 4 (Supabase Auth + RLS) without touching any
--   app code or breaking anything that exists today.
--
--   1. team_members — junction table linking users to teams with a role.
--      Empty for now. When auth lands, populate it and tighten RLS policies
--      to replace the current wide-open `using (true)` with ownership checks
--      like `using (team_id in (select team_id from team_members where user_id = auth.uid()))`.
--
--   2. created_by — nullable uuid column on `games` and `players`. NULL for all
--      existing rows (that's fine — they predate auth). Once auth is wired up,
--      new rows get the creating user's ID automatically via the app or a
--      Supabase trigger.
--
-- Safe to re-run:
--   All statements use IF NOT EXISTS guards.

BEGIN;

-- ============================================================================
-- 1. team_members
-- ============================================================================
-- Roles today: 'coach' (full access), 'parent' (read-only), 'viewer' (read-only).
-- Using TEXT rather than an enum so roles can be extended without a schema change.
-- user_id is a uuid to match Supabase Auth's auth.users.id type.

CREATE TABLE IF NOT EXISTS team_members (
  id         SERIAL PRIMARY KEY,
  user_id    UUID        NOT NULL,           -- matches auth.users.id once auth lands
  team_id    INTEGER     NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'parent', -- 'coach' | 'parent' | 'viewer'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id)                 -- one membership record per user per team
);

CREATE INDEX IF NOT EXISTS team_members_user_id_idx  ON team_members(user_id);
CREATE INDEX IF NOT EXISTS team_members_team_id_idx  ON team_members(team_id);

-- ============================================================================
-- 2. created_by on games and players
-- ============================================================================
-- Nullable so existing rows are unaffected. The app doesn't need to write this
-- column yet — it stays NULL until auth is wired up in Phase 4.

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS created_by UUID;  -- will reference auth.users.id

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS created_by UUID;  -- will reference auth.users.id

COMMIT;

-- Verification — copy and run these after the migration:

-- 1. Confirm team_members table exists and is empty:
SELECT * FROM team_members;
-- Expected: 0 rows

-- 2. Confirm created_by columns exist on games and players:
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE column_name = 'created_by'
  AND table_name IN ('games', 'players')
ORDER BY table_name;
-- Expected: 2 rows, data_type = 'uuid', is_nullable = 'YES'
